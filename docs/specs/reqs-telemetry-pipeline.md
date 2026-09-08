# Functional Requirements — Telemetry Pipeline Demo

**Purpose**: Demonstrate end-to-end telemetry flow from simulated robot edge agents to cloud, in a multi-tenant setup with per-tenant isolation, storage, alerting, and dashboards. Runs locally against real AWS. Tearable.

**Tenants**: Schaeffler, SAP, Siemens, Bosch

---

## FR-1: Edge Agent Simulator

- Python process using `paho-mqtt` to publish MQTT messages to AWS IoT Core
- 4 concurrent processes — one per tenant
- Each tenant simulates 2 robots (configurable)
- Telemetry batched every 1–5 seconds (configurable)
- Fault events sent immediately (not batched)

### Telemetry signals

| Signal group     | Fields                                                       | Unit / range         |
|------------------|--------------------------------------------------------------|----------------------|
| Motor telemetry  | joint_positions[12], joint_velocities[12], joint_torques[12], motor_temps[12] | rad, rad/s, Nm, °C |
| IMU / pose       | accel_xyz[3], gyro_xyz[3], orientation_quat[4]               | m/s², rad/s, unitless |
| Battery / power  | voltage, current, charge_pct, power_watts                    | V, A, %, W          |
| Fault events     | fault_code, fault_severity (warn/critical), fault_message    | enum, string         |

### MQTT topic structure

- Telemetry: `dt/{tenant_id}/{robot_id}/telemetry`
- Faults: `dt/{tenant_id}/{robot_id}/fault`
- `dt` prefix = device telemetry (AWS IoT convention)

## FR-2: IoT Core — Authentication & Tenant Isolation

- X.509 certificate per tenant (mTLS required by IoT Core — no unauthenticated option)
- IoT policy per tenant scopes publish/subscribe to `dt/{tenant_id}/#` only
- Setup script generates certs, attaches policies, stores PEM files locally
- Teardown script revokes certs, detaches policies, deletes things

## FR-3: IoT Core Rules Engine

Three IoT rules triggered by topic filter:

### Rule 1 — Timestream write
- SQL: `SELECT * FROM 'dt/+/+/telemetry'`
- Action: Write to Amazon Timestream table
- Dimensions: tenant_id, robot_id (extracted from topic)

### Rule 2 — S3 archive
- SQL: `SELECT * FROM 'dt/+/+/telemetry'`
- Action: Write to S3 bucket, key pattern: `{tenant_id}/{robot_id}/{timestamp}.json`

### Rule 3 — SNS fault alert
- SQL: `SELECT * FROM 'dt/+/+/fault'` (separate topic — faults only)
- Action: Publish to SNS topic
- One SNS topic, message includes tenant_id for downstream filtering

## FR-4: Amazon Timestream

- Database: `robot-sim-telemetry`
- Table: `telemetry`
- Hot tier: 1 hour (in-memory)
- Magnetic tier: 1 day
- Dimensions: tenant_id, robot_id, signal_group
- Measures: multi-measure records per signal group

## FR-5: S3 Archive

- Bucket: `robot-sim-telemetry-archive-{account}-{region}`
- Key pattern: `raw/{tenant_id}/{robot_id}/{year}/{month}/{day}/{timestamp}.json`
- Lifecycle: none (demo teardown deletes bucket)

## FR-6: SNS Fault Alerts

- Topic: `robot-sim-fault-alerts`
- Email subscription added via setup script (operator email as input)
- Message includes: tenant_id, robot_id, fault_code, fault_severity, fault_message, timestamp

## FR-7: Grafana Dashboards (Local Docker)

- Local Grafana via docker-compose (no AWS Managed Grafana — avoids SSO complexity)
- Timestream data source configured via provisioning
- Per-tenant dashboard with:
  - Motor temperature heatmap
  - Joint position/velocity time series
  - Battery charge gauge
  - IMU orientation plot
  - Fault event log/table
- Tenant selector variable (dropdown) filters all panels

## FR-8: Infrastructure as Code

- New CDK stack: `TelemetryPipelineStack` in `infra/lib/`
- Creates: IoT rules, Timestream database+table, S3 archive bucket, SNS topic
- IoT things/certs/policies handled by setup script (not CDK — certs need PEM files on disk)
- Stack added to `infra/bin/robot-sim.ts`

## FR-9: Setup & Teardown

### Setup (`telemetry/scripts/setup.sh`)
1. `bunx cdk deploy TelemetryPipelineStack`
2. Create IoT things + certs + policies per tenant
3. Download root CA cert
4. Print IoT endpoint
5. Prompt for SNS email subscription

### Teardown (`telemetry/scripts/teardown.sh`)
1. Revoke + delete IoT certs, detach + delete policies, delete things
2. `bunx cdk destroy TelemetryPipelineStack`
3. Remove local cert files

### Run (`telemetry/scripts/run.sh`)
1. Start docker-compose (Grafana)
2. Launch 4 simulator processes
3. Ctrl+C stops all

## Non-goals

- No frontend UI (existing React app untouched)
- No Lambda in the telemetry path
- No Kinesis, Flink, or Greengrass
- Not production-grade — demo only
- No data encryption at rest beyond AWS defaults

## Directory Structure

```
telemetry/
├── simulator/          # Python edge agent
│   ├── agent.py        # Main simulator
│   ├── signals.py      # Signal generators
│   ├── requirements.txt
│   └── config.yaml     # Tenant/robot config
├── grafana/
│   ├── docker-compose.yml
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── timestream.yml
│   │   └── dashboards/
│   │       ├── dashboard.yml
│   │       └── telemetry.json
├── scripts/
│   ├── setup.sh
│   ├── teardown.sh
│   └── run.sh
├── certs/              # Generated, gitignored
└── README.md
```

CDK stack lives in `infra/lib/telemetry-pipeline-stack.ts`.
