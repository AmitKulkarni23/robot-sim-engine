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
- Trigger: Supabase Database Webhook → Lambda Function URL
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

## Commands

```bash
# Frontend
cd frontend && npm install && npm run dev

# Infrastructure
cd infra && npm install && npx cdk synth && npx cdk deploy --all

# Backend (local)
cd backend && pip install -r requirements.txt && python -m pytest
```
