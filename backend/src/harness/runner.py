"""Orchestrates one full simulation run: physics + control + assertions.

Task-completion detection is intentionally minimal for this iteration: a
scenario is considered "complete" only once `max_duration_s` of simulated
time elapses -- there is no interim, per-task-type success detection. A
richer assertion DSL is a known future extension and is deliberately out
of scope here (see task-009's Technical Notes).
"""
from __future__ import annotations

from control.base import RobotController
from physics.simulation import PhysicsSimulation
from scenario.loader import apply_randomization
from scenario.models import Scenario

from .models import RunResult, ScenarioRunError, StructuredViolation

VIDEO_FPS = 30
_FOOT_LINK_NAMES = {"left_foot", "right_foot", "foot"}
_GROUND_BODY_NAME = "floor_body"


def _should_capture_frame(sim_time: float, last_capture_time: float, fps: int) -> bool:
    return sim_time - last_capture_time >= (1.0 / fps)


def run_scenario(
    scenario: Scenario,
    controller: RobotController,
    model_path: str,
    max_duration_s: float = 30.0,
) -> RunResult:
    """Run `scenario` to completion (or timeout) and return a `RunResult`.

    Raises `ScenarioRunError` -- wrapping the original exception -- if the
    physics engine, controller, or video recorder fail unexpectedly.
    """
    try:
        randomized_scenario = apply_randomization(scenario)
        sim = PhysicsSimulation(model_path)

        for placement in randomized_scenario.object_placements:
            sim.set_body_position(
                placement.object_id, placement.position, placement.orientation
            )

        video_frames = []
        violations: list[StructuredViolation] = []
        violation_titles: set[str] = set()
        failures: list[str] = []
        last_capture_time = -1.0 / VIDEO_FPS

        while sim.get_time() < max_duration_s:
            state = sim.get_state()
            controller.compute_action(state, sim.get_time())

            sim.step()
            sim_time = sim.get_time()

            if _should_capture_frame(sim_time, last_capture_time, VIDEO_FPS):
                video_frames.append(sim.render_frame())
                last_capture_time = sim_time

            for body_name in state.body_positions:
                if body_name in _FOOT_LINK_NAMES or body_name == _GROUND_BODY_NAME:
                    continue
                if sim.check_contact(body_name, _GROUND_BODY_NAME):
                    title = "Robot fell over"
                    if title not in violation_titles:
                        violation_titles.add(title)
                        violations.append(StructuredViolation(
                            severity="error",
                            title=title,
                            description=f"Body '{body_name}' contacted ground",
                            time_label=f"t={sim_time:.2f}s",
                        ))

        duration_s = sim.get_time()
        steps_simulated = sim.steps_taken
        success = not violations

        if duration_s >= max_duration_s:
            failures.append(f"timed out after {max_duration_s}s")
            success = False

        return RunResult(
            success=success,
            duration_s=duration_s,
            steps_simulated=steps_simulated,
            failures=failures,
            violations=violations,
            video_frames=video_frames,
        )
    except ScenarioRunError:
        raise
    except Exception as exc:
        raise ScenarioRunError("Simulation run failed unexpectedly") from exc
