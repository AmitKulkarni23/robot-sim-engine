# Task: 008 — Video Recorder

## Summary

Build the Python module that accepts a sequence of RGB frames (produced by `PhysicsSimulation.render_frame`, task 006) and encodes them into an MP4 file via `imageio-ffmpeg`, then uploads the result to the `video-replays` S3 bucket (task 002). This is the "video replay" deliverable promised in README.md's "What This Does" section.

## Read First

- `docs/specs/data-models.md` — "S3 Buckets / Object Layout" section for the `video-replays` bucket key convention (`{scenarioId}/{runId}/replay.mp4`), populated by task 002
- `README.md` — Hard Constraints, item (c): frames encoded to MP4 via ffmpeg through imageio (imageio-ffmpeg)

## Conventions

No `.claude/rules/` convention applies to `backend/` Python code. Follow PEP 8 and type hints. Use `boto3` for S3 access.

## Requirements

1. The module MUST expose a `VideoRecorder` class constructed as `VideoRecorder(fps: int = 30)`.
2. `VideoRecorder` MUST expose `add_frame(frame: numpy.ndarray) -> None` appending an RGB frame (shape `(height, width, 3)`, dtype `uint8`) to an internal buffer.
3. `add_frame` MUST raise `FrameShapeError` (custom exception) if a frame's shape doesn't match the shape of the first frame added — all frames in one recording MUST be the same size.
4. `VideoRecorder` MUST expose `encode(output_path: str) -> None` writing all buffered frames to an MP4 file at `output_path` using `imageio.get_writer` with the `ffmpeg` plugin (via `imageio-ffmpeg`) at the configured `fps`.
5. `encode` MUST raise `EmptyRecordingError` if called with zero frames buffered.
6. The module MUST expose a module-level function `upload_replay(local_path: str, scenario_id: str, run_id: str) -> str` that uploads `local_path` to the `video-replays` S3 bucket (bucket name from `VIDEO_BUCKET_NAME_ENV` environment variable) at key `{scenario_id}/{run_id}/replay.mp4`, returning the resulting S3 URI (`s3://bucket/key`).

## Technical Notes

- `imageio-ffmpeg` bundles a static ffmpeg binary — no separate system-level ffmpeg install is required in the Lambda container, but the Dockerfile (task 010) MUST still install the `imageio-ffmpeg` pip package.
- Keep `VideoRecorder` and `upload_replay` decoupled: encoding writes to local disk (`/tmp` in Lambda), upload is a separate explicit step, so tests can verify encoding without mocking S3 and vice versa.

## TDD Plan

### RED — Tests First

| # | Test Name | Asserts | File |
|---|-----------|---------|------|
| 1 | `test_add_frame_given_consistent_shapes_should_buffer_frames` | internal frame count increases | `backend/tests/test_video_recorder.py` |
| 2 | `test_add_frame_given_mismatched_shape_should_raise_frame_shape_error` | raises `FrameShapeError` | same |
| 3 | `test_encode_given_buffered_frames_should_write_playable_mp4_file` | output file exists, non-zero size, readable by `imageio` | same |
| 4 | `test_encode_given_no_frames_should_raise_empty_recording_error` | raises `EmptyRecordingError` | same |
| 5 | `test_upload_replay_should_put_object_at_expected_key_and_return_s3_uri` | S3 object exists at `{scenario_id}/{run_id}/replay.mp4`, returned URI matches | same |

### GREEN — Implementation Order

1. Create `backend/src/video/models.py` with `FrameShapeError`, `EmptyRecordingError`.
2. Create `backend/src/video/recorder.py` with `VideoRecorder` (`add_frame`, `encode`).
3. Add `upload_replay` to `backend/src/video/recorder.py` using `boto3`.

### REFACTOR

- None expected.

## Dependencies

- `TASK-002` — needs the `video-replays` S3 bucket name/env var to exist for `upload_replay`

## Files to Create/Modify

- `backend/src/video/__init__.py` (create)
- `backend/src/video/models.py` (create)
- `backend/src/video/recorder.py` (create)
- `backend/tests/test_video_recorder.py` (create)
- `backend/requirements.txt` (modify — add `imageio`, `imageio-ffmpeg`, `boto3`, `moto`)

## Acceptance Criteria

- [ ] All RED tests written and failing for the right reason
- [ ] All tests GREEN with minimal implementation
- [ ] REFACTOR pass complete, no regressions
- [ ] Encoded MP4 file is readable back via `imageio` in the test (round-trip check, not just file-exists)

## Spec Updates

- None
