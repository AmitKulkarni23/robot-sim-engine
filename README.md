# Robot Sim Engine

Simulation engine for humanoid robotics — CI/CD for robot behavior.

Built for [Humanoid](https://thehumanoid.ai/) (HMND 01 Alpha + KinetIQ).

## What This Does

An engineer defines a scenario (factory cell, task, randomization ranges), runs the robot's control software against simulated physics, and gets back a verdict + metrics + video replay. Versioned and comparable across software builds.

## Architecture

| Layer | What | Tech |
|-------|------|------|
| Physics Engine | Laws of nature — "where is everything 2ms from now?" | MuJoCo |
| Robot Model | Links, joints, masses, motor limits (URDF/MJCF) | MuJoCo Menagerie (Unitree G1) |
| Control Software | The actual robot code under test (KinetIQ stand-in) | Python |
| Scenario/World | Factory layout, object placement, task, randomization | Data (YAML/JSON) |
| Test Harness | Assert statements — emits {success, duration, fails, violations} | Python |
| Fleet Layer | N robots in shared world or N parallel sims | Python + AWS Lambda |

## Hard Constraints

- Simulation runs inside a **single AWS Lambda container image** (Python)
- Trigger: API call (webhook, CI, or manual) → Lambda Function URL
- Physics + Rendering: MuJoCo, off-screen rendering via OSMesa, frames → MP4 via ffmpeg (imageio-ffmpeg)
- Robot Model: MuJoCo Menagerie (Unitree G1 as HMND 01 stand-in)
- Control Plane: AWS (DynamoDB, DDB Streams, Lambda, S3)
- Frontend: React + Material UI → Vercel
- All native dependencies (MuJoCo, OSMesa, ffmpeg) must fit in Lambda container

## Project Structure

```
robot-sim-engine/
├── frontend/          # React + MUI dashboard (Vercel)
│   └── src/
├── backend/           # Python Lambda — physics sim, control, harness
├── infra/             # AWS CDK (TypeScript) — Lambda, DynamoDB, S3
│   ├── lib/
│   └── bin/
├── docs/
│   ├── specs/         # System specs (HLD, LLD, api-contracts, data-models, architecture)
│   ├── tasks/         # Task specs for implementation
│   ├── references.md  # External references and resources
│   └── session-logs/  # Session summaries
└── .claude/
    ├── rules/         # Coding convention rules (synced from project-rules)
    ├── agents/        # Claude agents
    ├── skills/        # Claude skills
    └── templates/     # Task spec templates
```

## Stack

- **Backend**: Python 3.12 (Lambda container image)
- **JS Runtime**: Bun (https://bun.sh/)
- **Frontend**: React 18 + TypeScript + Material UI
- **Infrastructure**: AWS CDK (TypeScript)
- **Database**: DynamoDB (scenarios, results) + S3 (videos, models)
- **Physics**: MuJoCo
- **CI/CD**: GitHub Actions

## Development Workflow

This project uses a phased design process:

0. **Idea sharpener** → conversation only, decides scope
1. **Functional requirements** → `docs/specs/reqs-<name>.md`
2. **HLD** → `docs/specs/hld-<name>.md`
3. **Adversarial review** on HLD → appended to HLD doc
4. **LLD per service** → `docs/specs/lld-<service>.md`
5. **Adversarial review** on each LLD → appended to LLD doc
6. **Task specs** → `docs/tasks/task-<nnn>-<name>.md`
7. **Execute wave** → parallel implementation per phase
8. **Ship** → test, commit, push, PR

## Simulation Trigger Flow

```
Engineer pushes control code to main
        ↓
GitHub Actions `simulate.yml` fires
        ↓
Matrix strategy: runs ALL 5 scenarios in parallel (5 jobs)
        ↓
Each job does: curl -X POST $LAMBDA_FUNCTION_URL
  -H "x-webhook-secret: $WEBHOOK_SECRET"
  -d '{"scenario_id": "box-pickup-standard-5kg", "version": 1}'
        ↓
Lambda handler.py receives it:
  1. Validates x-webhook-secret header
  2. Parses scenario_id + version from JSON body
  3. Loads scenario YAML from DynamoDB scenarios table
  4. Downloads robot model (Unitree G1) from S3
  5. Runs MuJoCo physics simulation via harness/runner.py
  6. Records video frames → encodes MP4 → uploads to S3
  7. Writes result to simulation-results DynamoDB table
  8. Returns {"run_id": "uuid", "success": true/false}
        ↓
GitHub Actions checks success field
  → true  = green check
  → false = warning annotation
  → non-200 HTTP = job fails
```

Triggers: auto on push to `main` (when `backend/src/control/`, `backend/scenarios/`, or `backend/scenes/` change), or manual via `workflow_dispatch`.

## Commands

### Frontend

```bash
cd frontend
bun install              # Install dependencies
bun run dev              # Dev server at http://localhost:5173
bun run build            # Production build (tsc + vite)
bun run test             # Run vitest (16 tests)
bun run test -- --run    # Run tests once (no watch)
```

### Backend

```bash
cd backend
pip install -r requirements.txt        # Install dependencies
pip install -r requirements-dev.txt    # Install dev/test deps
python -m pytest                       # Run tests (42 tests)
```

### Infrastructure (CDK)

```bash
cd infra
bun install              # Install dependencies
bunx cdk synth           # Synthesize CloudFormation templates
bunx cdk diff            # Preview changes before deploy
bunx cdk bootstrap       # First-time setup for CDK in AWS account
bunx cdk deploy --all    # Deploy all stacks to AWS
bunx cdk destroy --all   # Tear down all stacks
```

### Seed Data

```bash
cd backend
source .venv/bin/activate
python scripts/seed_scenarios.py    # Load scenarios into DynamoDB
```

Requires AWS credentials and the `SCENARIOS_TABLE_NAME_ENV` env var (defaults to `robot-sim-scenarios`).

### Vercel (Frontend Deployment)

```bash
cd frontend
vercel                   # Preview deploy
vercel --prod            # Production deploy
vercel link              # Link to existing Vercel project
```
