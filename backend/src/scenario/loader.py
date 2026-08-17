"""Loading and randomization of scenario definitions."""
from __future__ import annotations

import numpy as np
import yaml
from pydantic import ValidationError

from .models import Scenario, ScenarioValidationError


def load_scenario(yaml_content: str) -> Scenario:
    """Parse a scenario YAML string into a validated `Scenario`.

    Raises `ScenarioValidationError` for any parsing or validation failure --
    never leaks a raw `yaml.YAMLError` or `pydantic.ValidationError`.
    """
    try:
        raw = yaml.safe_load(yaml_content)
    except yaml.YAMLError as exc:
        raise ScenarioValidationError(f"Malformed scenario YAML: {exc}") from exc

    if not isinstance(raw, dict):
        raise ScenarioValidationError("Scenario YAML must decode to a mapping")

    try:
        return Scenario.model_validate(raw)
    except ValidationError as exc:
        raise ScenarioValidationError(str(exc)) from exc


def apply_randomization(scenario: Scenario) -> Scenario:
    """Return a new `Scenario` with object positions perturbed by Gaussian noise.

    Uses `scenario.randomization.seed` to seed a `numpy.random.default_rng`
    so results are reproducible for a given seed. When `seed` is `None`, the
    scenario is returned unmodified (no-op).
    """
    if scenario.randomization.seed is None:
        return scenario

    rng = np.random.default_rng(scenario.randomization.seed)
    std = scenario.randomization.position_noise_std

    randomized = scenario.model_copy(deep=True)
    for placement in randomized.object_placements:
        noise = rng.normal(0.0, std, size=3)
        x, y, z = placement.position
        placement.position = (
            x + float(noise[0]),
            y + float(noise[1]),
            z + float(noise[2]),
        )

    return randomized
