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

## Key Concepts

### Scenario
A YAML "level file" that defines one test. Contains: which robot model to use, what task to perform, what objects to place in the scene, and randomization settings. Think of it like a test case definition.

### Run
One execution of a scenario. Produces a verdict (pass/fail), a list of violations (e.g. "robot fell at t=2.3s"), performance metrics, and a link to telemetry data. Like a test run result.

### Telemetry
Per-frame sensor data recorded at 30 Hz during a run. Includes joint angles, joint velocities, body positions, center of mass, and contact forces. Used to render the time-series charts in the UI.

### Controller
The "brain" of the robot. A Python class that reads the current physics state (joint positions, sensor data) and outputs target joint angles each tick. Different task types use different controllers.

### Verdict
Pass or fail. The harness checks whether any non-foot body part touched the ground (fall detection) and whether the controller completed the task within the time limit (30 seconds).

### Violation
A specific failure event detected during the run, timestamped. For example: "left_knee contacted ground at t=1.82s". Multiple violations can occur in a single run.

## What is MuJoCo?

MuJoCo (Multi-Joint dynamics with Contact) is an open-source physics engine built by DeepMind specifically for simulating articulated bodies — robots, hands, creatures with joints. It's the industry standard for robotics simulation and reinforcement learning research.

What it computes each timestep (every 0.002 seconds):

1. **Forward kinematics** — given all joint angles, compute where every body part is in 3D space
2. **Contact detection** — which surfaces are touching? How deep is the penetration?
3. **Force computation** — gravity, joint motors, contact forces, friction, all summed up
4. **Integration** — update velocities and positions based on forces (Newton's laws)
5. **Constraint resolution** — enforce joint limits, prevent bodies from passing through each other

The robot model comes from **MuJoCo Menagerie**, an open-source collection of validated robot models. This project uses the **Unitree G1** — a real humanoid robot made by Unitree Robotics. The model file (MJCF format) defines the robot's skeleton: how many joints, their ranges of motion, link masses, motor strengths, and 3D mesh geometry.

> **Why Lambda?** Each simulation is stateless and runs for under 30 seconds. Lambda gives you pay-per-run pricing and zero idle cost. The tradeoff: MuJoCo, OSMesa (off-screen rendering), and ffmpeg are native C libraries that must be baked into a Docker container image.

## Frontend Pages

**Scenario Browser** — Lists all scenarios with status (draft, published, queued, completed, archived), run count, and pass rate. Filter by status. Each row links to the editor or run history.

**Scenario Editor** — Monaco (VS Code) YAML editor for writing scenario definitions. Template dropdown pre-fills from existing scenarios. Blank template includes inline comments explaining every field.

**Runs Page** — Lists simulation runs with verdict (pass/fail badge), duration, step count, and which scenario triggered them. Expanding a run shows violations, metrics, and telemetry charts.

**Factory Floor** — Top-down SVG map of a simulated factory environment. Contextual — shows where the robot operates in the physical space.

**Code Diff** — Side-by-side Monaco diff viewer showing a hardcoded example: `factory_reach_defective.py` vs `factory_reach.py`. Illustrates how a controller bug causes a robot to fall. Not connected to live data.

## Backend Modules

Everything runs in a single Lambda container. Entry point: `handler.py`, handling HTTP events (API calls) and DynamoDB Stream events (simulation triggers).

| Module | Purpose |
|--------|---------|
| `handler.py` | Routes HTTP and Stream events to the right handler |
| `scenario/models.py` | Pydantic models for scenario validation (Scenario, TaskDefinition, ObjectPlacement, RandomizationConfig) |
| `robot_model/loader.py` | Downloads the MJCF model + mesh files from S3 into Lambda's /tmp |
| `control/factory.py` | Registry of controller classes — `stand_still`, `factory_reach`, `factory_reach_defective` |
| `physics/simulation.py` | Wraps MuJoCo — loads model, calls `mj_step()`, exposes state (joint angles, positions, contacts) |
| `harness/runner.py` | Orchestrates run loop: randomize → step physics → get controller action → apply → record telemetry → check violations |
| `telemetry/recorder.py` | Serializes telemetry frames to JSON and uploads to S3 |

## AWS Infrastructure

Three CDK stacks deployed together.

### RobotSimDataStack

| Resource | Type | Purpose |
|----------|------|---------|
| `robot-sim-scenarios` | DynamoDB | Scenario definitions. PK: scenarioId, SK: version. GSI on status. Streams enabled. |
| `robot-sim-simulation-results` | DynamoDB | Run results. PK: runId. GSI ScenarioRunsIndex. |
| `robot-sim-video-replays-*` | S3 | Telemetry JSON files (legacy name). Frontend fetches via presigned URLs. |
| `robot-sim-robot-models-*` | S3 | MJCF model XML + mesh files for Unitree G1. Lambda downloads at cold start. |
| `robot-sim-site-packs-*` | S3 | Customer-specific configuration packs. Read-only at runtime. |

### RobotSimComputeStack

| Resource | Config | Notes |
|----------|--------|-------|
| `RobotSimSimulator` | DockerImageFunction | 3008 MB memory, 5-min timeout, concurrency limit of 3. Built from `backend/`. |
| Function URL | Auth: NONE | Custom auth via `X-Webhook-Secret` header, validated against SSM SecureString. CORS for Vercel. |

### RobotSimTriggerStack

| Resource | Config | Notes |
|----------|--------|-------|
| DynamoDB Stream | Event source mapping | Filtered to MODIFY events where status becomes `queued`. Wired to same Lambda. |
| SQS DLQ | Dead letter queue | Catches failed stream processing events. |

## What Happens When You Click Run

1. Frontend sends `POST /scenarios/{id}/run` to the Lambda Function URL. Lambda sets scenario status to `queued` in DynamoDB and returns immediately.
2. DynamoDB Streams detects the status change. Stream event filter matches `queued` and invokes the **same Lambda** as a stream handler.
3. Lambda loads the Unitree G1 robot model (MJCF XML + mesh files) from S3 into `/tmp`.
4. Scenario YAML is parsed and validated through Pydantic models. Objects are placed in the scene. Randomization noise is applied if configured.
5. Physics loop runs: every 0.002s of sim time, controller reads joint angles/velocities and outputs target positions. MuJoCo's `mj_step()` integrates forces and updates the world. Telemetry sampled at 30 Hz.
6. Each tick, the harness checks if any non-foot body part contacted the ground (fall detection). Violations are logged with timestamps.
7. After the loop (up to 30s sim time, or early exit on violation), results are written to `simulation-results` DynamoDB table, telemetry JSON uploaded to S3, scenario status set to `completed`.
8. Frontend fetches updated run data via `GET /runs`. For telemetry charts, it gets a presigned S3 URL from `GET /runs/{id}/telemetry` and fetches JSON directly from S3.

## Reading the Telemetry Charts

**Center of Mass** — Tracks the robot's balance point over time. X/Y show lateral drift, Z (height) shows vertical position. A sudden Z drop usually means the robot is falling. Stable standing keeps all three lines flat.

**Joint Angles** — Shows angular position of key joints (shoulders, elbows, waist) over time in radians. Smooth curves mean controlled motion. Erratic oscillations or sudden jumps indicate instability or a controller bug. Flat lines mean the joint is holding position.

**Contact Events** — Counts how many body parts are touching surfaces each frame. Foot contacts (usually 2) are normal during standing. Spikes above baseline mean extra body parts hit the ground — knees, hands, or torso — indicating a fall or collision.

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
