import pytest

from scenario.loader import apply_randomization, load_scenario
from scenario.models import Scenario, ScenarioValidationError

VALID_YAML = """
scenario_id: "pick-and-place-01"
version: 1
robot_model: "unitree_g1"
task:
  task_type: "pick_and_place"
  description: "Pick up box and place on shelf"
object_placements:
  - object_id: "box_01"
    position: [1.0, 2.0, 0.0]
    orientation: [1.0, 0.0, 0.0, 0.0]
randomization:
  seed: 42
  position_noise_std: 0.05
"""


def test_load_scenario_given_valid_yaml_should_return_scenario_object():
    scenario = load_scenario(VALID_YAML)

    assert isinstance(scenario, Scenario)
    assert scenario.scenario_id == "pick-and-place-01"
    assert scenario.version == 1
    assert scenario.robot_model == "unitree_g1"
    assert len(scenario.object_placements) == 1
    assert scenario.object_placements[0].object_id == "box_01"
    assert scenario.randomization.seed == 42


def test_load_scenario_given_missing_scenario_id_should_raise_validation_error():
    yaml_content = VALID_YAML.replace('scenario_id: "pick-and-place-01"\n', "")

    with pytest.raises(ScenarioValidationError):
        load_scenario(yaml_content)


def test_load_scenario_given_malformed_yaml_should_raise_validation_error():
    with pytest.raises(ScenarioValidationError):
        load_scenario("scenario_id: [unterminated")


def test_load_scenario_given_negative_noise_std_should_raise_validation_error():
    yaml_content = VALID_YAML.replace(
        "position_noise_std: 0.05", "position_noise_std: -1.0"
    )

    with pytest.raises(ScenarioValidationError):
        load_scenario(yaml_content)


def test_apply_randomization_given_seed_should_perturb_object_positions():
    scenario = load_scenario(VALID_YAML)

    randomized = apply_randomization(scenario)

    assert (
        randomized.object_placements[0].position
        != scenario.object_placements[0].position
    )


def test_apply_randomization_given_same_seed_should_produce_identical_positions_across_calls():
    scenario = load_scenario(VALID_YAML)

    first = apply_randomization(scenario)
    second = apply_randomization(scenario)

    assert first.object_placements[0].position == second.object_placements[0].position


def test_apply_randomization_given_no_seed_should_return_scenario_unmodified():
    yaml_content = VALID_YAML.replace("seed: 42", "seed: null")
    scenario = load_scenario(yaml_content)

    randomized = apply_randomization(scenario)

    assert (
        randomized.object_placements[0].position
        == scenario.object_placements[0].position
    )
