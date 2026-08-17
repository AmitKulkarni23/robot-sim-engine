# Task: 003 — Lambda Container Function + Function URL + IAM

## Summary

Provision the single AWS Lambda function that runs the entire simulation engine as a container image (per the project's hard constraint: "simulation runs inside a single AWS Lambda container image"), expose it via a Function URL that external trigger's Database Webhook will call, and wire minimal IAM permissions to the DynamoDB tables (task 001) and S3 buckets (task 002). Reference: README.md "Hard Constraints" (b: trigger is API call (webhook or manual) → Lambda Function URL) and CLAUDE.md Stack section.

## Read First

- `docs/specs/architecture.md` — "Lambda Functions" section, currently empty
- `docs/specs/data-models.md` — table/bucket names this function needs env vars for (populated by tasks 001–002)
- `README.md` — Hard Constraints list, item (b) and (c)

## Conventions

Read and follow the CDK convention rules in `.claude/rules/cdk-universal.rules.md` before writing any code, in particular the Lambda Definition Pattern and Function URL CORS gotcha.

## Requirements

1. The Lambda function MUST be defined using `lambda.DockerImageFunction` (or `lambda.DockerImageCode.fromImageAsset`), pointing at a Dockerfile under `backend/` (created in task 010).
2. The function MUST set memory to at least 3008 MB and timeout to at least 5 minutes — physics simulation + video encoding is compute- and time-intensive.
3. The function MUST receive environment variables (with `_ENV` suffix) for: `SCENARIOS_TABLE_NAME_ENV`, `RESULTS_TABLE_NAME_ENV`, `VIDEO_BUCKET_NAME_ENV`, `MODELS_BUCKET_NAME_ENV`, `SITE_PACKS_BUCKET_NAME_ENV`.
4. The function MUST be granted read/write access to both DynamoDB tables via `.grantReadWriteData()`.
5. The function MUST be granted read/write access to `video-replays` and read access to `robot-models` and `site-packs` buckets via `.grantReadWrite()` / `.grantRead()` respectively — the function writes replays but only reads cached models and site packs (those are written by the model-loader task and out-of-band site-pack publishing, not by this function).
6. A Function URL MUST be created with `authType: lambda.FunctionUrlAuthType.NONE` initially (External callers use a shared-secret header validated at the application layer, not via AWS IAM auth) — document this as a technical note, not a requirement gap.
7. The Function URL's CORS configuration MUST allow no origins (`allowedOrigins: []`) since it is called server-to-server by external trigger, never from a browser.
8. The Lambda's log group MUST set explicit retention: `logs.RetentionDays.ONE_MONTH`.
9. The stack MUST export the Function URL via `CfnOutput` with `exportName` `RobotSimSimulatorFunctionUrl`.

## Technical Notes

- `authType: NONE` on a public Function URL is unusual and normally flagged — it is correct here because API call (webhook or manual)s cannot sign AWS SigV4 requests. The Lambda handler (task 010) MUST validate a shared-secret header (e.g. `X-Webhook-Secret`) on every invocation; that validation is out of scope for this CDK task but MUST be noted in the acceptance criteria so it isn't forgotten.
- Container image build context is `backend/` — this task's CDK code references a directory that task 010 will populate with a `Dockerfile`. If task 010 has not yet run, `cdk synth` will fail on image build; that is expected and acceptable at this stage (document it, don't work around it with a placeholder Dockerfile).
- Create `infra/lib/robot-sim-compute-stack.ts` as a new stack, importing table/bucket references from the data stack (task 001/002) via constructor props (pass the `Table` and `Bucket` L2 construct references directly in `infra/bin/robot-sim.ts` rather than `Fn.importValue`, since both stacks deploy from the same CDK app).

## TDD Plan

N/A — CDK tasks are not tested.

## Dependencies

- `TASK-001` — needs DynamoDB table references for IAM grants and env vars
- `TASK-002` — needs S3 bucket references for IAM grants and env vars

## Files to Create/Modify

- `infra/lib/robot-sim-compute-stack.ts` (create)
- `infra/bin/robot-sim.ts` (modify — instantiate compute stack, pass data stack's tables/buckets as props)

## Acceptance Criteria

- [ ] `bunx cdk synth` succeeds with no errors (once `backend/Dockerfile` exists from task 010)
- [ ] Lambda has grantReadWriteData on both tables and correct grants on all three buckets
- [ ] Function URL created with `authType: NONE` and empty `allowedOrigins`
- [ ] Log group retention is explicitly set to one month
- [ ] Function URL exported via `CfnOutput`
- [ ] A code comment or Technical Notes entry documents that the handler (task 010) MUST validate a shared-secret header since the Function URL has no AWS-level auth

## Spec Updates

- [ ] Update `docs/specs/architecture.md` — add "Lambda Functions" entry documenting the simulator function: memory, timeout, env vars, Function URL auth model
