"""Orchestrates one full simulation run: physics + control + telemetry + assertions."""
from __future__ import annotations

from control.base import RobotController
from physics.scene import ensure_scene_xml
from physics.simulation import PhysicsSimulation
from scenario.loader import apply_randomization
from scenario.models import Scenario
from telemetry.models import TelemetryBundle, TelemetryFrame

from .models import RunResult, ScenarioRunError, StructuredViolation

TELEMETRY_HZ = 30
_FOOT_LINK_NAMES = {"left_foot", "right_foot", "foot"}
_GROUND_BODY_NAME = "floor_body"


def _should_sample(sim_time: float, last_sample_time: float, hz: int) -> bool:
    return sim_time - last_sample_time >= (1.0 / hz)


def run_scenario(
    scenario: Scenario,
    controller: RobotController,
    model_path: str,
    max_duration_s: float = 30.0,
) -> RunResult:
    try:
        randomized_scenario = apply_randomization(scenario)
        scene_path = ensure_scene_xml(model_path)
        sim = PhysicsSimulation(scene_path)

        for placement in randomized_scenario.object_placements:
            sim.set_body_position(
                placement.object_id, placement.position, placement.orientation
            )

        telemetry = TelemetryBundle(sample_rate_hz=TELEMETRY_HZ)
        violations: list[StructuredViolation] = []
        violation_titles: set[str] = set()
        failures: list[str] = []
        last_sample_time = -1.0 / TELEMETRY_HZ

        while sim.get_time() < max_duration_s:
            state = sim.get_state()
            action = controller.compute_action(state, sim.get_time())
            sim.apply_action(action)

            sim.step()
            sim_time = sim.get_time()

            if _should_sample(sim_time, last_sample_time, TELEMETRY_HZ):
                telemetry.frames.append(TelemetryFrame(
                    time=round(sim_time, 4),
                    joint_angles=dict(state.joint_angles),
                    joint_velocities=sim.get_joint_velocities(),
                    body_positions=dict(state.body_positions),
                    center_of_mass=sim.get_center_of_mass(),
                    contacts=sim.get_active_contacts(),
                ))
                last_sample_time = sim_time

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

        telemetry.total_duration_s = duration_s

        return RunResult(
            success=success,
            duration_s=duration_s,
            steps_simulated=steps_simulated,
            failures=failures,
            violations=violations,
            telemetry=telemetry,
        )
    except ScenarioRunError:
        raise
    except Exception as exc:
        raise ScenarioRunError(f"Simulation run failed unexpectedly: {exc}") from exc
