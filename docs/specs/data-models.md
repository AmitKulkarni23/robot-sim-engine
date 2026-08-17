# Data Models

Living document. Updated by task specs as tables and schemas are implemented.

## DynamoDB Tables

### Scenarios

- **Table name**: `robot-sim-scenarios`
- **Partition key**: `scenarioId` (string)
- **Sort key**: `version` (number) — multiple versions of the same scenario coexist
- **Billing mode**: `PAY_PER_REQUEST`
- **GSI — `StatusIndex`**:
  - Partition key: `status` (string: `draft` | `published` | `archived`)
  - Sort key: `updatedAt` (string, ISO8601)
  - Purpose: list published scenarios by recency
- **Removal policy**: `DESTROY` in dev context, `DESTROY`/`RETAIN` per environment context (see infra stack `environment` prop)

### SimulationResults

- **Table name**: `robot-sim-simulation-results`
- **Partition key**: `runId` (string, UUID)
- **Billing mode**: `PAY_PER_REQUEST`
- **GSI — `ScenarioRunsIndex`**:
  - Partition key: `scenarioId` (string)
  - Sort key: `startedAt` (string, ISO8601)
  - Purpose: query results per scenario in chronological order
- **Streams**: enabled, `NEW_AND_OLD_IMAGES` — stream ARN exported via `CfnOutput` (`RobotSimResultsTableStreamArn`) for a future fleet-layer consumer
- **Removal policy**: `DESTROY` in dev context, `RETAIN` in prod context

Both tables' names and ARNs are exported via `CfnOutput` (`RobotSimScenariosTableName`, `RobotSimScenariosTableArn`, `RobotSimResultsTableName`, `RobotSimResultsTableArn`).

## S3 Buckets / Object Layout

### video-replays

- **Bucket name**: `robot-sim-video-replays-{account}-{region}`
- **Access**: `BLOCK_ALL` public access — written by the Lambda simulator (task 010), read via signed URLs generated server-side
- **Key prefix convention**: `{scenarioId}/{runId}/replay.mp4`
- **Lifecycle**: objects older than 90 days transition to `INFREQUENT_ACCESS`

### robot-models

- **Bucket name**: `robot-sim-robot-models-{account}-{region}`
- **Access**: `BLOCK_ALL` public access
- **Versioning**: enabled — cached MuJoCo Menagerie assets can be rolled back if an upstream asset changes
- **Key prefix convention**: `{modelName}/{version}/model.mjcf` (e.g. `unitree_g1/1.0.0/model.mjcf`)

### site-packs

- **Bucket name**: `robot-sim-site-packs-{account}-{region}`
- **Access**: `BLOCK_ALL` public access
- **Versioning**: enabled — site packs are the customer-specific extension mechanism (new customer = new pack, zero engine changes) and must be individually versioned/rollback-able
- **Key prefix convention**: `{customerId}/{packVersion}/`

All three buckets' names and ARNs are exported via `CfnOutput` (e.g. `RobotSimVideoReplaysBucketName`, `RobotSimVideoReplaysBucketArn`, and equivalents for `RobotModels`/`SitePacks`). Removal policy is `DESTROY` in dev context, `RETAIN` in prod context; no CORS configuration — access is exclusively via the Lambda handler (server-side SDK calls) and signed URLs, never direct browser uploads.
