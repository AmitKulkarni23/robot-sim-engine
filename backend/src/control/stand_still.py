"""Mock stand-in controller so the harness has something runnable end-to-end."""
from __future__ import annotations

from physics.models import SimState

from .base import RobotController
from .models import ControlAction, ControllerError


class StandStillController(RobotController):
    """Always commands the robot to hold its current pose."""

    def compute_action(self, state: SimState, elapsed_time: float) -> ControlAction:
        if not state.joint_angles:
            raise ControllerError("Cannot compute action: SimState has no joints")
        return ControlAction(joint_targets=dict(state.joint_angles))
