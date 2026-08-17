from pathlib import Path

import boto3
import pytest
import responses
from moto import mock_aws

from robot_model.loader import get_robot_model
from robot_model.registry import RobotModelNotFoundError

BUCKET = "robot-models-test"
MJCF_URL = (
    "https://raw.githubusercontent.com/google-deepmind/mujoco_menagerie/main"
    "/unitree_g1/g1.xml"
)


@pytest.fixture(autouse=True)
def _set_env(monkeypatch):
    monkeypatch.setenv("MODELS_BUCKET_NAME_ENV", BUCKET)


@pytest.fixture
def s3_bucket():
    with mock_aws():
        client = boto3.client("s3", region_name="us-east-1")
        client.create_bucket(Bucket=BUCKET)
        yield client


def test_get_robot_model_given_local_cache_hit_should_return_path_without_network_call(
    tmp_path,
):
    cache_dir = tmp_path / "cache"
    local_path = cache_dir / "unitree_g1" / "1" / "model.mjcf"
    local_path.parent.mkdir(parents=True)
    local_path.write_text("<mujoco/>")

    result = get_robot_model("unitree_g1", "1", cache_dir=str(cache_dir))

    assert result == str(local_path)


def test_get_robot_model_given_s3_cache_hit_should_download_and_return_local_path(
    tmp_path, s3_bucket
):
    s3_bucket.put_object(
        Bucket=BUCKET, Key="unitree_g1/1/model.mjcf", Body=b"<mujoco/>"
    )
    cache_dir = tmp_path / "cache"

    result = get_robot_model("unitree_g1", "1", cache_dir=str(cache_dir))

    assert Path(result).exists()
    assert Path(result).read_bytes() == b"<mujoco/>"


@responses.activate
def test_get_robot_model_given_s3_and_local_cache_miss_should_fetch_from_menagerie(
    tmp_path, s3_bucket
):
    mjcf_content = "<mujoco><asset></asset></mujoco>"
    responses.add(responses.GET, MJCF_URL, body=mjcf_content, status=200)
    cache_dir = tmp_path / "cache"

    result = get_robot_model("unitree_g1", "1", cache_dir=str(cache_dir))

    assert Path(result).read_text() == mjcf_content
    s3_object = s3_bucket.get_object(Bucket=BUCKET, Key="unitree_g1/1/model.mjcf")
    assert s3_object["Body"].read() == mjcf_content.encode()


def test_get_robot_model_given_unknown_model_name_should_raise_not_found_error(
    tmp_path,
):
    cache_dir = tmp_path / "cache"

    with pytest.raises(RobotModelNotFoundError):
        get_robot_model("unknown_robot", "1", cache_dir=str(cache_dir))


@responses.activate
def test_get_robot_model_given_menagerie_fetch_should_also_download_referenced_mesh_assets(
    tmp_path, s3_bucket
):
    mjcf_content = (
        '<mujoco><asset><mesh name="torso" file="torso.stl"/></asset></mujoco>'
    )
    responses.add(responses.GET, MJCF_URL, body=mjcf_content, status=200)
    responses.add(
        responses.GET,
        "https://raw.githubusercontent.com/google-deepmind/mujoco_menagerie/main"
        "/unitree_g1/torso.stl",
        body=b"stl-bytes",
        status=200,
    )
    cache_dir = tmp_path / "cache"

    result = get_robot_model("unitree_g1", "1", cache_dir=str(cache_dir))

    mesh_path = Path(result).parent / "torso.stl"
    assert mesh_path.exists()
    assert mesh_path.read_bytes() == b"stl-bytes"
