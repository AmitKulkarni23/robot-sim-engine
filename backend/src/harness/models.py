"""Result types for a single test harness run."""
from __future__ import annotations

from dataclasses import dataclass, field

from telemetry.models import TelemetryBundle


class ScenarioRunError(Exception):
    """Wraps unexpected failures from the physics engine, controller, or
    video recorder during a run -- distinct from a `RunResult` with
    `success=False`, which means the run completed but the robot failed
    the task."""


@dataclass
class StructuredViolation:
    severity: str
    title: str
    description: str
    time_label: str


@dataclass
class MetricValue:
    name: str
    unit: str
    value: float


@dataclass
class RunResult:
    success: bool
    duration_s: float
    steps_simulated: int = 0
    failures: list[str] = field(default_factory=list)
    violations: list[StructuredViolation] = field(default_factory=list)
    metrics: list[MetricValue] = field(default_factory=list)
    telemetry: TelemetryBundle = field(default_factory=TelemetryBundle)
