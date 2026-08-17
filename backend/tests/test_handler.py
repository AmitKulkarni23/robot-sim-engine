import json
from unittest.mock import MagicMock, patch

import boto3
import pytest
from moto import mock_aws

import handler as handler_module
from harness.models import RunResult, ScenarioRunError

SCENARIOS_TABLE = "Scenarios"
RESULTS_TABLE = "SimulationResults"
SECRET = "test-secret"


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("WEBHOOK_SECRET_ENV", SECRET)
    monkeypatch.setenv("SCENARIOS_TABLE_NAME_ENV", SCENARIOS_TABLE)
    monkeypatch.setenv("RESULTS_TABLE_NAME_ENV", RESULTS_TABLE)
    monkeypatch.setenv("VIDEO_BUCKET_NAME_ENV", "video-bucket")
    monkeypatch.setenv("MODELS_BUCKET_NAME_ENV", "models-bucket")


def _event(body=None, secret=SECRET):
    headers = {}
    if secret is not None:
        headers["x-webhook-secret"] = secret
    return {"headers": headers, "body": json.dumps(body) if body is not None else None}


def _create_tables(client):
    client.create_table(
        TableName=SCENARIOS_TABLE,
        KeySchema=[
            {"AttributeName": "scenario_id", "KeyType": "HASH"},
            {"AttributeName": "version", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "scenario_id", "AttributeType": "S"},
            {"AttributeName": "version", "AttributeType": "N"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    client.create_table(
        TableName=RESULTS_TABLE,
        KeySchema=[{"AttributeName": "run_id", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "run_id", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )


def test_handler_given_missing_webhook_secret_should_return_401():
    with patch("handler.boto3") as mock_boto3:
        response = handler_module.handler(
            _event({"scenario_id": "s1", "version": 1}, secret=None), None
        )

    assert response["statusCode"] == 401
    mock_boto3.client.assert_not_called()


def test_handler_given_wrong_webhook_secret_should_return_401():
    with patch("handler.boto3") as mock_boto3:
        response = handler_module.handler(
            _event({"scenario_id": "s1", "version": 1}, secret="wrong"), None
        )

    assert response["statusCode"] == 401
    mock_boto3.client.assert_not_called()


def test_handler_given_missing_scenario_id_should_return_400():
    response = handler_module.handler(_event({"version": 1}), None)

    assert response["statusCode"] == 400


@mock_aws
def test_handler_given_unknown_scenario_should_return_404():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)

    response = handler_module.handler(
        _event({"scenario_id": "missing", "version": 1}), None
    )

    assert response["statusCode"] == 404


@mock_aws
def test_handler_given_valid_request_should_run_scenario_and_write_result_record():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)
    client.put_item(
        TableName=SCENARIOS_TABLE,
        Item={
            "scenario_id": {"S": "s1"},
            "version": {"N": "1"},
            "yaml_content": {"S": "yaml-stub"},
        },
    )

    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="video-bucket")

    fake_scenario = MagicMock(robot_model="unitree_g1")
    fake_result = RunResult(
        success=True, duration_s=1.0, failures=[], violations=[], video_frames=[]
    )

    with patch("handler.load_scenario", return_value=fake_scenario) as mock_load_scenario, \
         patch("handler.get_robot_model", return_value="/tmp/model.mjcf") as mock_get_model, \
         patch("handler.load_controller", return_value=MagicMock()), \
         patch("handler.run_scenario", return_value=fake_result) as mock_run_scenario, \
         patch("handler.VideoRecorder") as mock_video_recorder_cls, \
         patch("handler.upload_replay", return_value="s3://video-bucket/s1/run/replay.mp4") as mock_upload:
        mock_video_recorder_cls.return_value = MagicMock()

        response = handler_module.handler(
            _event({"scenario_id": "s1", "version": 1}), None
        )

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert "run_id" in body
    assert body["success"] is True
    mock_load_scenario.assert_called_once_with("yaml-stub")
    mock_get_model.assert_called_once()
    mock_run_scenario.assert_called_once()
    mock_upload.assert_called_once()

    result_item = client.get_item(
        TableName=RESULTS_TABLE, Key={"run_id": {"S": body["run_id"]}}
    )
    assert result_item["Item"]["success"]["BOOL"] is True


@mock_aws
def test_handler_given_scenario_run_error_should_write_failed_result_and_return_200():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)
    client.put_item(
        TableName=SCENARIOS_TABLE,
        Item={
            "scenario_id": {"S": "s1"},
            "version": {"N": "1"},
            "yaml_content": {"S": "yaml-stub"},
        },
    )

    fake_scenario = MagicMock(robot_model="unitree_g1")

    with patch("handler.load_scenario", return_value=fake_scenario), \
         patch("handler.get_robot_model", return_value="/tmp/model.mjcf"), \
         patch("handler.load_controller", return_value=MagicMock()), \
         patch("handler.run_scenario", side_effect=ScenarioRunError("boom")):
        response = handler_module.handler(
            _event({"scenario_id": "s1", "version": 1}), None
        )

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["success"] is False

    items = client.scan(TableName=RESULTS_TABLE)["Items"]
    assert len(items) == 1
    assert items[0]["success"]["BOOL"] is False
    assert "boom" in items[0]["failures"]["S"]


def test_handler_given_unexpected_exception_should_return_500_and_log_error(caplog):
    with patch("handler.boto3") as mock_boto3:
        mock_boto3.client.side_effect = RuntimeError("dynamo down")

        response = handler_module.handler(
            _event({"scenario_id": "s1", "version": 1}), None
        )

    assert response["statusCode"] == 500
    assert "dynamo down" in response["body"]
    assert "Unhandled error" in caplog.text
