"""Data types for simulation telemetry output."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ContactEvent:
    body_a: str
    body_b: str
    position: tuple[float, float, float]


@dataclass
class TelemetryFrame:
    time: float
    joint_angles: dict[str, float]
    joint_velocities: dict[str, float]
    body_positions: dict[str, tuple[float, float, float]]
    center_of_mass: tuple[float, float, float]
    contacts: list[ContactEvent] = field(default_factory=list)


@dataclass
class TelemetryBundle:
    frames: list[TelemetryFrame] = field(default_factory=list)
    sample_rate_hz: int = 30
    total_duration_s: float = 0.0

    def to_dict(self) -> dict:
        return {
            "sample_rate_hz": self.sample_rate_hz,
            "total_duration_s": self.total_duration_s,
            "frame_count": len(self.frames),
            "frames": [
                {
                    "t": f.time,
                    "joint_angles": f.joint_angles,
                    "joint_velocities": f.joint_velocities,
                    "body_positions": {
                        k: list(v) for k, v in f.body_positions.items()
                    },
                    "com": list(f.center_of_mass),
                    "contacts": [
                        {
                            "body_a": c.body_a,
                            "body_b": c.body_b,
                            "position": list(c.position),
                        }
                        for c in f.contacts
                    ],
                }
                for f in self.frames
            ],
        }
