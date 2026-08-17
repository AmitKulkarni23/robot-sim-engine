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
- **Trigger**: Function URL, `authType: NONE`, `allowedOrigins: []` — invoked server-to-server by a Supabase Database Webhook, which cannot sign AWS SigV4 requests. Because the URL has no AWS-level auth, the Lambda handler (task 010) MUST validate a shared-secret header (e.g. `X-Webhook-Secret`) on every invocation — this is an application-layer requirement, not enforced by CDK.
- **Output**: Function URL exported via `CfnOutput` (`RobotSimSimulatorFunctionUrl`)
