import json
from unittest.mock import patch, MagicMock

import pytest

from telemetry.models import ContactEvent, TelemetryBundle, TelemetryFrame
from telemetry.recorder import upload_telemetry


def _make_frame(time: float = 0.0) -> TelemetryFrame:
    return TelemetryFrame(
        time=time,
        joint_angles={"arm_joint": 0.5},
        joint_velocities={"arm_joint": 0.01},
        body_positions={"torso": (0.0, 0.0, 1.0)},
        center_of_mass=(0.0, 0.0, 0.9),
        contacts=[ContactEvent(body_a="foot", body_b="floor", position=(0.0, 0.0, 0.0))],
    )


def test_telemetry_bundle_to_dict_should_include_all_fields():
    bundle = TelemetryBundle(
        frames=[_make_frame(0.0), _make_frame(0.1)],
        sample_rate_hz=30,
        total_duration_s=0.1,
    )

    result = bundle.to_dict()

    assert result["sample_rate_hz"] == 30
    assert result["total_duration_s"] == 0.1
    assert result["frame_count"] == 2
    assert len(result["frames"]) == 2
    assert result["frames"][0]["t"] == 0.0
    assert result["frames"][0]["joint_angles"] == {"arm_joint": 0.5}
    assert result["frames"][0]["com"] == [0.0, 0.0, 0.9]
    assert result["frames"][0]["contacts"][0]["body_a"] == "foot"


def test_telemetry_bundle_to_dict_given_empty_frames_should_return_zero_count():
    bundle = TelemetryBundle()

    result = bundle.to_dict()

    assert result["frame_count"] == 0
    assert result["frames"] == []


def test_upload_telemetry_should_put_json_to_s3(monkeypatch):
    monkeypatch.setenv("TELEMETRY_BUCKET_NAME_ENV", "test-bucket")
    mock_client = MagicMock()

    with patch("telemetry.recorder.boto3") as mock_boto3:
        mock_boto3.client.return_value = mock_client
        bundle = TelemetryBundle(frames=[_make_frame()], total_duration_s=1.0)

        uri = upload_telemetry(bundle, "scenario-1", "run-abc")

    assert uri == "s3://test-bucket/scenario-1/run-abc/telemetry.json"
    mock_client.put_object.assert_called_once()
    call_kwargs = mock_client.put_object.call_args[1]
    assert call_kwargs["Bucket"] == "test-bucket"
    assert call_kwargs["Key"] == "scenario-1/run-abc/telemetry.json"
    assert call_kwargs["ContentType"] == "application/json"
    body = json.loads(call_kwargs["Body"])
    assert body["frame_count"] == 1
