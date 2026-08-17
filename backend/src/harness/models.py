"""Result types for a single test harness run."""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np


class ScenarioRunError(Exception):
    """Wraps unexpected failures from the physics engine, controller, or
    video recorder during a run -- distinct from a `RunResult` with
    `success=False`, which means the run completed but the robot failed
    the task."""


@dataclass
class RunResult:
    success: bool
    duration_s: float
    failures: list[str] = field(default_factory=list)
    violations: list[str] = field(default_factory=list)
    video_frames: list[np.ndarray] = field(default_factory=list)
