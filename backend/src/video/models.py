"""Error types for video recording."""
from __future__ import annotations


class FrameShapeError(Exception):
    """Raised when a frame's shape doesn't match previously buffered frames."""


class EmptyRecordingError(Exception):
    """Raised when `encode` is called with zero frames buffered."""
