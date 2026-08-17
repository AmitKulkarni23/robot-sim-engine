"""Thin wrapper around `mujoco.MjModel`/`MjData` -- the "laws of nature" layer.

Assumes `MUJOCO_GL=osmesa` has already been set at the process/container
level before `mujoco` is imported (see task 010's Dockerfile) -- this class
never attempts to set it itself.
"""
from __future__ import annotations

import numpy as np

import mujoco

from .models import PhysicsModelLoadError, SimState


class PhysicsSimulation:
    def __init__(self, model_path: str, timestep: float = 0.002) -> None:
        self._timestep = timestep
        try:
            self._model = mujoco.MjModel.from_xml_path(model_path)
        except Exception as exc:  # mujoco raises its own C-extension errors
            raise PhysicsModelLoadError(
                f"Failed to load MJCF model at {model_path!r}: {exc}"
            ) from exc

        self._model.opt.timestep = timestep
        self._data = mujoco.MjData(self._model)
        mujoco.mj_forward(self._model, self._data)
        self._initial_qpos = self._data.qpos.copy()
        self._initial_qvel = self._data.qvel.copy()
        self._steps_taken = 0
        self._renderer: mujoco.Renderer | None = None

    def step(self) -> None:
        """Advance the simulation by exactly one `timestep`."""
        mujoco.mj_step(self._model, self._data)
        self._steps_taken += 1

    def get_time(self) -> float:
        """Simulated elapsed time in seconds."""
        return self._steps_taken * self._timestep

    def reset(self) -> None:
        """Restore the simulation to its initial (as-loaded) state."""
        mujoco.mj_resetData(self._model, self._data)
        self._data.qpos[:] = self._initial_qpos
        self._data.qvel[:] = self._initial_qvel
        mujoco.mj_forward(self._model, self._data)
        self._steps_taken = 0

    def get_state(self) -> SimState:
        """Current body positions/orientations and joint angles."""
        body_positions: dict[str, tuple[float, float, float]] = {}
        body_orientations: dict[str, tuple[float, float, float, float]] = {}
        for body_id in range(self._model.nbody):
            name = mujoco.mj_id2name(self._model, mujoco.mjtObj.mjOBJ_BODY, body_id)
            if not name:
                continue
            pos = self._data.xpos[body_id]
            quat = self._data.xquat[body_id]
            body_positions[name] = (float(pos[0]), float(pos[1]), float(pos[2]))
            body_orientations[name] = (
                float(quat[0]),
                float(quat[1]),
                float(quat[2]),
                float(quat[3]),
            )

        joint_angles: dict[str, float] = {}
        for joint_id in range(self._model.njnt):
            name = mujoco.mj_id2name(self._model, mujoco.mjtObj.mjOBJ_JOINT, joint_id)
            if not name:
                continue
            qpos_addr = self._model.jnt_qposadr[joint_id]
            joint_angles[name] = float(self._data.qpos[qpos_addr])

        return SimState(
            body_positions=body_positions,
            body_orientations=body_orientations,
            joint_angles=joint_angles,
        )

    def render_frame(self, width: int = 640, height: int = 480) -> np.ndarray:
        """Render the current scene off-screen and return an RGB uint8 array."""
        if (
            self._renderer is None
            or self._renderer.width != width
            or self._renderer.height != height
        ):
            self._renderer = mujoco.Renderer(self._model, height=height, width=width)
        self._renderer.update_scene(self._data)
        frame = self._renderer.render()
        return np.asarray(frame, dtype=np.uint8)

    def check_contact(self, body_a: str, body_b: str) -> bool:
        """Whether two named bodies are currently in contact."""
        id_a = mujoco.mj_name2id(self._model, mujoco.mjtObj.mjOBJ_BODY, body_a)
        id_b = mujoco.mj_name2id(self._model, mujoco.mjtObj.mjOBJ_BODY, body_b)
        if id_a == -1 or id_b == -1:
            return False

        for i in range(self._data.ncon):
            contact = self._data.contact[i]
            geom1_body = int(self._model.geom_bodyid[contact.geom1])
            geom2_body = int(self._model.geom_bodyid[contact.geom2])
            if {geom1_body, geom2_body} == {id_a, id_b}:
                return True
        return False

    def set_body_position(
        self,
        body_name: str,
        position: tuple[float, float, float],
        orientation: tuple[float, float, float, float] = (1.0, 0.0, 0.0, 0.0),
    ) -> None:
        """Set a free-jointed body's initial position/orientation (qpos).

        Silently no-ops for unknown body names or bodies without a free
        joint -- callers apply scenario object placements best-effort.
        """
        body_id = mujoco.mj_name2id(self._model, mujoco.mjtObj.mjOBJ_BODY, body_name)
        if body_id == -1:
            return
        joint_adr = self._model.body_jntadr[body_id]
        if joint_adr < 0:
            return
        qpos_adr = self._model.jnt_qposadr[joint_adr]
        self._data.qpos[qpos_adr : qpos_adr + 3] = position
        self._data.qpos[qpos_adr + 3 : qpos_adr + 7] = orientation
        mujoco.mj_forward(self._model, self._data)
        self._initial_qpos = self._data.qpos.copy()
