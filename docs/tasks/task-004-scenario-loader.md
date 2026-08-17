# Task: 004 — Scenario Loader

## Summary

Build the Python module that parses scenario definitions (factory cell layout, task description, object placement, randomization ranges) from YAML into a validated in-memory `Scenario` model. This is the "level file" described in README.md's architecture table — data, not code — and is the first input the test harness (task 009) and Lambda handler (task 010) need before a simulation can run.

## Read First

- `README.md` — Architecture table, "Scenario/World" row
- `docs/references.md` — "Simulation Concepts" section (Scenario definition)

## Conventions

This project's `.claude-stack` does not declare a Python backend convention stack — no `.claude/rules/` entries apply to `backend/`. Follow standard Python conventions: PEP 8, type hints on all public functions, `dataclasses` or `pydantic` for models. Prefer `pydantic` for validation since scenario YAML is untrusted input from the Scenarios DynamoDB table.

## Requirements

1. The module MUST expose a `load_scenario(yaml_content: str) -> Scenario` function that parses a YAML string into a `Scenario` object.
2. `Scenario` MUST include fields: `scenario_id: str`, `version: int`, `robot_model: str` (e.g. `"unitree_g1"`), `task: TaskDefinition`, `object_placements: list[ObjectPlacement]`, `randomization: RandomizationConfig`.
3. `ObjectPlacement` MUST include `object_id: str`, `position: tuple[float, float, float]`, `orientation: tuple[float, float, float, float]` (quaternion).
4. `RandomizationConfig` MUST include `seed: int | None` and `position_noise_std: float` (standard deviation in meters applied to object placements when `seed` is set).
5. `load_scenario` MUST raise `ScenarioValidationError` (a custom exception) when required fields are missing or have the wrong type — MUST NOT raise a raw `pydantic.ValidationError` or `KeyError` to callers.
6. `load_scenario` MUST raise `ScenarioValidationError` when `position_noise_std` is negative.
7. The module MUST expose `apply_randomization(scenario: Scenario) -> Scenario` that returns a new `Scenario` with object positions perturbed by Gaussian noise (`position_noise_std`) using `scenario.randomization.seed` as the RNG seed, so results are reproducible given the same seed. When `seed` is `None`, the function MUST return the scenario unmodified (no randomization applied).

## Technical Notes

- Use `PyYAML` (`yaml.safe_load`) — never `yaml.load` — since scenario content ultimately originates from user-supplied site packs.
- Use `numpy.random.default_rng(seed)` for reproducible randomization, not the global `random` module.

## TDD Plan

### RED — Tests First

| # | Test Name | Asserts | File |
|---|-----------|---------|------|
| 1 | `test_load_scenario_given_valid_yaml_should_return_scenario_object` | returns populated `Scenario` | `backend/tests/test_scenario_loader.py` |
| 2 | `test_load_scenario_given_missing_scenario_id_should_raise_validation_error` | raises `ScenarioValidationError` | same |
| 3 | `test_load_scenario_given_malformed_yaml_should_raise_validation_error` | raises `ScenarioValidationError`, not `yaml.YAMLError` | same |
| 4 | `test_load_scenario_given_negative_noise_std_should_raise_validation_error` | raises `ScenarioValidationError` | same |
| 5 | `test_apply_randomization_given_seed_should_perturb_object_positions` | positions differ from original, deterministic per seed | same |
| 6 | `test_apply_randomization_given_same_seed_should_produce_identical_positions_across_calls` | two calls with same seed produce identical output | same |
| 7 | `test_apply_randomization_given_no_seed_should_return_scenario_unmodified` | returned positions equal original positions | same |

### GREEN — Implementation Order

1. Create `backend/src/scenario/models.py` with `Scenario`, `TaskDefinition`, `ObjectPlacement`, `RandomizationConfig` pydantic models and `ScenarioValidationError`.
2. Create `backend/src/scenario/loader.py` with `load_scenario()` wrapping pydantic validation and translating errors.
3. Add `apply_randomization()` to `backend/src/scenario/loader.py` using `numpy.random.default_rng`.

### REFACTOR

- None expected — module is small and single-purpose.

## Dependencies

- None

## Files to Create/Modify

- `backend/src/scenario/__init__.py` (create)
- `backend/src/scenario/models.py` (create)
- `backend/src/scenario/loader.py` (create)
- `backend/tests/test_scenario_loader.py` (create)
- `backend/requirements.txt` (modify — add `pydantic`, `PyYAML`, `numpy`, `pytest`)

## Acceptance Criteria

- [ ] All RED tests written and failing for the right reason
- [ ] All tests GREEN with minimal implementation
- [ ] REFACTOR pass complete, no regressions
- [ ] `load_scenario` never leaks raw `pydantic.ValidationError` or `yaml.YAMLError`
- [ ] `apply_randomization` is deterministic given a seed and a no-op when seed is `None`

## Spec Updates

- None
