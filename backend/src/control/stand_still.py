"""Controller that holds the robot in a stable standing pose."""
from __future__ import annotations

from physics.models import SimState

from .base import RobotController
from .keyframes import STAND_KEYFRAME
from .models import ControlAction


class StandStillController(RobotController):
    """Always commands the robot to hold the tuned standing keyframe."""

    def compute_action(self, state: SimState, elapsed_time: float) -> ControlAction:
        return ControlAction(joint_targets=dict(STAND_KEYFRAME))
