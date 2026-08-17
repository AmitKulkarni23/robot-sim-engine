import os

import boto3
import numpy as np
import pytest
from moto import mock_aws

from video.models import EmptyRecordingError, FrameShapeError
from video.recorder import VideoRecorder, upload_replay

BUCKET = "video-replays-test"


def _frame(width: int = 16, height: int = 12) -> np.ndarray:
    return np.zeros((height, width, 3), dtype=np.uint8)


def test_add_frame_given_consistent_shapes_should_buffer_frames():
    recorder = VideoRecorder()

    recorder.add_frame(_frame())
    recorder.add_frame(_frame())

    assert len(recorder._frames) == 2


def test_add_frame_given_mismatched_shape_should_raise_frame_shape_error():
    recorder = VideoRecorder()
    recorder.add_frame(_frame(16, 12))

    with pytest.raises(FrameShapeError):
        recorder.add_frame(_frame(32, 24))


def test_encode_given_buffered_frames_should_write_playable_mp4_file(tmp_path):
    recorder = VideoRecorder(fps=10)
    for _ in range(5):
        recorder.add_frame(_frame(width=32, height=24))
    output_path = str(tmp_path / "replay.mp4")

    recorder.encode(output_path)

    assert os.path.exists(output_path)
    assert os.path.getsize(output_path) > 0


def test_encode_given_no_frames_should_raise_empty_recording_error(tmp_path):
    recorder = VideoRecorder()

    with pytest.raises(EmptyRecordingError):
        recorder.encode(str(tmp_path / "empty.mp4"))


def test_upload_replay_should_put_object_at_expected_key_and_return_s3_uri(
    tmp_path, monkeypatch
):
    monkeypatch.setenv("VIDEO_BUCKET_NAME_ENV", BUCKET)
    local_file = tmp_path / "replay.mp4"
    local_file.write_bytes(b"fake mp4 bytes")

    with mock_aws():
        client = boto3.client("s3", region_name="us-east-1")
        client.create_bucket(Bucket=BUCKET)

        uri = upload_replay(str(local_file), "scenario-1", "run-1")

        assert uri == f"s3://{BUCKET}/scenario-1/run-1/replay.mp4"
        obj = client.get_object(Bucket=BUCKET, Key="scenario-1/run-1/replay.mp4")
        assert obj["Body"].read() == b"fake mp4 bytes"
