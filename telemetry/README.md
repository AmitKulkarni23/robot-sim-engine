# Telemetry Pipeline Demo

End-to-end demo: simulated robot edge agents → MQTT/mTLS → AWS IoT Core → Timestream + S3 + SNS → Grafana dashboards.

**Tenants**: Schaeffler, SAP, Siemens, Bosch (4 concurrent simulators, 2 robots each)

## Architecture

```
Python Agent ──MQTT/mTLS──→ AWS IoT Core ──Rules Engine──→ Timestream (hot store)
(per tenant)                  (X.509 cert)                 → S3 (raw archive)
                                                           → SNS (fault alerts)
                                                                    ↓
                              Local Grafana (Docker) ←── Timestream data source
```

## Prerequisites

- AWS CLI configured with credentials
- Docker (for Grafana)
- Python 3.10+
- Bun (for CDK)
- CDK bootstrapped in your account (`bunx cdk bootstrap`)

## Quick Start

```bash
# 1. Setup — deploys CDK stack, creates IoT certs, downloads root CA
./scripts/setup.sh

# 2. Run — starts Grafana + 4 tenant simulators
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
| Timestream DB | `robot-sim-telemetry` |
| Timestream table | `telemetry` (1h hot, 1d magnetic) |
| S3 bucket | `robot-sim-telemetry-archive-{account}-{region}` |
| SNS topic | `robot-sim-fault-alerts` |
| IoT rules | `robot_sim_telemetry_to_timestream`, `robot_sim_telemetry_to_s3`, `robot_sim_fault_to_sns` |
| IoT things | `robot-sim-{tenant}` (4 things) |
| IoT policies | `robot-sim-{tenant}-policy` (4 policies) |

## Optional: Email Alerts

After setup, subscribe an email to fault alerts:

```bash
TOPIC_ARN=$(aws sns list-topics --query 'Topics[?contains(TopicArn, `robot-sim-fault-alerts`)].TopicArn' --output text)
aws sns subscribe --topic-arn "$TOPIC_ARN" --protocol email --notification-endpoint your@email.com
```
