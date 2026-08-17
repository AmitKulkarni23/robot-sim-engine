# Task 011: Wire Frontend to Backend

## Summary

Replace mock data in the frontend API layer with real calls to AWS. The frontend currently uses hardcoded `MOCK_RUNS` and `MOCK_SCENARIOS` arrays. This task connects the dashboard to live DynamoDB data via an API layer.

## Current State

### What the backend writes to DynamoDB (`simulation-results` table):
```json
{
  "run_id": "uuid",
  "scenario_id": "box-pickup-standard-5kg",
  "started_at": "2026-08-16T12:00:00Z",
  "success": true,
  "duration_s": 9.1,
  "failures": "[\"timed out after 30s\"]",
  "violations": "[\"robot fell over\"]",
  "video_uri": "s3://robot-sim-video-replays-.../replay.mp4"
}
```

### What the frontend expects (Run type):
```typescript
{
  id, scenarioId, scenarioName, verdict, verdictReason,
  timestamp, buildNumber, robotModel, durationSeconds,
  stepsSimulated, failureAt, keyMetricLabel,
  keyMetricDeltaDirection, metrics[], violations[]
}
```

### Gap Analysis

| Frontend field | Backend source | Status |
|----------------|---------------|--------|
| id | run_id | Exists |
| scenarioId | scenario_id | Exists |
| scenarioName | — | **Missing** — must join with scenarios table |
| verdict | derived from `success` | Needs mapping (true→pass, false→fail) |
| verdictReason | — | **Missing** — must be computed from failures |
| timestamp | started_at | Exists |
| buildNumber | — | **Missing** — not tracked by backend |
| robotModel | — | **Missing** — exists in scenario, not in result |
| durationSeconds | duration_s | Exists |
| stepsSimulated | — | **Missing** — not tracked by backend |
| metrics[] | — | **Missing** — backend only tracks pass/fail, no metrics |
| violations[] | violations (string[]) | Exists but format differs (strings vs objects) |
| video_uri | video_uri | Exists but frontend has no video player yet |

## Implementation Plan

### Phase 1: Backend API Endpoints (new Lambda or API Gateway)

The simulation Lambda is a **write** path — it runs sims and writes results. The dashboard needs a **read** path. Options:

**Option A (recommended): Add read endpoints to the same Lambda handler.**
- `GET /runs` — query `ScenarioRunsIndex` GSI, return latest N runs
- `GET /runs/{runId}` — get single run by ID
- `GET /scenarios` — query `StatusIndex` GSI, return all scenarios
- Requires re-enabling the Function URL with CORS for the dashboard origin

**Option B: Separate read Lambda.**
- Dedicated Lambda for dashboard queries
- More infrastructure but cleaner separation

### Phase 2: Enrich Backend Output

The backend `RunResult` needs to emit richer data. Update `harness/runner.py` and `handler.py`:

1. **Add `metrics` to `RunResult`** — track named metrics (grip force, energy, cycle time) during simulation
2. **Add `buildNumber`** — accept from webhook payload or derive from git SHA
3. **Add `stepsSimulated`** — already available from `PhysicsSimulation._steps_taken`
4. **Add structured violations** — change from `list[str]` to `list[dict]` with severity, title, description, timeLabel
5. **Store `robotModel` and `scenarioName`** in results table for denormalized reads
6. **Compute `verdictReason`** — derive from failures/violations list

### Phase 3: Frontend API Layer

Replace `frontend/src/api/runs.ts` and `frontend/src/api/scenarios.ts`:

1. Add environment variable for API base URL (`VITE_API_URL`)
2. Replace `MOCK_RUNS` with `fetch()` calls to the read endpoints
3. Replace `MOCK_SCENARIOS` with `fetch()` calls
4. Add error handling and loading states (already have loading state in `useRuns` hook)

### Phase 4: DynamoDB Key Name Fix

**Bug**: CDK table defines keys as `scenarioId` (camelCase) and `startedAt`, but the Lambda handler writes `scenario_id` (snake_case) and `started_at`. Pick one convention and align both sides.

## Environment Variables & Secrets Required

### GitHub Repository Secrets (for simulate.yml workflow)
| Secret | Value | Where to set |
|--------|-------|-------------|
| `SIMULATOR_FUNCTION_URL` | Lambda Function URL (from CDK output) | GitHub → Settings → Secrets |
| `SIMULATOR_WEBHOOK_SECRET` | Shared secret string (you generate) | GitHub → Settings → Secrets |

### Lambda Environment Variables (set in CDK stack)
| Env var | Value | Already set? |
|---------|-------|-------------|
| `SCENARIOS_TABLE_NAME_ENV` | robot-sim-scenarios | Yes |
| `RESULTS_TABLE_NAME_ENV` | robot-sim-simulation-results | Yes |
| `VIDEO_BUCKET_NAME_ENV` | robot-sim-video-replays-{account}-{region} | Yes |
| `MODELS_BUCKET_NAME_ENV` | robot-sim-robot-models-{account}-{region} | Yes |
| `SITE_PACKS_BUCKET_NAME_ENV` | robot-sim-site-packs-{account}-{region} | Yes |
| `WEBHOOK_SECRET_ENV` | Same shared secret as GitHub | **Not set** — must add to CDK |

### AWS Secrets Manager / Parameter Store (recommended)
| Secret | Purpose | How to use |
|--------|---------|-----------|
| `/robot-sim/webhook-secret` | Shared secret for Lambda auth | Store in SSM Parameter Store (SecureString). Reference in CDK via `ssm.StringParameter.valueForSecureStringParameter()`. Set as Lambda env var. |

### Vercel Environment Variables (for frontend)
| Env var | Value | Where to set |
|---------|-------|-------------|
| `VITE_API_URL` | Lambda Function URL (read endpoints) | Vercel → Project → Settings → Environment Variables |

## Setup Steps (in order)

1. Generate a webhook secret: `openssl rand -hex 32`
2. Store in AWS SSM Parameter Store: `aws ssm put-parameter --name /robot-sim/webhook-secret --type SecureString --value <secret>`
3. Add `WEBHOOK_SECRET_ENV` to CDK compute stack, referencing SSM parameter
4. Re-enable Function URL in CDK compute stack (with CORS for Vercel domain)
5. Deploy compute stack: `cd infra && bunx cdk deploy RobotSimComputeStack`
6. Copy Function URL from CDK output
7. Add GitHub secrets: `SIMULATOR_FUNCTION_URL` and `SIMULATOR_WEBHOOK_SECRET`
8. Add Vercel env var: `VITE_API_URL`
9. Seed scenarios: `cd backend && python scripts/seed_scenarios.py`
10. Trigger workflow: `gh workflow run simulate.yml`
