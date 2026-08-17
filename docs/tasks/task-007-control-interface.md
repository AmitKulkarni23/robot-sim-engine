# Task: 007 — Control Software Interface

## Summary

Define the abstract interface between the simulation engine and "software under test" (the robot's control code — KinetIQ in production, per README.md's architecture table), plus a simple stand-in mock controller so the test harness (task 009) has something runnable end-to-end without a real KinetIQ integration. This decouples the simulator from any specific control-software implementation.

## Read First

- `README.md` — Architecture table, "Control Software" row (KinetIQ stand-in note)

## Conventions

No `.claude/rules/` convention applies to `backend/` Python code. Follow PEP 8 and type hints.

## Requirements

1. The module MUST define an abstract base class `RobotController` (using `abc.ABC`) with a single abstract method `compute_action(state: SimState, elapsed_time: float) -> ControlAction`.
2. `ControlAction` MUST be a dataclass containing `joint_targets: dict[str, float]` (joint name → target angle in radians).
3. The module MUST provide a concrete `StandStillController(RobotController)` — the mock stand-in — whose `compute_action` always returns the robot's current joint angles as targets (i.e. commands the robot to hold its current pose), reading joint state from the `SimState` passed in.
4. `StandStillController.compute_action` MUST raise `ControllerError` (custom exception) if `state.joint_angles` is empty (defensive check — a `SimState` with no joints indicates a caller bug, not a valid input to command against).
5. The module MUST expose a `load_controller(controller_name: str) -> RobotController` factory function that returns an instantiated controller by name, raising `UnknownControllerError` for unregistered names. Only `"stand_still"` MUST be registered for this task.

## Technical Notes

- `SimState` is defined in task 006 (`backend/src/physics/models.py`) — import it, do not redefine it.
- This interface intentionally has no knowledge of MuJoCo, S3, or DynamoDB — it is pure domain logic so a real KinetIQ adapter can be dropped in later without touching the test harness.

## TDD Plan

### RED — Tests First

| # | Test Name | Asserts | File |
|---|-----------|---------|------|
| 1 | `test_stand_still_controller_given_joint_state_should_return_matching_targets` | `ControlAction.joint_targets` equals input joint angles | `backend/tests/test_control_interface.py` |
| 2 | `test_stand_still_controller_given_empty_joint_state_should_raise_controller_error` | raises `ControllerError` | same |
| 3 | `test_load_controller_given_stand_still_should_return_stand_still_controller_instance` | returns `StandStillController` instance | same |
| 4 | `test_load_controller_given_unknown_name_should_raise_unknown_controller_error` | raises `UnknownControllerError` | same |

### GREEN — Implementation Order

1. Create `backend/src/control/models.py` with `ControlAction` dataclass, `ControllerError`, `UnknownControllerError`.
2. Create `backend/src/control/base.py` with abstract `RobotController`.
3. Create `backend/src/control/stand_still.py` with `StandStillController`.
4. Create `backend/src/control/factory.py` with `load_controller`.

### REFACTOR

- None expected — module is small and single-purpose.

## Dependencies

- `TASK-006` — imports `SimState` from `backend/src/physics/models.py`

## Files to Create/Modify

- `backend/src/control/__init__.py` (create)
- `backend/src/control/models.py` (create)
- `backend/src/control/base.py` (create)
- `backend/src/control/stand_still.py` (create)
- `backend/src/control/factory.py` (create)
- `backend/tests/test_control_interface.py` (create)

## Acceptance Criteria

- [ ] All RED tests written and failing for the right reason
- [ ] All tests GREEN with minimal implementation
- [ ] REFACTOR pass complete, no regressions
- [ ] `RobotController` cannot be instantiated directly (ABC enforcement verified by at least one test attempting it and expecting `TypeError`)

## Spec Updates

- None
