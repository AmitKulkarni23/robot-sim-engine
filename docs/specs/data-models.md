# Data Models

Living document. Updated as tables and schemas are implemented.

## DynamoDB Tables

### Scenarios

- **Table name**: `robot-sim-scenarios`
- **Partition key**: `scenarioId` (string)
- **Sort key**: `version` (number) — multiple versions of the same scenario coexist
- **Billing mode**: `PAY_PER_REQUEST`
- **Stream**: `NEW_AND_OLD_IMAGES` — consumed by RobotSimTriggerStack to auto-run simulations when status changes to `queued`
- **GSI — `StatusIndex`**:
  - Partition key: `status` (string: `draft` | `published` | `queued` | `completed` | `archived`)
  - Sort key: `updatedAt` (string, ISO8601)
  - Purpose: list scenarios by status and recency
- **Removal policy**: `DESTROY` in dev, `RETAIN` in prod

#### Scenario Item Schema

| Attribute | Type | Description |
|-----------|------|-------------|
| `scenarioId` | S | Partition key — unique scenario identifier |
| `version` | N | Sort key — version number |
| `yaml_content` | S | Raw YAML scenario definition |
| `name` | S | Human-readable name (derived from scenarioId) |
| `status` | S | `draft` → `published` → `queued` → `completed` or `archived` |
| `description` | S | Task description from YAML |
| `robotModel` | S | Robot model identifier (e.g. `unitree_g1`) |
| `updatedAt` | S | ISO8601 timestamp of last update |
| `runCount` | N | Number of simulation runs for this scenario |
| `passRate` | N | Pass rate (0.0–1.0) |

### SimulationResults

- **Table name**: `robot-sim-simulation-results`
- **Partition key**: `runId` (string, UUID)
- **Billing mode**: `PAY_PER_REQUEST`
- **Stream**: `NEW_AND_OLD_IMAGES` — stream ARN exported for future fleet-layer consumer
- **GSI — `ScenarioRunsIndex`**:
  - Partition key: `scenarioId` (string)
  - Sort key: `startedAt` (string, ISO8601)
  - Purpose: query results per scenario in chronological order
- **Removal policy**: `DESTROY` in dev, `RETAIN` in prod

#### SimulationResults Item Schema

| Attribute | Type | Description |
|-----------|------|-------------|
| `runId` | S | Partition key — UUID |
| `scenarioId` | S | Reference to scenario |
| `scenarioName` | S | Human-readable scenario name |
| `robotModel` | S | Robot model used |
| `startedAt` | S | ISO8601 timestamp |
| `success` | BOOL | Pass/fail verdict |
| `durationS` | N | Simulation duration in seconds |
| `stepsSimulated` | N | Number of physics steps |
| `buildNumber` | N | Build number from trigger |
| `failures` | S | JSON array of failure messages |
| `violations` | S | JSON array of violation objects (`{id, severity, title, description, timeLabel}`) |
| `metrics` | S | JSON array of metric objects (`{name, unit, current, previous, deltaPct, status}`) |
| `telemetryUri` | S | S3 URI to telemetry JSON (e.g. `s3://bucket/{scenarioId}/{runId}/telemetry.json`) |

Both tables' names, ARNs, and stream ARNs are exported via `CfnOutput`.

## SQS Queues

### robot-sim-trigger-dlq

- **Queue name**: `robot-sim-trigger-dlq`
- **Retention**: 14 days
- **Purpose**: Dead-letter queue for failed DynamoDB Stream → Lambda trigger invocations
- **Removal policy**: `DESTROY` in dev, `RETAIN` in prod

## S3 Buckets / Object Layout

### telemetry (bucket name: `robot-sim-video-replays-{account}-{region}`)

- **Purpose**: Stores JSON telemetry output from simulations (originally designed for video replays, repurposed for telemetry data)
- **Access**: `BLOCK_ALL` public access
- **CORS**: Enabled — `GET` from all origins (`*`), all headers, max-age 3000s. Required because frontend fetches telemetry directly from S3 via presigned URLs.
- **Key prefix convention**: `{scenarioId}/{runId}/telemetry.json`
- **Content type**: `application/json`
- **Lifecycle**: Objects older than 90 days transition to `INFREQUENT_ACCESS`
- **Access pattern**: Lambda uploads telemetry JSON after simulation. Frontend requests presigned URL via `GET /runs/{runId}/telemetry`, then fetches JSON directly from S3.

### robot-models

- **Bucket name**: `robot-sim-robot-models-{account}-{region}`
- **Access**: `BLOCK_ALL` public access
- **Versioning**: enabled
- **Key prefix convention**: `{modelName}/{version}/model.mjcf` (e.g. `unitree_g1/1.0.0/model.mjcf`), with mesh files alongside MJCF
- **IAM**: Lambda has read/write access (downloads models, uploads cached assets)

### site-packs

- **Bucket name**: `robot-sim-site-packs-{account}-{region}`
- **Access**: `BLOCK_ALL` public access
- **Versioning**: enabled
- **Key prefix convention**: `{customerId}/{packVersion}/`
- **IAM**: Lambda has read-only access

All three buckets' names and ARNs are exported via `CfnOutput`. Removal policy is `DESTROY` in dev, `RETAIN` in prod.

## Telemetry Data Model

Telemetry is recorded per-frame during simulation and uploaded as a single JSON file to S3.

```json
{
  "sample_rate_hz": 50,
  "total_duration_s": 14.3,
  "frame_count": 715,
  "frames": [
    {
      "t": 0.0,
      "joint_angles": {"left_hip_pitch_joint": 0.0, ...},
      "joint_velocities": {"left_hip_pitch_joint": 0.0, ...},
      "body_positions": {"torso": [0.0, 0.0, 0.75], ...},
      "com": [0.0, 0.0, 0.75],
      "contacts": [
        {"body_a": "left_foot", "body_b": "floor", "position": [0.0, 0.0, 0.0]}
      ]
    }
  ]
}
```
