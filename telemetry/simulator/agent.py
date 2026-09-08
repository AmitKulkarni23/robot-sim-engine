"""Edge agent simulator — publishes MQTT telemetry to AWS IoT Core."""

import argparse
import json
import logging
import ssl
import time
from pathlib import Path

import paho.mqtt.client as mqtt
import yaml

from signals import SignalState, generate_battery, generate_imu, generate_motor_telemetry, maybe_generate_fault

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
log = logging.getLogger("agent")


def load_config(path: str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def build_tls_context(certs_dir: Path, tenant_id: str) -> ssl.SSLContext:
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.load_verify_locations(str(certs_dir / "AmazonRootCA1.pem"))
    ctx.load_cert_chain(
        certfile=str(certs_dir / f"{tenant_id}.cert.pem"),
        keyfile=str(certs_dir / f"{tenant_id}.private.key"),
    )
    return ctx


def connect(endpoint: str, tenant_id: str, certs_dir: Path) -> mqtt.Client:
    client_id = f"{tenant_id}-edge-agent"
    client = mqtt.Client(client_id=client_id, protocol=mqtt.MQTTv311)
    tls_ctx = build_tls_context(certs_dir, tenant_id)
    client.tls_set_context(tls_ctx)

    def on_connect(c, userdata, flags, rc):
        if rc == 0:
            log.info("Connected: tenant=%s", tenant_id)
        else:
            log.error("Connect failed: tenant=%s rc=%d", tenant_id, rc)

    def on_disconnect(c, userdata, rc):
        log.warning("Disconnected: tenant=%s rc=%d", tenant_id, rc)

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.connect(endpoint, port=8883, keepalive=60)
    client.loop_start()
    return client


def run_tenant(endpoint: str, tenant_id: str, robots: list[str], certs_dir: Path, config: dict) -> None:
    client = connect(endpoint, tenant_id, certs_dir)
    batch_interval = config["publish"]["batch_interval_sec"]
    fault_prob = config["publish"]["fault_probability"]
    num_joints = config["signals"]["num_joints"]

    states = {robot_id: SignalState(num_joints=num_joints) for robot_id in robots}

    log.info("Simulator running: tenant=%s robots=%s interval=%ds", tenant_id, robots, batch_interval)

    try:
        while True:
            for robot_id, state in states.items():
                telemetry_topic = f"dt/{tenant_id}/{robot_id}/telemetry"
                fault_topic = f"dt/{tenant_id}/{robot_id}/fault"

                payload = {
                    "timestamp_ms": int(time.time() * 1000),
                    "tenant_id": tenant_id,
                    "robot_id": robot_id,
                    "motor": generate_motor_telemetry(state),
                    "imu": generate_imu(state),
                    "battery": generate_battery(state),
                }
                client.publish(telemetry_topic, json.dumps(payload), qos=1)
                log.debug("Published telemetry: %s/%s", tenant_id, robot_id)

                fault = maybe_generate_fault(state, fault_prob)
                if fault:
                    fault["timestamp_ms"] = int(time.time() * 1000)
                    fault["tenant_id"] = tenant_id
                    fault["robot_id"] = robot_id
                    client.publish(fault_topic, json.dumps(fault), qos=1)
                    log.warning("FAULT published: %s/%s %s", tenant_id, robot_id, fault["fault_code"])

            time.sleep(batch_interval)
    except KeyboardInterrupt:
        log.info("Stopping tenant=%s", tenant_id)
    finally:
        client.loop_stop()
        client.disconnect()


def main() -> None:
    parser = argparse.ArgumentParser(description="Robot edge agent simulator")
    parser.add_argument("--tenant", required=True, help="Tenant ID to simulate")
    parser.add_argument("--endpoint", required=True, help="AWS IoT Core endpoint")
    parser.add_argument("--config", default=str(Path(__file__).parent / "config.yaml"))
    parser.add_argument("--certs-dir", default=str(Path(__file__).resolve().parent.parent / "certs"))
    args = parser.parse_args()

    config = load_config(args.config)
    tenant_cfg = next((t for t in config["tenants"] if t["id"] == args.tenant), None)
    if not tenant_cfg:
        log.error("Tenant '%s' not found in config", args.tenant)
        raise SystemExit(1)

    run_tenant(args.endpoint, args.tenant, tenant_cfg["robots"], Path(args.certs_dir), config)


if __name__ == "__main__":
    main()
