import json
from dataclasses import asdict
from unittest.mock import MagicMock, patch

import boto3
import pytest
from moto import mock_aws

import handler as handler_module
from harness.models import RunResult, ScenarioRunError, StructuredViolation, MetricValue

SCENARIOS_TABLE = "Scenarios"
RESULTS_TABLE = "SimulationResults"
SECRET = "test-secret"


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("WEBHOOK_SECRET_PARAM_NAME_ENV", "/robot-sim/webhook-secret")
    monkeypatch.setenv("SCENARIOS_TABLE_NAME_ENV", SCENARIOS_TABLE)
    monkeypatch.setenv("RESULTS_TABLE_NAME_ENV", RESULTS_TABLE)
    monkeypatch.setenv("VIDEO_BUCKET_NAME_ENV", "video-bucket")
    monkeypatch.setenv("MODELS_BUCKET_NAME_ENV", "models-bucket")
    handler_module._cached_webhook_secret = SECRET
    yield
    handler_module._cached_webhook_secret = None


def _post_event(body=None, secret=SECRET):
    headers = {}
    if secret is not None:
        headers["x-webhook-secret"] = secret
    return {
        "headers": headers,
        "body": json.dumps(body) if body is not None else None,
        "requestContext": {"http": {"method": "POST", "path": "/"}},
    }


def _get_event(path="/runs", secret=SECRET):
    headers = {}
    if secret is not None:
        headers["x-webhook-secret"] = secret
    return {
        "headers": headers,
        "requestContext": {"http": {"method": "GET", "path": path}},
    }


