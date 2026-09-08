# Architecture

Living document. Updated as components are deployed.

## Deployed Topology

Three CDK stacks, wired in `infra/bin/robot-sim.ts`:

1. **RobotSimDataStack** — DynamoDB tables + S3 buckets (persistence layer)
2. **RobotSimComputeStack** — Lambda container image (simulation engine + HTTP API)
3. **RobotSimTriggerStack** — DynamoDB Streams event source + SQS DLQ (auto-run on queue)

Frontend is a React + MUI app deployed on Vercel (`frontend/`).

## Lambda Functions

### RobotSimSimulator

- **Type**: `lambda.DockerImageFunction` — container image built from `backend/` (`public.ecr.aws/lambda/python:3.12` base, OSMesa + MuJoCo native deps)
- **Memory**: 3008 MB
- **Timeout**: 5 minutes
- **Reserved concurrency**: 3
- **Log retention**: `ONE_MONTH`
- **Environment variables**:
  - `SCENARIOS_TABLE_NAME_ENV`
  - `RESULTS_TABLE_NAME_ENV`
  - `TELEMETRY_BUCKET_NAME_ENV`
  - `MODELS_BUCKET_NAME_ENV`
  - `SITE_PACKS_BUCKET_NAME_ENV`
  - `WEBHOOK_SECRET_PARAM_NAME_ENV` — SSM SecureString parameter name (`/robot-sim/webhook-secret`)
- **IAM grants**:
  - Read/write on Scenarios and SimulationResults DynamoDB tables
  - Read/write on telemetry bucket (presigned URL generation + upload)
  - Read/write on robot-models bucket (model download + upload)
  - Read-only on site-packs bucket
  - Read on SSM SecureString parameter (`/robot-sim/webhook-secret`)
- **Trigger (HTTP)**: Function URL with `authType: NONE`, authenticated via `X-Webhook-Secret` header validated in Lambda handler. CORS configured for Vercel frontend origin (`https://frontend-two-delta-84.vercel.app`), allowing `GET`/`POST` with `Content-Type` and `x-webhook-secret` headers.
- **Trigger (Stream)**: DynamoDB Streams event source from Scenarios table, filtered to `MODIFY` events where status changes to `queued`. Batch size 1, 2 retries, failures sent to SQS DLQ (`robot-sim-trigger-dlq`).
- **Output**: Function URL exported via `CfnOutput` (`RobotSimFunctionUrl`)

## API Routes

All routes require `X-Webhook-Secret` header (except `OPTIONS` and DynamoDB Stream events).

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `GET` | `/runs` | `_handle_get_runs` | List simulation runs (scan, limit 100, sorted by timestamp desc) |
| `GET` | `/runs/{runId}` | `_handle_get_run` | Get single run detail |
| `GET` | `/runs/{runId}/telemetry` | `_handle_get_telemetry` | Get presigned S3 URL for telemetry JSON |
| `GET` | `/scenarios` | `_handle_get_scenarios` | List all scenarios |
| `GET` | `/scenarios/{scenarioId}` | `_handle_get_scenario` | Get latest version of a scenario (including YAML) |
| `POST` | `/scenarios` | `_handle_create_scenario` | Create scenario from YAML (validated, stored as `draft`) |
| `POST` | `/scenarios/{scenarioId}/run` | `_handle_queue_scenario` | Set scenario status to `queued` (triggers stream → simulation) |
| `POST` | `/` | `_handle_simulate` | Direct simulation trigger (requires `scenario_id` + `version` in body) |

## Stream Processing

When a scenario's status changes to `queued` (via DynamoDB Streams → Lambda event source):
1. Lambda runs the simulation (`_handle_stream_event`)
2. Results written to SimulationResults table
3. Telemetry uploaded to S3 (`{scenarioId}/{runId}/telemetry.json`)
4. Scenario status updated to `completed`

## Frontend

- **Framework**: React 18 + TypeScript + Material UI, Vite bundler
- **Deployment**: Vercel
- **API proxy**: `/api` prefix proxied to Lambda Function URL
- **Pages**: Runs, Scenarios (browser + editor), Factory Floor, Code Diff
- **Telemetry**: Frontend fetches presigned S3 URL from `/runs/{runId}/telemetry`, then fetches JSON directly from S3

## Telemetry Pipeline (Demo)

Standalone multi-tenant IoT telemetry demo in `telemetry/`. Not connected to the main simulation engine — separate CDK stack.

4. **TelemetryPipelineStack** — S3 archive bucket, SNS fault alerts topic, 2 IoT Core rules

### Data Flow

```
Python agent (paho-mqtt) ──MQTT/mTLS──→ IoT Core ──Rules──→ S3 (raw JSON archive)
(4 tenants × 2 robots)     (X.509)                        → SNS (fault alerts)
     │
     └──HTTP──→ Local InfluxDB (Docker, 2h retention) ←── Grafana (Docker)
```

### Components

| Component | Location |
|-----------|----------|
| CDK stack | `infra/lib/telemetry-pipeline-stack.ts` |
| Python simulator | `telemetry/simulator/` |
| Grafana (Docker) | `telemetry/grafana/` |
| Lifecycle scripts | `telemetry/scripts/{setup,run,teardown}.sh` |
| IoT certs (generated) | `telemetry/certs/` (gitignored) |
