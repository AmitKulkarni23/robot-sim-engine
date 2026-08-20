"""Defective controller — reaches too fast without compensating, causing the robot to topple."""
from __future__ import annotations

from physics.models import SimState

from .base import RobotController
from .factory_reach import _lerp
from .keyframes import STAND_KEYFRAME
from .models import ControlAction

_AGGRESSIVE_REACH = {
    "right_shoulder_pitch_joint": -2.0,
    "right_shoulder_roll_joint": -0.5,
    "right_elbow_joint": 0.0,
    "left_shoulder_pitch_joint": -2.0,
    "left_shoulder_roll_joint": 0.5,
    "left_elbow_joint": 0.0,
    "waist_pitch_joint": 0.5,
}

_REACH_SPEED = 0.8


class FactoryReachDefectiveController(RobotController):
    """Bug: reaches too far forward too fast, shifts center of mass past feet, robot falls."""

    def compute_action(self, state: SimState, elapsed_time: float) -> ControlAction:
        targets = dict(STAND_KEYFRAME)

        t = elapsed_time / _REACH_SPEED
        for joint, reach_val in _AGGRESSIVE_REACH.items():
            stand_val = STAND_KEYFRAME[joint]
            targets[joint] = _lerp(stand_val, reach_val, t)

        return ControlAction(joint_targets=targets)
