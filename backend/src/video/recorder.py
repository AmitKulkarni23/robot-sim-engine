"""Encode buffered RGB frames into an MP4 and upload the result to S3."""
from __future__ import annotations

import os

import boto3
import imageio.v2 as imageio
import numpy as np

from .models import EmptyRecordingError, FrameShapeError

VIDEO_BUCKET_NAME_ENV = "VIDEO_BUCKET_NAME_ENV"


class VideoRecorder:
    def __init__(self, fps: int = 30) -> None:
        self._fps = fps
        self._frames: list[np.ndarray] = []
        self._frame_shape: tuple[int, ...] | None = None

    def add_frame(self, frame: np.ndarray) -> None:
        """Buffer an RGB frame; all frames in a recording must share a shape."""
        if self._frame_shape is None:
            self._frame_shape = frame.shape
        elif frame.shape != self._frame_shape:
            raise FrameShapeError(
                f"Frame shape {frame.shape} does not match expected "
                f"{self._frame_shape}"
            )
        self._frames.append(frame)

    def encode(self, output_path: str) -> None:
        """Write all buffered frames to an MP4 file at `output_path`."""
        if not self._frames:
            raise EmptyRecordingError("Cannot encode a recording with zero frames")

        with imageio.get_writer(output_path, fps=self._fps) as writer:
            for frame in self._frames:
                writer.append_data(frame)


def upload_replay(local_path: str, scenario_id: str, run_id: str) -> str:
    """Upload `local_path` to `{scenario_id}/{run_id}/replay.mp4`, return its URI."""
    bucket_name = os.environ[VIDEO_BUCKET_NAME_ENV]
    key = f"{scenario_id}/{run_id}/replay.mp4"
    client = boto3.client("s3")
    client.upload_file(local_path, bucket_name, key)
    return f"s3://{bucket_name}/{key}"
