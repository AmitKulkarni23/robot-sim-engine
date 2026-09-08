# Telemetry Pipeline Demo

End-to-end demo: simulated robot edge agents → MQTT/mTLS → AWS IoT Core → S3 + SNS (cloud), InfluxDB + Grafana (local dashboards).

**Tenants**: Schaeffler, SAP, Siemens, Bosch (4 concurrent simulators, 2 robots each)

## Architecture

```
Python Agent ──MQTT/mTLS──→ AWS IoT Core ──Rules Engine──→ S3 (raw archive)
(per tenant)    (X.509)                                   → SNS (fault alerts)
     │
     └──HTTP──→ Local InfluxDB (Docker) ←── Grafana (Docker)
               (time-series hot store)      (per-tenant dashboards)
```

The simulator dual-writes: MQTT to IoT Core (cloud path for S3 archive + SNS alerts) and HTTP to local InfluxDB (for Grafana visualization).

## Prerequisites

- AWS CLI configured with credentials
- Docker (for InfluxDB + Grafana)
- Python 3.10+
- Bun (for CDK)
- CDK bootstrapped in your account (`bunx cdk bootstrap`)

## Quick Start

```bash
# 1. Setup — deploys CDK stack, creates IoT certs, downloads root CA
./scripts/setup.sh

# 2. Run — starts InfluxDB + Grafana + 4 tenant simulators
./scripts/run.sh

# 3. Open Grafana
open http://localhost:3001
# Login: admin / demo1234
# Use tenant dropdown to switch between Schaeffler, SAP, Siemens, Bosch

# 4. Teardown — revokes certs, destroys CDK stack, cleans up
./scripts/teardown.sh
```

## MQTT Topic Structure

| Topic | Purpose |
|-------|---------|
| `dt/{tenant_id}/{robot_id}/telemetry` | Batched telemetry (every 3s) |
| `dt/{tenant_id}/{robot_id}/fault` | Fault events (immediate) |

## Telemetry Signals

| Group | Fields |
|-------|--------|
| Motor | joint_positions[12], joint_velocities[12], joint_torques[12], motor_temps[12] |
| IMU | accel_xyz, gyro_xyz, orientation_quat |
| Battery | voltage, current, charge_pct, power_watts |
| Faults | fault_code, fault_severity, fault_message |

## Tenant Isolation

Each tenant gets its own X.509 certificate and IoT policy. The policy scopes publish/subscribe to `dt/{tenant_id}/#` only — a tenant cannot read or write another tenant's topics.

## Configuration

Edit `simulator/config.yaml` to change:
- Tenant list and robot IDs
- Publish interval (default 3s)
- Fault probability (default 2%)
- Number of joints (default 12)

## AWS Resources Created

| Resource | Name/Pattern |
|----------|-------------|
| S3 bucket | `robot-sim-telemetry-archive-{account}-{region}` |
| SNS topic | `robot-sim-fault-alerts` |
| IoT rules | `robot_sim_telemetry_to_s3`, `robot_sim_fault_to_sns` |
| IoT things | `robot-sim-{tenant}` (4 things) |
| IoT policies | `robot-sim-{tenant}-policy` (4 policies) |

## Local Resources (Docker)

| Resource | Port | Purpose |
|----------|------|---------|
| InfluxDB 2.7 | 8086 | Time-series store (2h retention) |
| Grafana 11.1 | 3001 | Dashboards (admin/demo1234) |

## Optional: Email Alerts

After setup, subscribe an email to fault alerts:

```bash
TOPIC_ARN=$(aws sns list-topics --query 'Topics[?contains(TopicArn, `robot-sim-fault-alerts`)].TopicArn' --output text)
aws sns subscribe --topic-arn "$TOPIC_ARN" --protocol email --notification-endpoint your@email.com
```
