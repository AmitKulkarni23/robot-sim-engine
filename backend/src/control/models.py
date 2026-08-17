"""Data types shared by the control software interface."""
from __future__ import annotations

from dataclasses import dataclass


class ControllerError(Exception):
    """Raised when a controller cannot compute a valid action."""


class UnknownControllerError(Exception):
    """Raised by `load_controller` for an unregistered controller name."""


@dataclass
class ControlAction:
    """A single control command: joint name -> target angle (radians)."""

    joint_targets: dict[str, float]
