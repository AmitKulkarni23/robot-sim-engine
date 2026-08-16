# Robot Sim Engine

## Project Overview
Simulation engine for humanoid robotics. Python backend (Lambda container) runs MuJoCo physics, React + MUI frontend on Vercel, AWS CDK infrastructure.

## Architecture
- `frontend/` — React + Material UI dashboard deployed on Vercel
- `backend/` — Python Lambda container — physics simulation, control software, test harness
- `infra/` — AWS CDK (TypeScript) — Lambda, DynamoDB, S3
- `docs/specs/` — System specs (HLD, LLD, api-contracts, data-models, architecture)
- `docs/tasks/` — Task specs for implementation
- `docs/references.md` — External references (MuJoCo, Menagerie, Humanoid)

## Stack
- **Backend**: Python 3.12 (AWS Lambda container image)
- **Frontend**: React 18 + TypeScript + Material UI
- **Infrastructure**: AWS CDK v2 (TypeScript)
- **Database**: DynamoDB + S3
- **Physics**: MuJoCo (native dependency in Lambda container)
- **Rendering**: OSMesa (off-screen) → ffmpeg (imageio-ffmpeg) → MP4
- **Robot Model**: MuJoCo Menagerie — Unitree G1 (HMND 01 stand-in)

## Commands
```bash
# Frontend
cd frontend && npm install && npm run dev

# Infrastructure
cd infra && npm install
npx cdk synth        # Synthesize CloudFormation
npx cdk deploy --all # Deploy all stacks
npx cdk diff         # Preview changes

# Backend
cd backend && pip install -r requirements.txt
python -m pytest     # Run tests
```

## Hard Constraints
- Simulation MUST run in a single AWS Lambda container image (Python)
- Trigger: Supabase Database Webhook → Lambda Function URL
- MuJoCo + OSMesa + ffmpeg = native deps that MUST fit in Lambda container
- Robot model: Unitree G1 from MuJoCo Menagerie
- All customer-specific content lives in versioned site packs — zero engine changes per customer

## Development Workflow
Phased design process. Each phase produces artifacts the next phase consumes.

0. **Idea sharpener** → conversation only
1. **Functional requirements** → `docs/specs/reqs-<name>.md`
2. **HLD** → `docs/specs/hld-<name>.md`
3. **Adversarial review** on HLD
4. **LLD per service** → `docs/specs/lld-<service>.md`
5. **Adversarial review** on each LLD
6. **Task specs** → `docs/tasks/task-<nnn>-<name>.md`
7. **Execute wave** → parallel implementation
8. **Ship** → test, commit, push, PR

Always read relevant spec before starting work.
Check `docs/specs/review-status.md` before starting any phase.

## Coding Conventions
- Frontend conventions are in `.claude/rules/` — automatically loaded by file pattern
- CDK conventions are in `.claude/rules/` — automatically loaded by file pattern
- ALL code follows RED/GREEN/REFACTOR TDD. Tests first. Always.
