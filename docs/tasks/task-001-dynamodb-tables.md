# Task: 001 — DynamoDB Tables (Scenarios + Results)

## Summary

Provision the two DynamoDB tables that back the simulation engine: a `Scenarios` table holding versioned scenario definitions (factory cell, task, randomization ranges) and a `SimulationResults` table holding per-run verdicts and metrics. These are the persistence layer the Lambda handler (task 010) reads from and writes to, and the source of truth the frontend dashboard will query. Reference: README.md "Architecture" table (Scenario/World, Test Harness rows) and CLAUDE.md "Stack" (Database: DynamoDB + S3).

## Read First

- `docs/specs/data-models.md` — currently empty; this task is the first to populate it
- `CLAUDE.md` — Hard Constraints (control plane is AWS DynamoDB/S3), Stack section

## Conventions

Read and follow the CDK convention rules in `.claude/rules/cdk-universal.rules.md` before writing any code — this project's `.claude-stack` declares the `cdk` stack.

## Requirements

### Scenarios Table

1. The table MUST use `scenarioId` (string) as partition key and `version` (number) as sort key, so multiple versions of the same scenario coexist.
2. The table MUST use `PAY_PER_REQUEST` billing mode.
3. The table SHOULD have a global secondary index `StatusIndex` on `status` (string: `draft` | `published` | `archived`) with `updatedAt` as sort key, to support listing published scenarios by recency.
4. Dev/non-prod deployments MUST use `RemovalPolicy.DESTROY`; the stack MUST accept an environment context value (`dev`/`prod`) that controls this.

### SimulationResults Table

5. The table MUST use `runId` (string, UUID) as partition key.
6. The table MUST have a global secondary index `ScenarioRunsIndex` on `scenarioId` (string) with `startedAt` (string, ISO8601) as sort key, so results can be queried per scenario in chronological order.
7. The table MUST use `PAY_PER_REQUEST` billing mode.
8. The table SHOULD enable DynamoDB Streams (`NEW_AND_OLD_IMAGES`) — a future fleet-layer consumer will react to new results; the stream ARN MUST be exposed via `CfnOutput`.
9. Dev/non-prod deployments MUST use `RemovalPolicy.DESTROY`; prod MUST use `RemovalPolicy.RETAIN`.

### Outputs

10. The stack MUST export both table names and both table ARNs via `CfnOutput` with `exportName`s following the `{ProjectName}{Resource}{Type}` convention (e.g. `RobotSimScenariosTableName`).

## Technical Notes

- Project name prefix for construct IDs and resource names is `RobotSim`.
- This is the first CDK stack in the repo — create `infra/lib/robot-sim-data-stack.ts` following the numbered-section stack pattern from the CDK rules (1. DATA LAYER, 2. COMPUTE LAYER, 3. OUTPUTS). This stack only has a DATA LAYER and OUTPUTS section; no compute here.
- `infra/bin/` does not yet have an entry app — task 003 (Lambda stack) is expected to also need an app entrypoint. This task MAY create `infra/bin/robot-sim.ts` instantiating just this data stack; task 003 will extend it to instantiate the compute stack too, importing table ARNs via `Fn.importValue` or CDK cross-stack references.

## TDD Plan

N/A — CDK tasks are not tested.

## Dependencies

- None

## Files to Create/Modify

- `infra/package.json` (create — CDK v2 TypeScript project, Bun as package manager)
- `infra/tsconfig.json` (create)
- `infra/cdk.json` (create)
- `infra/bin/robot-sim.ts` (create — CDK app entrypoint, instantiates data stack)
- `infra/lib/robot-sim-data-stack.ts` (create — Scenarios + SimulationResults tables)

## Acceptance Criteria

- [ ] `bunx cdk synth` succeeds with no errors
- [ ] Scenarios table has partition key `scenarioId`, sort key `version`, and `StatusIndex` GSI
- [ ] SimulationResults table has partition key `runId`, `ScenarioRunsIndex` GSI, and streams enabled
- [ ] Both tables' names and ARNs are exported as `CfnOutput`
- [ ] Removal policy is `DESTROY` for dev context, `RETAIN` for prod context on SimulationResults

## Spec Updates

- [ ] Update `docs/specs/data-models.md` — add "DynamoDB Tables" entries for `Scenarios` and `SimulationResults` with full attribute/key/GSI documentation
