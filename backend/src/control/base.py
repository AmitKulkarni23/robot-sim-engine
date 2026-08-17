"""Abstract interface between the simulator and control software under test."""
from __future__ import annotations

from abc import ABC, abstractmethod

from physics.models import SimState

from .models import ControlAction


class RobotController(ABC):
    """Pure domain interface -- no MuJoCo/S3/DynamoDB knowledge."""

    @abstractmethod
    def compute_action(self, state: SimState, elapsed_time: float) -> ControlAction:
        """Compute the next control action given the current simulated state."""
        raise NotImplementedError