def _create_tables(client):
    client.create_table(
        TableName=SCENARIOS_TABLE,
        KeySchema=[
            {"AttributeName": "scenarioId", "KeyType": "HASH"},
            {"AttributeName": "version", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "scenarioId", "AttributeType": "S"},
            {"AttributeName": "version", "AttributeType": "N"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    client.create_table(
        TableName=RESULTS_TABLE,
        KeySchema=[{"AttributeName": "runId", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "runId", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )


def test_handler_given_missing_webhook_secret_should_return_401():
    response = handler_module.handler(
        _post_event({"scenario_id": "s1", "version": 1}, secret=None), None
    )

    assert response["statusCode"] == 401


def test_handler_given_wrong_webhook_secret_should_return_401():
    response = handler_module.handler(
        _post_event({"scenario_id": "s1", "version": 1}, secret="wrong"), None
    )

    assert response["statusCode"] == 401


def test_handler_get_without_secret_should_return_401():
    response = handler_module.handler(_get_event("/runs", secret=None), None)
    assert response["statusCode"] == 401


def test_handler_post_scenario_without_secret_should_return_401():
    response = handler_module.handler(
        _post_scenario_event({"yaml_content": "x"}, secret=None), None
    )
    assert response["statusCode"] == 401


def test_handler_given_missing_scenario_id_should_return_400():
    response = handler_module.handler(_post_event({"version": 1}), None)

    assert response["statusCode"] == 400


@mock_aws
def test_handler_given_unknown_scenario_should_return_404():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)

    response = handler_module.handler(
        _post_event({"scenario_id": "missing", "version": 1}), None
    )

    assert response["statusCode"] == 404


@mock_aws
def test_handler_given_valid_request_should_run_scenario_and_write_result_record():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)
    client.put_item(
        TableName=SCENARIOS_TABLE,
        Item={
            "scenarioId": {"S": "s1"},
            "version": {"N": "1"},
            "yaml_content": {"S": "yaml-stub"},
            "name": {"S": "Test Scenario"},
            "robotModel": {"S": "unitree-g1"},
        },
    )

    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="video-bucket")

    fake_scenario = MagicMock(robot_model="unitree_g1")
    fake_result = RunResult(
        success=True, duration_s=1.0, steps_simulated=500,
        failures=[], violations=[], metrics=[], video_frames=[],
    )

    with patch("scenario.loader.load_scenario", return_value=fake_scenario) as mock_load_scenario, \
         patch("robot_model.loader.get_robot_model", return_value="/tmp/model.mjcf") as mock_get_model, \
         patch("control.factory.load_controller", return_value=MagicMock()), \
         patch("harness.runner.run_scenario", return_value=fake_result) as mock_run_scenario, \
         patch("video.recorder.VideoRecorder") as mock_video_recorder_cls, \
         patch("video.recorder.upload_replay", return_value="s3://video-bucket/s1/run/replay.mp4") as mock_upload:
        mock_video_recorder_cls.return_value = MagicMock()

        response = handler_module.handler(
            _post_event({"scenario_id": "s1", "version": 1}), None
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
        TableName=RESULTS_TABLE, Key={"runId": {"S": body["run_id"]}}
    )
    assert result_item["Item"]["success"]["BOOL"] is True
    assert result_item["Item"]["scenarioName"]["S"] == "Test Scenario"
    assert result_item["Item"]["stepsSimulated"]["N"] == "500"


@mock_aws
def test_handler_given_scenario_run_error_should_write_failed_result_and_return_200():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)
    client.put_item(
        TableName=SCENARIOS_TABLE,
        Item={
            "scenarioId": {"S": "s1"},
            "version": {"N": "1"},
            "yaml_content": {"S": "yaml-stub"},
        },
    )

    fake_scenario = MagicMock(robot_model="unitree_g1")

    with patch("scenario.loader.load_scenario", return_value=fake_scenario), \
         patch("robot_model.loader.get_robot_model", return_value="/tmp/model.mjcf"), \
         patch("control.factory.load_controller", return_value=MagicMock()), \
         patch("harness.runner.run_scenario", side_effect=ScenarioRunError("boom")):
        response = handler_module.handler(
            _post_event({"scenario_id": "s1", "version": 1}), None
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
            _post_event({"scenario_id": "s1", "version": 1}), None
        )

    assert response["statusCode"] == 500
    assert "dynamo down" in response["body"]
    assert "Unhandled error" in caplog.text


@mock_aws
def test_handler_get_runs_should_return_results_from_dynamodb():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)
    client.put_item(
        TableName=RESULTS_TABLE,
        Item={
            "runId": {"S": "run-1"},
            "scenarioId": {"S": "s1"},
            "scenarioName": {"S": "Test Scenario"},
            "robotModel": {"S": "unitree-g1"},
            "startedAt": {"S": "2026-08-16T12:00:00Z"},
            "success": {"BOOL": True},
            "durationS": {"N": "9.1"},
            "stepsSimulated": {"N": "4550"},
            "buildNumber": {"N": "184"},
            "failures": {"S": "[]"},
            "violations": {"S": "[]"},
            "metrics": {"S": "[]"},
            "videoUri": {"S": "s3://bucket/replay.mp4"},
        },
    )

    response = handler_module.handler(_get_event("/runs"), None)

    assert response["statusCode"] == 200
    runs = json.loads(response["body"])
    assert len(runs) == 1
    assert runs[0]["id"] == "run-1"
    assert runs[0]["scenarioName"] == "Test Scenario"
    assert runs[0]["verdict"] == "pass"
    assert runs[0]["durationSeconds"] == 9.1


@mock_aws
def test_handler_get_run_by_id_should_return_single_result():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)
    client.put_item(
        TableName=RESULTS_TABLE,
        Item={
            "runId": {"S": "run-42"},
            "scenarioId": {"S": "s1"},
            "scenarioName": {"S": "Walk"},
            "robotModel": {"S": "unitree-g1"},
            "startedAt": {"S": "2026-08-16T12:00:00Z"},
            "success": {"BOOL": False},
            "durationS": {"N": "5.0"},
            "stepsSimulated": {"N": "2500"},
            "buildNumber": {"N": "100"},
            "failures": {"S": json.dumps(["timed out after 30s"])},
            "violations": {"S": "[]"},
            "metrics": {"S": "[]"},
            "videoUri": {"S": ""},
        },
    )

    response = handler_module.handler(_get_event("/runs/run-42"), None)

    assert response["statusCode"] == 200
    run = json.loads(response["body"])
    assert run["id"] == "run-42"
    assert run["verdict"] == "fail"
    assert "timed out" in run["verdictReason"]


@mock_aws
def test_handler_get_run_by_id_given_missing_should_return_404():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)

    response = handler_module.handler(_get_event("/runs/nonexistent"), None)

    assert response["statusCode"] == 404


