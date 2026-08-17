# Architecture

Living document. Updated by task specs as components are deployed.

## Deployed Topology

_None implemented yet._

## Lambda Functions

### RobotSimSimulator

- **Type**: `lambda.DockerImageFunction` — container image built from `backend/` (Dockerfile provided by task 010)
- **Memory**: 3008 MB
- **Timeout**: 5 minutes — physics simulation + video encoding is compute- and time-intensive
- **Log retention**: `ONE_MONTH`
- **Environment variables**:
  - `SCENARIOS_TABLE_NAME_ENV`
  - `RESULTS_TABLE_NAME_ENV`
  - `VIDEO_BUCKET_NAME_ENV`
  - `MODELS_BUCKET_NAME_ENV`
  - `SITE_PACKS_BUCKET_NAME_ENV`
- **IAM grants**: read/write on both DynamoDB tables (Scenarios, SimulationResults); read/write on `video-replays` bucket; read-only on `robot-models` and `site-packs` buckets
- **Trigger**: Function URL (currently disabled). When re-enabled, will use `authType: NONE` with a shared-secret header (`X-Webhook-Secret`) validated in the Lambda handler. Invoked by CI webhooks, manual API calls, or scheduled triggers.
- **Output**: Function URL exported via `CfnOutput` (`RobotSimSimulatorFunctionUrl`)
