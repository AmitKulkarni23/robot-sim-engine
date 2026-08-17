# Task: 006 — MuJoCo Physics Engine Wrapper

## Summary

Build the thin Python wrapper around the `mujoco` package that loads an MJCF model, advances the simulation in fixed time steps, and returns robot/object state at each step. This is the "laws of nature" layer described in README.md's architecture table — answers "where is everything N ms from now?" — and is the core dependency of the test harness (task 009).

## Read First

- `README.md` — Architecture table, "Physics Engine" row
- `docs/references.md` — "Physics Engine — MuJoCo" section

## Conventions

No `.claude/rules/` convention applies to `backend/` Python code. Follow PEP 8 and type hints.

## Requirements

1. The module MUST expose a `PhysicsSimulation` class constructed as `PhysicsSimulation(model_path: str, timestep: float = 0.002)` that loads the MJCF file at `model_path` via `mujoco.MjModel.from_xml_path`.
2. The constructor MUST raise `PhysicsModelLoadError` (custom exception) when the MJCF file is missing or malformed — MUST NOT leak a raw `mujoco` C-extension exception to callers.
3. `PhysicsSimulation` MUST expose `step() -> None` that advances the simulation by exactly one `timestep` using `mujoco.mj_step`.
4. `PhysicsSimulation` MUST expose `get_state() -> SimState` returning the current body positions, orientations (quaternions), and joint angles for every body/joint in the model, as a `SimState` dataclass (not raw MuJoCo arrays) so callers are decoupled from MuJoCo's internal representation.
5. `PhysicsSimulation` MUST expose `get_time() -> float` returning simulated elapsed time in seconds (`timestep * number of steps taken so far`).
6. `PhysicsSimulation` MUST expose `render_frame(width: int = 640, height: int = 480) -> numpy.ndarray` returning an RGB frame (shape `(height, width, 3)`, dtype `uint8`) rendered via MuJoCo's offscreen renderer, for use by the video recorder (task 008). This method MUST use `mujoco.Renderer`, which itself is configured (via the `MUJOCO_GL=osmesa` environment variable, set at the process/container level, not inside this class) to render without a display.
7. `PhysicsSimulation` MUST expose `check_contact(body_a: str, body_b: str) -> bool` returning whether two named bodies are currently in contact, for use by the test harness's assertion logic.
8. `PhysicsSimulation` MUST expose `reset() -> None` restoring the simulation to its initial state (as loaded from the MJCF, before any `step()` calls).

## Technical Notes

- `mujoco.Renderer` requires an OpenGL context; this class assumes `MUJOCO_GL=osmesa` is set in the Lambda container environment (task 010's Dockerfile) — do not attempt to set it from Python at runtime, since the GL backend must be selected before the `mujoco` module is imported.
- Body/joint name lookups MUST use MuJoCo's name-to-id functions (`mujoco.mj_name2id`) rather than hardcoded indices, since indices vary by model.
- Tests that exercise real physics stepping and rendering need a real (small) MJCF fixture — do not attempt to mock `mujoco.MjModel`/`mujoco.MjData`; use a minimal test fixture MJCF (e.g. a single free body falling under gravity) checked into `backend/tests/fixtures/`.

## TDD Plan

### RED — Tests First

| # | Test Name | Asserts | File |
|---|-----------|---------|------|
| 1 | `test_init_given_valid_mjcf_should_load_model` | no exception, model loaded | `backend/tests/test_physics_simulation.py` |
| 2 | `test_init_given_missing_file_should_raise_physics_model_load_error` | raises `PhysicsModelLoadError` | same |
| 3 | `test_init_given_malformed_mjcf_should_raise_physics_model_load_error` | raises `PhysicsModelLoadError`, not raw mujoco error | same |
| 4 | `test_step_should_advance_simulation_time_by_one_timestep` | `get_time()` increases by exactly `timestep` | same |
| 5 | `test_get_state_after_step_should_reflect_body_falling_under_gravity` | free body's z-position decreases after several steps | same |
| 6 | `test_render_frame_should_return_rgb_array_of_requested_dimensions` | shape `(height, width, 3)`, dtype `uint8` | same |
| 7 | `test_check_contact_given_two_bodies_not_touching_should_return_false` | returns `False` | same |
| 8 | `test_reset_should_restore_initial_state` | `get_state()` after reset equals state at time 0 | same |

### GREEN — Implementation Order

1. Create `backend/tests/fixtures/falling_body.xml` — minimal MJCF with one free body under gravity.
2. Create `backend/src/physics/models.py` with `SimState` dataclass and `PhysicsModelLoadError`.
3. Create `backend/src/physics/simulation.py` with `PhysicsSimulation.__init__` wrapping model load with error translation.
4. Add `step()`, `get_time()`, `reset()`.
5. Add `get_state()` translating MuJoCo's `MjData` into `SimState`.
6. Add `render_frame()` using `mujoco.Renderer`.
7. Add `check_contact()` using MuJoCo's contact array and name-to-id lookups.

### REFACTOR

- If `get_state()`'s translation logic grows complex (many body/joint types), extract a private `_extract_body_state` helper.

## Dependencies

- `TASK-005` — needs a real MJCF file (from the robot model loader) for integration-style tests, though the fixture MJCF for unit tests is self-contained and does not require task 005 to be complete first. Listed as a soft dependency for end-to-end testing, not a hard blocker for this task's own TDD cycle.

## Files to Create/Modify

- `backend/src/physics/__init__.py` (create)
- `backend/src/physics/models.py` (create)
- `backend/src/physics/simulation.py` (create)
- `backend/tests/fixtures/falling_body.xml` (create)
- `backend/tests/test_physics_simulation.py` (create)
- `backend/requirements.txt` (modify — add `mujoco`, `numpy`)

## Acceptance Criteria

- [ ] All RED tests written and failing for the right reason
- [ ] All tests GREEN with minimal implementation
- [ ] REFACTOR pass complete, no regressions
- [ ] No raw `mujoco` exceptions leak past the `PhysicsSimulation` constructor
- [ ] `render_frame` returns a correctly-shaped `uint8` RGB array

## Spec Updates

- None
