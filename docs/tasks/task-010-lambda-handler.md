# Task: 010 — Lambda Handler (Entry Point)

## Summary

Build the Lambda container's entry point: receive the Supabase Database Webhook payload, load the target scenario and robot model, run the test harness, encode and upload the video replay, and write the result to DynamoDB. This wires together every prior task (004–009) into the single deployable unit referenced by the CDK compute stack (task 003) and is the last piece needed for an end-to-end simulation run.

## Read First

- `docs/specs/architecture.md` — "Lambda Functions" section (env vars, Function URL auth model), populated by task 003
- `docs/specs/data-models.md` — table/bucket schemas from tasks 001, 002, 008
- `README.md` — Hard Constraints (a) through (e) in full

## Conventions

No `.claude/rules/` convention applies to `backend/` Python code. Follow PEP 8 and type hints.

## Requirements

1. The module MUST expose `handler(event: dict, context) -> dict` as the Lambda entry point (standard `aws_lambda_powertools`-free signature — no framework dependency beyond `boto3`, keeping the container image lean).
2. `handler` MUST validate a shared-secret header from the Function URL request (`event["headers"]["x-webhook-secret"]`) against the `WEBHOOK_SECRET_ENV` environment variable, returning HTTP 401 (`{"statusCode": 401, "body": "Unauthorized"}`) immediately without running any simulation if the header is missing or does not match. This satisfies the auth requirement noted in task 003's Technical Notes (Function URL has `authType: NONE`).
3. `handler` MUST parse the webhook payload body (JSON) to extract `scenario_id` and `version`; it MUST return HTTP 400 if either is missing.
4. `handler` MUST fetch the scenario record from the `Scenarios` DynamoDB table (`SCENARIOS_TABLE_NAME_ENV`) by `scenario_id`/`version`, returning HTTP 404 if not found.
5. `handler` MUST parse the fetched record's YAML content via `load_scenario` (task 004).
6. `handler` MUST resolve the robot model path via `get_robot_model` (task 005), using `scenario.robot_model` as the model name.
7. `handler` MUST instantiate a controller via `load_controller("stand_still")` (task 007) — the only registered controller at this stage.
8. `handler` MUST call `run_scenario` (task 009) with the loaded scenario, controller, and model path.
9. `handler` MUST encode the returned `RunResult.video_frames` via `VideoRecorder` and upload via `upload_replay` (task 008), generating a `run_id` (UUID) for this purpose.
10. `handler` MUST write a result record to the `SimulationResults` DynamoDB table (`RESULTS_TABLE_NAME_ENV`) containing `run_id`, `scenario_id`, `started_at`, `success`, `duration_s`, `failures`, `violations`, and the video's S3 URI.
11. `handler` MUST return HTTP 200 with a JSON body containing `run_id` and `success` on completion.
12. `handler` MUST catch `ScenarioRunError` (task 009) specifically and write a result record with `success=False` and the error message in `failures`, still returning HTTP 200 (the webhook call itself succeeded; the simulation's failure is data, not an HTTP error) — MUST NOT let an internal simulation failure surface as HTTP 500.
13. Any other unexpected exception (bug in the handler itself, DynamoDB/S3 client errors) MUST result in HTTP 500 with the exception message in the body, and MUST be logged via the standard `logging` module before returning.

## Technical Notes

- This is the container's `CMD` target — `backend/Dockerfile` MUST set `CMD ["handler.handler"]` (or equivalent for the base image used) so the CDK compute stack (task 003) can build `bunx cdk synth` successfully once this task lands.
- Base image: `public.ecr.aws/lambda/python:3.12` is the natural choice, but it does not include OSMesa or ffmpeg system libraries required by task 006/008. The Dockerfile MUST install `mesa-libOSMesa` (or equivalent OSMesa package) and set `ENV MUJOCO_GL=osmesa` — install via `dnf`/`yum` (Amazon Linux base) since `apt` is unavailable on the Lambda base image.
- Keep `handler.py` a thin orchestrator — it MUST import and call the modules from tasks 004–009 rather than reimplementing any of their logic inline. This task's own test suite mocks each of those modules' entry points rather than re-testing their internals.

## TDD Plan

### RED — Tests First

| # | Test Name | Asserts | File |
|---|-----------|---------|------|
| 1 | `test_handler_given_missing_webhook_secret_should_return_401` | status 401, no DynamoDB/S3 calls made | `backend/tests/test_handler.py` |
| 2 | `test_handler_given_wrong_webhook_secret_should_return_401` | status 401 | same |
| 3 | `test_handler_given_missing_scenario_id_should_return_400` | status 400 | same |
| 4 | `test_handler_given_unknown_scenario_should_return_404` | status 404 | same |
| 5 | `test_handler_given_valid_request_should_run_scenario_and_write_result_record` | `run_scenario` called, DynamoDB `put_item` called with expected fields, S3 upload called, status 200 with `run_id`/`success` in body | same |
| 6 | `test_handler_given_scenario_run_error_should_write_failed_result_and_return_200` | result record has `success=False`, status 200 (not 500) | same |
| 7 | `test_handler_given_unexpected_exception_should_return_500_and_log_error` | status 500, error logged | same |

### GREEN — Implementation Order

1. Create `backend/src/handler.py` with the auth-check gate (401 path) only.
2. Add payload parsing and 400/404 gates.
3. Add the happy-path orchestration: scenario load → model resolve → controller load → `run_scenario` → video encode/upload → DynamoDB write → 200 response.
4. Add the `ScenarioRunError` catch path (still-200 failed result).
5. Add the catch-all exception handler (500 + logging).
6. Create `backend/Dockerfile` wiring `CMD` to `handler.handler` and installing OSMesa system packages.

### REFACTOR

- If `handler.py` exceeds ~80 lines, extract the "load scenario + resolve model + build controller" preamble into a private `_prepare_run(event) -> tuple[Scenario, str, RobotController]` helper, keeping `handler` itself readable top-to-bottom.

## Dependencies

- `TASK-001` — Scenarios/SimulationResults table names via env vars
- `TASK-002` — video-replays bucket via `upload_replay`
- `TASK-003` — env var names and Function URL contract this handler must satisfy
- `TASK-004` — `load_scenario`
- `TASK-005` — `get_robot_model`
- `TASK-006` — `PhysicsSimulation` (indirectly, via `run_scenario`)
- `TASK-007` — `load_controller`
- `TASK-008` — `VideoRecorder`, `upload_replay`
- `TASK-009` — `run_scenario`, `RunResult`, `ScenarioRunError`

## Files to Create/Modify

- `backend/src/handler.py` (create)
- `backend/Dockerfile` (create)
- `backend/tests/test_handler.py` (create)
- `backend/requirements.txt` (modify — finalize full dependency list across all backend tasks)

## Acceptance Criteria

- [ ] All RED tests written and failing for the right reason
- [ ] All tests GREEN with minimal implementation
- [ ] REFACTOR pass complete, no regressions
- [ ] No internal simulation failure (`ScenarioRunError`) ever produces an HTTP 500
- [ ] Webhook secret validation happens before any DynamoDB/S3/simulation work
- [ ] `bunx cdk synth` (from task 003) succeeds now that `backend/Dockerfile` exists

## Spec Updates

- [ ] Update `docs/specs/architecture.md` — document the full request flow (webhook → handler → DynamoDB/S3) and the "Lambda Functions" entry with the finalized env var list and response contract
- [ ] Update `docs/specs/data-models.md` — document the `SimulationResults` record shape written by this handler (fields listed in requirement 10)
