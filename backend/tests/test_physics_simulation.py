from pathlib import Path

import pytest

from control.models import ControlAction
from physics.models import PhysicsModelLoadError
from physics.scene import ensure_scene_xml
from physics.simulation import PhysicsSimulation

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_init_given_valid_mjcf_should_load_model():
    sim = PhysicsSimulation(str(FIXTURES_DIR / "falling_body.xml"))

    assert sim is not None
    assert sim.get_time() == pytest.approx(0.0)


def test_init_given_missing_file_should_raise_physics_model_load_error():
    with pytest.raises(PhysicsModelLoadError):
        PhysicsSimulation(str(FIXTURES_DIR / "does_not_exist.xml"))


def test_init_given_malformed_mjcf_should_raise_physics_model_load_error(tmp_path):
    bad_file = tmp_path / "bad.xml"
    bad_file.write_text("<mujoco><worldbody><body></mujoco>")

    with pytest.raises(PhysicsModelLoadError):
        PhysicsSimulation(str(bad_file))


def test_step_should_advance_simulation_time_by_one_timestep():
    sim = PhysicsSimulation(str(FIXTURES_DIR / "falling_body.xml"), timestep=0.002)

    assert sim.get_time() == pytest.approx(0.0)
    sim.step()

    assert sim.get_time() == pytest.approx(0.002)


def test_get_state_after_step_should_reflect_body_falling_under_gravity():
    sim = PhysicsSimulation(str(FIXTURES_DIR / "falling_body.xml"))
    initial_z = sim.get_state().body_positions["free_body"][2]

    for _ in range(50):
        sim.step()

    later_z = sim.get_state().body_positions["free_body"][2]
    assert later_z < initial_z


def test_check_contact_given_two_bodies_not_touching_should_return_false():
    sim = PhysicsSimulation(str(FIXTURES_DIR / "falling_body.xml"))

    assert sim.check_contact("free_body", "floor_body") is False


def test_reset_should_restore_initial_state():
    sim = PhysicsSimulation(str(FIXTURES_DIR / "falling_body.xml"))
    initial_state = sim.get_state()

    for _ in range(20):
        sim.step()
    sim.reset()

    reset_state = sim.get_state()
    assert reset_state.body_positions["free_body"] == pytest.approx(
        initial_state.body_positions["free_body"]
    )
    assert sim.get_time() == pytest.approx(0.0)


def test_apply_action_should_drive_actuated_joint_toward_target():
    sim = PhysicsSimulation(str(FIXTURES_DIR / "actuated_body.xml"))
    initial_angle = sim.get_state().joint_angles["arm_joint"]

    action = ControlAction(joint_targets={"arm_joint": 0.5})
    for _ in range(1000):
        sim.apply_action(action)
        sim.step()

    final_angle = sim.get_state().joint_angles["arm_joint"]
    assert final_angle > initial_angle
    assert final_angle == pytest.approx(0.5, abs=0.15)


def test_apply_action_given_unknown_joint_should_silently_skip():
    sim = PhysicsSimulation(str(FIXTURES_DIR / "actuated_body.xml"))

    action = ControlAction(joint_targets={"nonexistent_joint": 1.0})
    sim.apply_action(action)
    sim.step()


def test_get_center_of_mass_should_return_three_floats():
    sim = PhysicsSimulation(str(FIXTURES_DIR / "falling_body.xml"))

    com = sim.get_center_of_mass()

    assert len(com) == 3
    assert all(isinstance(v, float) for v in com)


def test_get_joint_velocities_should_return_dict_of_floats():
    sim = PhysicsSimulation(str(FIXTURES_DIR / "actuated_body.xml"))
    sim.step()

    velocities = sim.get_joint_velocities()

    assert isinstance(velocities, dict)
    assert "arm_joint" in velocities
    assert isinstance(velocities["arm_joint"], float)


def test_get_active_contacts_should_return_empty_list_when_no_contacts():
    sim = PhysicsSimulation(str(FIXTURES_DIR / "falling_body.xml"))

    contacts = sim.get_active_contacts()

    assert isinstance(contacts, list)


def test_ensure_scene_xml_given_no_existing_scene_should_generate_one(tmp_path):
    model_dir = tmp_path / "unitree_g1" / "1"
    model_dir.mkdir(parents=True)
    model_file = model_dir / "model.mjcf"
    model_file.write_text("<mujoco/>")

    scene_path = ensure_scene_xml(str(model_file))

    assert Path(scene_path).exists()
    assert Path(scene_path).name == "model.scene.xml"
    content = Path(scene_path).read_text()
    assert 'include file="model.mjcf"' in content
    assert "groundplane" in content


def test_ensure_scene_xml_given_existing_scene_should_return_it(tmp_path):
    model_dir = tmp_path / "unitree_g1" / "1"
    model_dir.mkdir(parents=True)
    model_file = model_dir / "model.mjcf"
    model_file.write_text("<mujoco/>")
    scene_file = model_dir / "scene.xml"
    scene_file.write_text("<mujoco>custom</mujoco>")

    scene_path = ensure_scene_xml(str(model_file))

    assert Path(scene_path).read_text() == "<mujoco>custom</mujoco>"
