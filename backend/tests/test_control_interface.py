import pytest

from control.base import RobotController
from control.factory import load_controller
from control.models import ControllerError, UnknownControllerError
from control.stand_still import StandStillController
from physics.models import SimState


def test_stand_still_controller_given_joint_state_should_return_matching_targets():
    controller = StandStillController()
    state = SimState(joint_angles={"hip": 0.5, "knee": -0.3})

    action = controller.compute_action(state, elapsed_time=1.0)

    assert action.joint_targets == {"hip": 0.5, "knee": -0.3}


def test_stand_still_controller_given_empty_joint_state_should_raise_controller_error():
    controller = StandStillController()
    state = SimState(joint_angles={})

    with pytest.raises(ControllerError):
        controller.compute_action(state, elapsed_time=1.0)


def test_load_controller_given_stand_still_should_return_stand_still_controller_instance():
    controller = load_controller("stand_still")

    assert isinstance(controller, StandStillController)


def test_load_controller_given_unknown_name_should_raise_unknown_controller_error():
    with pytest.raises(UnknownControllerError):
        load_controller("does_not_exist")


def test_robot_controller_cannot_be_instantiated_directly():
    with pytest.raises(TypeError):
        RobotController()