@mock_aws
def test_handler_get_scenarios_should_return_scenarios_from_dynamodb():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)
    client.put_item(
        TableName=SCENARIOS_TABLE,
        Item={
            "scenarioId": {"S": "box-pickup"},
            "version": {"N": "1"},
            "name": {"S": "Box pickup"},
            "status": {"S": "published"},
            "description": {"S": "Pick up a box"},
            "robotModel": {"S": "unitree-g1"},
            "updatedAt": {"S": "2026-08-16T12:00:00Z"},
            "runCount": {"N": "10"},
            "passRate": {"N": "0.9"},
            "yaml_content": {"S": "yaml-stub"},
        },
    )

    response = handler_module.handler(_get_event("/scenarios"), None)

    assert response["statusCode"] == 200
    scenarios = json.loads(response["body"])
    assert len(scenarios) == 1
    assert scenarios[0]["id"] == "box-pickup"
    assert scenarios[0]["name"] == "Box pickup"
    assert scenarios[0]["passRate"] == 0.9


VALID_SCENARIO_YAML = """\
scenario_id: test-new-scenario
version: 1
robot_model: unitree_g1
task:
  task_type: navigation
  description: "Walk forward 3 metres."
object_placements: []
randomization:
  seed: null
  position_noise_std: 0.0
"""


def _post_scenario_event(body=None, secret=SECRET):
    headers = {}
    if secret is not None:
        headers["x-webhook-secret"] = secret
    return {
        "headers": headers,
        "body": json.dumps(body) if body is not None else None,
        "requestContext": {"http": {"method": "POST", "path": "/scenarios"}},
    }


@mock_aws
def test_create_scenario_given_valid_yaml_should_return_201_and_write_to_dynamodb():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)

    response = handler_module.handler(
        _post_scenario_event({"yaml_content": VALID_SCENARIO_YAML}), None
    )

    assert response["statusCode"] == 201
    body = json.loads(response["body"])
    assert body["id"] == "test-new-scenario"
    assert body["version"] == 1
    assert body["status"] == "draft"

    item = client.get_item(
        TableName=SCENARIOS_TABLE,
        Key={"scenarioId": {"S": "test-new-scenario"}, "version": {"N": "1"}},
    )["Item"]
    assert item["yaml_content"]["S"] == VALID_SCENARIO_YAML.strip()
    assert item["robotModel"]["S"] == "unitree_g1"
    assert item["description"]["S"] == "Walk forward 3 metres."


def test_create_scenario_given_empty_yaml_should_return_400():
    response = handler_module.handler(
        _post_scenario_event({"yaml_content": ""}), None
    )
    assert response["statusCode"] == 400


def test_create_scenario_given_invalid_yaml_should_return_422():
    response = handler_module.handler(
        _post_scenario_event({"yaml_content": "not: valid: yaml: ["}), None
    )
    assert response["statusCode"] == 422


def test_create_scenario_given_yaml_missing_required_fields_should_return_422():
    response = handler_module.handler(
        _post_scenario_event({"yaml_content": "scenario_id: x\nversion: 1\n"}), None
    )
    assert response["statusCode"] == 422
    body = json.loads(response["body"])
    assert "Validation failed" in body["error"]


@mock_aws
def test_get_scenario_by_id_should_return_scenario_with_yaml_content():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)
    client.put_item(
        TableName=SCENARIOS_TABLE,
        Item={
            "scenarioId": {"S": "walk-test"},
            "version": {"N": "1"},
            "name": {"S": "Walk Test"},
            "status": {"S": "published"},
            "description": {"S": "Walk forward"},
            "robotModel": {"S": "unitree-g1"},
            "updatedAt": {"S": "2026-08-17T00:00:00Z"},
            "yaml_content": {"S": VALID_SCENARIO_YAML},
            "runCount": {"N": "5"},
            "passRate": {"N": "0.8"},
        },
    )

    response = handler_module.handler(_get_event("/scenarios/walk-test"), None)

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["id"] == "walk-test"
    assert body["yamlContent"] == VALID_SCENARIO_YAML
    assert body["version"] == 1


@mock_aws
def test_get_scenario_by_id_given_missing_should_return_404():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)

    response = handler_module.handler(_get_event("/scenarios/nonexistent"), None)

    assert response["statusCode"] == 404


