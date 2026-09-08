"""Signal generators for simulated robot telemetry."""

import math
import random
import time
from dataclasses import dataclass, field


@dataclass
class SignalState:
    """Mutable state that drifts over time to produce realistic-looking signals."""

    num_joints: int = 12
    _joint_offsets: list[float] = field(default_factory=list)
    _battery_charge: float = 95.0
    _start_time: float = field(default_factory=time.time)

    def __post_init__(self) -> None:
        self._joint_offsets = [random.uniform(-0.3, 0.3) for _ in range(self.num_joints)]

    def _elapsed(self) -> float:
        return time.time() - self._start_time


def generate_motor_telemetry(state: SignalState) -> dict:
    t = state._elapsed()
    positions = []
    velocities = []
    torques = []
    temps = []
    for i in range(state.num_joints):
        freq = 0.2 + i * 0.05
        pos = math.sin(t * freq + state._joint_offsets[i]) * 1.2
        vel = math.cos(t * freq + state._joint_offsets[i]) * freq * 1.2
        torque = vel * (3.0 + random.gauss(0, 0.2))
        temp = 35.0 + abs(torque) * 2.5 + random.gauss(0, 0.5)
        positions.append(round(pos, 4))
        velocities.append(round(vel, 4))
        torques.append(round(torque, 3))
        temps.append(round(temp, 1))
    return {
        "joint_positions": positions,
        "joint_velocities": velocities,
        "joint_torques": torques,
        "motor_temps": temps,
    }


def generate_imu(state: SignalState) -> dict:
    t = state._elapsed()
    return {
        "accel_x": round(random.gauss(0, 0.1), 4),
        "accel_y": round(random.gauss(0, 0.1), 4),
        "accel_z": round(9.81 + random.gauss(0, 0.05), 4),
        "gyro_x": round(math.sin(t * 0.1) * 0.02 + random.gauss(0, 0.005), 5),
        "gyro_y": round(math.cos(t * 0.15) * 0.015 + random.gauss(0, 0.005), 5),
        "gyro_z": round(random.gauss(0, 0.003), 5),
        "orient_w": round(math.cos(t * 0.05) * 0.999, 5),
        "orient_x": round(math.sin(t * 0.05) * 0.01, 5),
        "orient_y": round(random.gauss(0, 0.005), 5),
        "orient_z": round(random.gauss(0, 0.005), 5),
    }


def generate_battery(state: SignalState) -> dict:
    state._battery_charge = max(5.0, state._battery_charge - random.uniform(0.001, 0.005))
    voltage = 48.0 * (state._battery_charge / 100.0) + random.gauss(0, 0.1)
    current = random.uniform(2.0, 8.0)
    return {
        "voltage": round(voltage, 2),
        "current": round(current, 2),
        "charge_pct": round(state._battery_charge, 2),
        "power_watts": round(voltage * current, 1),
    }


FAULT_CODES = [
    ("OVERTEMP_JOINT", "critical", "Joint motor temperature exceeded 85°C"),
    ("OVERCURRENT", "critical", "Motor driver overcurrent detected"),
    ("JOINT_LIMIT", "warn", "Joint approaching mechanical limit"),
    ("COMMS_TIMEOUT", "warn", "Sensor bus communication timeout"),
    ("LOW_BATTERY", "warn", "Battery charge below 15%"),
    ("IMU_DRIFT", "warn", "IMU calibration drift detected"),
]


def maybe_generate_fault(state: SignalState, probability: float) -> dict | None:
    if random.random() > probability:
        return None
    code, severity, message = random.choice(FAULT_CODES)
    return {
        "fault_code": code,
        "fault_severity": severity,
        "fault_message": message,
    }
