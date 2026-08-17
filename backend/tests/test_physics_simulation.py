from pathlib import Path

import numpy as np
import pytest

from physics.models import PhysicsModelLoadError
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


def test_render_frame_should_return_rgb_array_of_requested_dimensions():
    sim = PhysicsSimulation(str(FIXTURES_DIR / "falling_body.xml"))

    frame = sim.render_frame(width=320, height=240)

    assert frame.shape == (240, 320, 3)
    assert frame.dtype == np.uint8


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
