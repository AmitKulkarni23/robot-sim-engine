"""State and error types decoupling callers from raw MuJoCo arrays."""
from __future__ import annotations

from dataclasses import dataclass, field


class PhysicsModelLoadError(Exception):
    """Raised when an MJCF model fails to load."""


@dataclass
class SimState:
    """A snapshot of every body/joint's state at a point in simulated time."""

    body_positions: dict[str, tuple[float, float, float]] = field(
        default_factory=dict
    )
    body_orientations: dict[str, tuple[float, float, float, float]] = field(
        default_factory=dict
    )
    joint_angles: dict[str, float] = field(default_factory=dict)
