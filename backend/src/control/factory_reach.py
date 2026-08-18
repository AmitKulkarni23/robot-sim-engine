"""Controller that balances the robot while reaching toward a workstation."""
from __future__ import annotations

from physics.models import SimState

from .base import RobotController
from .models import ControlAction

_STAND_KEYFRAME = {
    "left_hip_pitch_joint": 0.0,
    "left_hip_roll_joint": 0.0,
    "left_hip_yaw_joint": 0.0,
    "left_knee_joint": 0.0,
    "left_ankle_pitch_joint": 0.0,
    "left_ankle_roll_joint": 0.0,
    "right_hip_pitch_joint": 0.0,
    "right_hip_roll_joint": 0.0,
    "right_hip_yaw_joint": 0.0,
    "right_knee_joint": 0.0,
    "right_ankle_pitch_joint": 0.0,
    "right_ankle_roll_joint": 0.0,
    "waist_yaw_joint": 0.0,
    "waist_roll_joint": 0.0,
    "waist_pitch_joint": 0.0,
    "left_shoulder_pitch_joint": 0.2,
    "left_shoulder_roll_joint": 0.2,
    "left_shoulder_yaw_joint": 0.0,
    "left_elbow_joint": 1.28,
    "left_wrist_roll_joint": 0.0,
    "left_wrist_pitch_joint": 0.0,
    "left_wrist_yaw_joint": 0.0,
    "right_shoulder_pitch_joint": 0.2,
    "right_shoulder_roll_joint": -0.2,
    "right_shoulder_yaw_joint": 0.0,
    "right_elbow_joint": 1.28,
    "right_wrist_roll_joint": 0.0,
    "right_wrist_pitch_joint": 0.0,
    "right_wrist_yaw_joint": 0.0,
}

_REACH_TARGETS = {
    "right_shoulder_pitch_joint": -0.8,
    "right_shoulder_roll_joint": -0.3,
    "right_elbow_joint": 0.4,
    "right_wrist_pitch_joint": -0.3,
    "left_shoulder_pitch_joint": -0.5,
    "left_shoulder_roll_joint": 0.3,
    "left_elbow_joint": 0.6,
    "waist_pitch_joint": 0.15,
}

_SETTLE_DURATION = 1.0
_REACH_DURATION = 3.0
_HOLD_START = _SETTLE_DURATION + _REACH_DURATION


def _lerp(a: float, b: float, t: float) -> float:
    t = max(0.0, min(1.0, t))
    return a + (b - a) * t


class FactoryReachController(RobotController):
    """Balanced reach: settle into stance, then smoothly extend arms toward workstation."""

    def compute_action(self, state: SimState, elapsed_time: float) -> ControlAction:
        targets = dict(_STAND_KEYFRAME)

        if elapsed_time > _SETTLE_DURATION:
            t = (elapsed_time - _SETTLE_DURATION) / _REACH_DURATION
            for joint, reach_val in _REACH_TARGETS.items():
                stand_val = _STAND_KEYFRAME[joint]
                targets[joint] = _lerp(stand_val, reach_val, t)

        return ControlAction(joint_targets=targets)
