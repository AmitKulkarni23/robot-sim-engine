from pathlib import Path

import pytest

import harness.runner as runner_module
from control.stand_still import StandStillController
from harness.models import RunResult, ScenarioRunError
from harness.runner import run_scenario
from scenario.loader import load_scenario

FIXTURES_DIR = Path(__file__).parent / "fixtures"

BASE_YAML = """
scenario_id: "harness-test"
version: 1
robot_model: "unitree_g1"
task:
  task_type: "stand"
  description: "Stand still"
object_placements:
  - object_id: "free_body"
    position: [0.0, 0.0, 1.0]
    orientation: [1.0, 0.0, 0.0, 0.0]
randomization:
  seed: null
  position_noise_std: 0.0
"""

RANDOMIZED_YAML = BASE_YAML.replace("seed: null", "seed: 7").replace(
    "position_noise_std: 0.0", "position_noise_std: 0.1"
)


def test_run_scenario_given_stand_still_controller_should_complete_and_return_result_with_duration_equal_to_max_duration():
    scenario = load_scenario(BASE_YAML)
    controller = StandStillController()

    result = run_scenario(
        scenario,
        controller,
        str(FIXTURES_DIR / "falling_body.xml"),
        max_duration_s=0.02,
    )

    assert isinstance(result, RunResult)
    assert result.duration_s == pytest.approx(0.02)
    assert result.steps_simulated == 10
    assert result.success is False
    assert any("timed out" in failure for failure in result.failures)


def test_run_scenario_should_apply_randomization_before_running(monkeypatch):
    scenario = load_scenario(RANDOMIZED_YAML)
    controller = StandStillController()

    original_apply_randomization = runner_module.apply_randomization
    calls = []

    def _spy(s):
        calls.append(s)
        return original_apply_randomization(s)

    monkeypatch.setattr(runner_module, "apply_randomization", _spy)

    run_scenario(
        scenario,
        controller,
        str(FIXTURES_DIR / "falling_body.xml"),
        max_duration_s=0.02,
    )

    assert calls == [scenario]


def test_run_scenario_should_collect_telemetry_frames_at_thirty_hz():
    scenario = load_scenario(BASE_YAML)
    controller = StandStillController()

    result = run_scenario(
        scenario,
        controller,
        str(FIXTURES_DIR / "falling_body.xml"),
        max_duration_s=0.1,
    )

    expected_frames = round(result.duration_s * 30)
    assert abs(len(result.telemetry.frames) - expected_frames) <= 1
    frame = result.telemetry.frames[0]
    assert isinstance(frame.joint_angles, dict)
    assert isinstance(frame.center_of_mass, tuple)
    assert len(frame.center_of_mass) == 3


def test_run_scenario_given_robot_falls_over_should_record_violation_and_fail():
    scenario = load_scenario(BASE_YAML)
    controller = StandStillController()

    result = run_scenario(
        scenario,
        controller,
        str(FIXTURES_DIR / "falling_robot.xml"),
        max_duration_s=0.02,
    )

    assert any(v.title == "Robot fell over" for v in result.violations)
    assert result.success is False


def test_run_scenario_given_controller_raises_should_raise_scenario_run_error():
    scenario = load_scenario(BASE_YAML)

    class _RaisingController(StandStillController):
        def compute_action(self, state, elapsed_time):
            raise RuntimeError("boom")

    with pytest.raises(ScenarioRunError) as exc_info:
        run_scenario(
            scenario,
            _RaisingController(),
            str(FIXTURES_DIR / "falling_body.xml"),
            max_duration_s=0.02,
        )

    assert isinstance(exc_info.value.__cause__, RuntimeError)
