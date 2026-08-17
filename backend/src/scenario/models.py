"""Pydantic models describing a scenario definition (the "level file")."""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class ScenarioValidationError(Exception):
    """Raised when scenario YAML fails to parse or validate."""


class TaskDefinition(BaseModel):
    """The task the robot must perform within a scenario."""

    task_type: str
    description: str = ""


class ObjectPlacement(BaseModel):
    """Initial placement of a single object in the scenario's world."""

    object_id: str
    position: tuple[float, float, float]
    orientation: tuple[float, float, float, float]


class RandomizationConfig(BaseModel):
    """Randomization settings applied to object placements."""

    seed: int | None = None
    position_noise_std: float = 0.0

    @field_validator("position_noise_std")
    @classmethod
    def _validate_position_noise_std(cls, value: float) -> float:
        if value < 0:
            raise ValueError("position_noise_std must be non-negative")
        return value


class Scenario(BaseModel):
    """A fully parsed scenario definition."""

    scenario_id: str
    version: int
    robot_model: str
    task: TaskDefinition
    object_placements: list[ObjectPlacement] = Field(default_factory=list)
    randomization: RandomizationConfig = Field(default_factory=RandomizationConfig)
