# Task: 009 — Test Harness & Scoring

## Summary

Build the Python module that orchestrates one full simulation run: load a scenario, step physics forward while feeding control actions from a `RobotController`, evaluate assertions defined by the scenario's task, and emit a verdict with metrics. This is the "assert statements" layer described in README.md's architecture table — `{success, duration, fails, violations}` — the core evaluation logic that both the Lambda handler (task 010) and any future local test runner depend on.

## Read First

- `README.md` — Architecture table, "Test Harness" row: "emits `{success, duration, fails, violations}`"
- `docs/references.md` — "Simulation Concepts" section

## Conventions

No `.claude/rules/` convention applies to `backend/` Python code. Follow PEP 8 and type hints.

## Requirements

1. The module MUST expose a `run_scenario(scenario: Scenario, controller: RobotController, model_path: str, max_duration_s: float = 30.0) -> RunResult` function.
2. `run_scenario` MUST apply randomization to the scenario via `apply_randomization` (task 004) before starting the simulation.
3. `run_scenario` MUST construct a `PhysicsSimulation` (task 006) from `model_path`, apply the scenario's `object_placements` as initial state, then loop: get state → compute control action via `controller.compute_action` → apply joint targets to the simulation → `step()` → repeat, until either `max_duration_s` of simulated time elapses or the scenario's task completion condition (see requirement 5) is met.
4. `run_scenario` MUST collect an RGB frame via `PhysicsSimulation.render_frame` at a fixed video frame rate (30 fps) throughout the loop, independent of the physics timestep (which runs at a higher rate), and pass the collected frames to a `VideoRecorder` (task 008).
5. `RunResult` MUST include: `success: bool`, `duration_s: float` (simulated time elapsed), `failures: list[str]` (human-readable failure descriptions), `violations: list[str]` (constraint violations distinct from task failures, e.g. "robot fell over"), `video_frames: list[numpy.ndarray]` (for the caller to pass to the video recorder — task 009 does not itself call `VideoRecorder.encode`/`upload_replay`; that is the Lambda handler's job in task 010, keeping this module free of S3/network side effects).
6. `run_scenario` MUST detect a "robot fell over" violation using `PhysicsSimulation.check_contact` — if any body other than the robot's designated foot links contacts the ground plane, append `"robot fell over"` to `violations` and MUST set `success = False`.
7. `run_scenario` MUST append `"timed out after {max_duration_s}s"` to `failures` and set `success = False` if the loop exits due to the time limit rather than task completion.
8. `run_scenario` MUST raise `ScenarioRunError` (custom exception, wrapping the original exception) if `PhysicsSimulation`, the controller, or the video recorder raise unexpectedly during the run — callers (task 010) need one exception type to catch for "the run itself blew up" versus a normal `RunResult` with `success=False` for "the run completed but the robot failed the task."

## Technical Notes

- Task completion condition (requirement 3) is intentionally minimal for this task: treat the scenario as "complete" the instant `max_duration_s` is reached (no interim success detection). A richer per-task-type completion/assertion system is a known future extension — do not build a generic assertion DSL here; that is over-engineering for the current scope. Document this simplification in the module's docstring.
- `object_placements` application (requirement 3) means setting each named body's initial `qpos` in MuJoCo's `MjData` before the step loop begins — this requires a small addition to how `PhysicsSimulation` is used (setting initial state), which this task's implementer MAY need to extend `PhysicsSimulation` with a `set_body_position(body_name: str, position, orientation)` method if task 006 didn't already provide one. Check `backend/src/physics/simulation.py` before assuming this method exists; add it if missing, and note that as a modification to task 006's files below.

## TDD Plan

### RED — Tests First

| # | Test Name | Asserts | File |
|---|-----------|---------|------|
| 1 | `test_run_scenario_given_stand_still_controller_should_complete_and_return_result_with_duration_equal_to_max_duration` | `RunResult.duration_s == max_duration_s`, `RunResult.success is False`, `"timed out"` in failures (since stand-still never signals task completion) | `backend/tests/test_harness.py` |
| 2 | `test_run_scenario_should_apply_randomization_before_running` | object placements differ from unrandomized scenario when seed is set | same |
| 3 | `test_run_scenario_should_collect_video_frames_at_thirty_fps` | `len(RunResult.video_frames) == round(duration_s * 30)` (within tolerance) | same |
| 4 | `test_run_scenario_given_robot_falls_over_should_record_violation_and_fail` | `"robot fell over"` in violations, `success is False` (using a fixture MJCF where the body starts in a falling/contact state) | same |
| 5 | `test_run_scenario_given_controller_raises_should_raise_scenario_run_error` | raises `ScenarioRunError`, original exception chained via `__cause__` | same |

### GREEN — Implementation Order

1. Create `backend/src/harness/models.py` with `RunResult`, `ScenarioRunError`.
2. Add `set_body_position` to `backend/src/physics/simulation.py` if not already present (check first).
3. Create `backend/src/harness/runner.py` with `run_scenario` — randomization, simulation setup, step loop with frame collection.
4. Add fall-detection violation logic to `run_scenario`.
5. Add timeout/failure logic to `run_scenario`.
6. Wrap the step loop in a try/except translating unexpected errors to `ScenarioRunError`.

### REFACTOR

- If the step loop grows past ~40 lines, extract frame-collection timing logic into a small private helper (`_should_capture_frame(sim_time, last_capture_time, fps)`).

## Dependencies

- `TASK-004` — needs `Scenario`, `apply_randomization`
- `TASK-006` — needs `PhysicsSimulation`, `SimState`
- `TASK-007` — needs `RobotController`, `ControlAction`

## Files to Create/Modify

- `backend/src/harness/__init__.py` (create)
- `backend/src/harness/models.py` (create)
- `backend/src/harness/runner.py` (create)
- `backend/src/physics/simulation.py` (modify — add `set_body_position` if missing, per Technical Notes)
- `backend/tests/test_harness.py` (create)
- `backend/tests/fixtures/falling_robot.xml` (create — small fixture with a body starting in a fall state, for the violation test)

## Acceptance Criteria

- [ ] All RED tests written and failing for the right reason
- [ ] All tests GREEN with minimal implementation
- [ ] REFACTOR pass complete, no regressions
- [ ] `run_scenario` never raises anything other than `ScenarioRunError` on internal failure
- [ ] Frame collection rate is independent of the physics timestep

## Spec Updates

- None
