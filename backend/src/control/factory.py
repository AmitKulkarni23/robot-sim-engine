"""Factory for instantiating a registered `RobotController` by name."""
from __future__ import annotations

from .base import RobotController
from .models import UnknownControllerError
from .stand_still import StandStillController

_REGISTRY: dict[str, type[RobotController]] = {
    "stand_still": StandStillController,
}


def load_controller(controller_name: str) -> RobotController:
    controller_cls = _REGISTRY.get(controller_name)
    if controller_cls is None:
        raise UnknownControllerError(f"Unknown controller: {controller_name!r}")
    return controller_cls()
