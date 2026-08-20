import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import { DiffEditor } from '@monaco-editor/react';
import TopBar from '@/components/layout/TopBar';
import { fontFamilyMono } from '@/config/theme';

const DEFECTIVE_CODE = `"""Defective controller — reaches too fast without compensating,
causing the robot to topple."""
from __future__ import annotations

from physics.models import SimState
from .base import RobotController
from .models import ControlAction

_STAND_KEYFRAME = {
    "left_hip_pitch_joint": 0.0,
    "left_hip_roll_joint": 0.0,
    "left_knee_joint": 0.0,
    "left_ankle_pitch_joint": 0.0,
    "right_hip_pitch_joint": 0.0,
    "right_hip_roll_joint": 0.0,
    "right_knee_joint": 0.0,
    "right_ankle_pitch_joint": 0.0,
    "waist_yaw_joint": 0.0,
    "waist_roll_joint": 0.0,
    "waist_pitch_joint": 0.0,
    "left_shoulder_pitch_joint": 0.2,
    "left_shoulder_roll_joint": 0.2,
    "left_elbow_joint": 1.28,
    "right_shoulder_pitch_joint": 0.2,
    "right_shoulder_roll_joint": -0.2,
    "right_elbow_joint": 1.28,
}

# BUG: reach targets are too aggressive — shoulder pitch goes to -2.0 rad
# and waist pitches forward 0.5 rad. This shifts the center of mass past
# the support polygon (feet), causing the robot to fall forward.
_REACH_TARGETS = {
    "right_shoulder_pitch_joint": -2.0,   # too far forward
    "right_shoulder_roll_joint": -0.5,
    "right_elbow_joint": 0.0,             # fully extended
    "left_shoulder_pitch_joint": -2.0,    # both arms — doubles the CoM shift
    "left_shoulder_roll_joint": 0.5,
    "left_elbow_joint": 0.0,
    "waist_pitch_joint": 0.5,             # leans torso forward
}

# BUG: reach speed is 0.8s — no settle phase, no gradual ramp.
# The robot snaps to reach targets almost instantly.
_REACH_SPEED = 0.8


def _lerp(a: float, b: float, t: float) -> float:
    t = max(0.0, min(1.0, t))
    return a + (b - a) * t


class FactoryReachDefectiveController(RobotController):
    """Bug: reaches too far forward too fast, robot falls."""

    def compute_action(self, state: SimState, elapsed_time: float) -> ControlAction:
        targets = dict(_STAND_KEYFRAME)

        # No settle phase — starts reaching immediately at t=0
        t = elapsed_time / _REACH_SPEED
        for joint, reach_val in _REACH_TARGETS.items():
            stand_val = _STAND_KEYFRAME[joint]
            targets[joint] = _lerp(stand_val, reach_val, t)

        return ControlAction(joint_targets=targets)
`;

const FIXED_CODE = `"""Controller that balances the robot while reaching toward a workstation."""
from __future__ import annotations

from physics.models import SimState
from .base import RobotController
from .models import ControlAction

_STAND_KEYFRAME = {
    "left_hip_pitch_joint": 0.0,
    "left_hip_roll_joint": 0.0,
    "left_knee_joint": 0.0,
    "left_ankle_pitch_joint": 0.0,
    "right_hip_pitch_joint": 0.0,
    "right_hip_roll_joint": 0.0,
    "right_knee_joint": 0.0,
    "right_ankle_pitch_joint": 0.0,
    "waist_yaw_joint": 0.0,
    "waist_roll_joint": 0.0,
    "waist_pitch_joint": 0.0,
    "left_shoulder_pitch_joint": 0.2,
    "left_shoulder_roll_joint": 0.2,
    "left_elbow_joint": 1.28,
    "right_shoulder_pitch_joint": 0.2,
    "right_shoulder_roll_joint": -0.2,
    "right_elbow_joint": 1.28,
}

# FIX: conservative reach targets — shoulder pitch only -0.8 rad,
# waist pitch 0.15 rad. Keeps center of mass within support polygon.
_REACH_TARGETS = {
    "right_shoulder_pitch_joint": -0.8,   # moderate reach
    "right_shoulder_roll_joint": -0.3,
    "right_elbow_joint": 0.4,             # partially bent — safer
    "left_shoulder_pitch_joint": -0.5,    # left arm acts as counterbalance
    "left_shoulder_roll_joint": 0.3,
    "left_elbow_joint": 0.6,
    "waist_pitch_joint": 0.15,            # minimal forward lean
    "right_wrist_pitch_joint": -0.3,
}

# FIX: 1s settle phase + 3s gradual reach — smooth trajectory
_SETTLE_DURATION = 1.0
_REACH_DURATION = 3.0
_HOLD_START = _SETTLE_DURATION + _REACH_DURATION


def _lerp(a: float, b: float, t: float) -> float:
    t = max(0.0, min(1.0, t))
    return a + (b - a) * t


class FactoryReachController(RobotController):
    """Balanced reach: settle into stance, then smoothly extend arms."""

    def compute_action(self, state: SimState, elapsed_time: float) -> ControlAction:
        targets = dict(_STAND_KEYFRAME)

        # Wait for settle phase before reaching
        if elapsed_time > _SETTLE_DURATION:
            t = (elapsed_time - _SETTLE_DURATION) / _REACH_DURATION
            for joint, reach_val in _REACH_TARGETS.items():
                stand_val = _STAND_KEYFRAME[joint]
                targets[joint] = _lerp(stand_val, reach_val, t)

        return ControlAction(joint_targets=targets)
`;

const CodeDiffPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <>
      <TopBar breadcrumb={['unitree-g1', 'code-diff']} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 3 }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 600 }}>Controller Code Review</Typography>
            <Chip
              label="v1 (Defective) → v2 (Fixed)"
              size="small"
              variant="outlined"
              sx={{ fontFamily: fontFamilyMono, fontSize: 11 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
            <InfoCard
              label="v1 — Defective"
              color="#f44336"
              items={[
                'Shoulder pitch: -2.0 rad (too aggressive)',
                'No settle phase — reaches at t=0',
                'Reach speed: 0.8s (snap motion)',
                'Both arms reach simultaneously',
              ]}
            />
            <InfoCard
              label="v2 — Fixed"
              color="#4caf50"
              items={[
                'Shoulder pitch: -0.8 rad (conservative)',
                '1s settle phase before reaching',
                'Reach duration: 3s (smooth trajectory)',
                'Left arm acts as counterbalance',
              ]}
            />
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 400,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              overflow: 'hidden',
            }}
          >
            <DiffEditor
              original={DEFECTIVE_CODE}
              modified={FIXED_CODE}
              language="python"
              theme={isDark ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                readOnly: true,
                renderSideBySide: true,
                automaticLayout: true,
              }}
            />
          </Box>
        </Box>
      </Box>
    </>
  );
};

const InfoCard: React.FC<{
  label: string;
  color: string;
  items: string[];
}> = ({ label, color, items }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.5,
        p: 2,
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{label}</Typography>
      </Box>
      {items.map((item) => (
        <Typography
          key={item}
          sx={{ fontSize: 12, color: 'text.secondary', fontFamily: fontFamilyMono, lineHeight: 1.7 }}
        >
          • {item}
        </Typography>
      ))}
    </Box>
  );
};

export default CodeDiffPage;
