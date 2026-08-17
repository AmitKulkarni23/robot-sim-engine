"""Known-models registry mapping a model name to its MuJoCo Menagerie location."""
from __future__ import annotations


class RobotModelNotFoundError(Exception):
    """Raised when a robot model name is not present in the known-models registry."""


# Per the project's hard constraint, Unitree G1 is the sole HMND 01 stand-in
# for this task -- more entries can be added here without touching
# `get_robot_model`'s signature.
KNOWN_MODELS: dict[str, dict[str, str]] = {
    "unitree_g1": {
        "menagerie_dir": "unitree_g1",
        "mjcf_filename": "g1.xml",
    },
}


def get_model_registry_entry(model_name: str) -> dict[str, str]:
    """Return the Menagerie location entry for a known model name.

    Raises `RobotModelNotFoundError` for unregistered names, before any
    network I/O is attempted.
    """
    entry = KNOWN_MODELS.get(model_name)
    if entry is None:
        raise RobotModelNotFoundError(f"Unknown robot model: {model_name!r}")
    return entry