def test_handler_options_should_return_204():
    event = {
        "headers": {},
        "requestContext": {"http": {"method": "OPTIONS", "path": "/runs"}},
    }
    response = handler_module.handler(event, None)

    assert response["statusCode"] == 204


def _post_run_event(scenario_id, secret=SECRET):
    headers = {}
    if secret is not None:
        headers["x-webhook-secret"] = secret
    return {
        "headers": headers,
        "body": None,
        "requestContext": {"http": {"method": "POST", "path": f"/scenarios/{scenario_id}/run"}},
    }


@mock_aws
def test_post_scenario_run_should_set_status_to_queued():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)
    client.put_item(
        TableName=SCENARIOS_TABLE,
        Item={
            "scenarioId": {"S": "box-pickup"},
            "version": {"N": "1"},
            "name": {"S": "Box Pickup"},
            "status": {"S": "draft"},
            "description": {"S": "Pick up a box"},
            "robotModel": {"S": "unitree-g1"},
            "updatedAt": {"S": "2026-08-16T12:00:00Z"},
            "yaml_content": {"S": VALID_SCENARIO_YAML},
            "runCount": {"N": "0"},
            "passRate": {"N": "0"},
        },
    )

    response = handler_module.handler(_post_run_event("box-pickup"), None)

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["status"] == "queued"
    assert body["id"] == "box-pickup"

    item = client.get_item(
        TableName=SCENARIOS_TABLE,
        Key={"scenarioId": {"S": "box-pickup"}, "version": {"N": "1"}},
    )["Item"]
    assert item["status"]["S"] == "queued"


@mock_aws
def test_post_scenario_run_given_missing_scenario_should_return_404():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)

    response = handler_module.handler(_post_run_event("nonexistent"), None)

    assert response["statusCode"] == 404


def _stream_event(scenario_id, version, new_status="queued", old_status="draft"):
    return {
        "Records": [
            {
                "eventSource": "aws:dynamodb",
                "eventName": "MODIFY",
                "dynamodb": {
                    "NewImage": {
                        "scenarioId": {"S": scenario_id},
                        "version": {"N": str(version)},
                        "status": {"S": new_status},
                        "yaml_content": {"S": "yaml-stub"},
                        "name": {"S": "Test"},
                    },
                    "OldImage": {
                        "scenarioId": {"S": scenario_id},
                        "version": {"N": str(version)},
                        "status": {"S": old_status},
                    },
                },
            }
        ]
    }


@mock_aws
def test_handler_given_stream_event_should_run_simulation_and_set_status_completed():
    client = boto3.client("dynamodb", region_name="us-east-1")
    _create_tables(client)
    client.put_item(
        TableName=SCENARIOS_TABLE,
        Item={
            "scenarioId": {"S": "s1"},
            "version": {"N": "1"},
            "yaml_content": {"S": "yaml-stub"},
            "name": {"S": "Test"},
            "status": {"S": "queued"},
            "robotModel": {"S": "unitree-g1"},
        },
    )

    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="video-bucket")

    fake_scenario = MagicMock(robot_model="unitree_g1")
    fake_result = RunResult(
        success=True, duration_s=1.0, steps_simulated=500,
        failures=[], violations=[], metrics=[], video_frames=[],
    )

    with patch("scenario.loader.load_scenario", return_value=fake_scenario), \
         patch("robot_model.loader.get_robot_model", return_value="/tmp/model.mjcf"), \
         patch("control.factory.load_controller", return_value=MagicMock()), \
         patch("harness.runner.run_scenario", return_value=fake_result), \
         patch("video.recorder.VideoRecorder") as mock_recorder, \
         patch("video.recorder.upload_replay", return_value="s3://bucket/replay.mp4"):
        mock_recorder.return_value = MagicMock()

        response = handler_module.handler(_stream_event("s1", 1), None)

    assert response["statusCode"] == 200

    item = client.get_item(
        TableName=SCENARIOS_TABLE,
        Key={"scenarioId": {"S": "s1"}, "version": {"N": "1"}},
    )["Item"]
    assert item["status"]["S"] == "completed"

    results = client.scan(TableName=RESULTS_TABLE)["Items"]
    assert len(results) == 1
    assert results[0]["success"]["BOOL"] is True
