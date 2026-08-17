# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 18 + TypeScript + Material UI frontend on Vercel. Python 3.12 backend in AWS Lambda container image. AWS CDK (TypeScript) infrastructure. Bun as JS runtime.

## Users

Robotics software engineers at companies deploying humanoid robots (initial customer: Humanoid, makers of HMND 01 Alpha). They write and iterate on control software (KinetIQ) daily. Their loop is: change control code → run simulation → read verdict and metrics → watch video replay → fix or ship. They care about fast feedback, clear pass/fail, and being able to compare runs across builds. They are technical but don't want to manage simulation infrastructure.

## Product Purpose

CI/CD for robot behavior. Engineers define a scenario (factory cell, task, randomization ranges), run the robot's control software against simulated physics, and get back a verdict, metrics, and video replay. Versioned and comparable across software builds. Every software change is tested before a real $100k robot touches a box.

## Positioning

Three things no incumbent offers together:

1. **CI/CD-native.** Not a desktop app or GPU workstation tool. Runs headless in Lambda, triggered by code changes, results appear in a web dashboard. Simulation-as-a-service.
2. **Customer-site extensibility.** Versioned site packs define factory layouts, object placements, and tasks. New customer = new pack, zero engine changes. Scales to thousands of robot deployments.
3. **Dramatically simpler than alternatives.** No GPU cluster (MuJoCo runs on CPU). No NVIDIA Isaac Sim license. No Gazebo ROS dependency chain. One Lambda container, one webhook trigger, one dashboard.

## Operating Context

Engineers push control code to a repository. A Supabase database webhook fires, triggering a Lambda simulation run. The Lambda loads the robot model (Unitree G1 from MuJoCo Menagerie as HMND 01 stand-in), the scenario definition, and the control software. It steps MuJoCo physics, records frames via OSMesa, encodes video via ffmpeg, scores the run, and writes results to DynamoDB + S3. The dashboard shows run history, pass/fail verdicts, metrics, and video replays. Engineers compare runs across builds to catch regressions.

## Capabilities and Constraints

**Capabilities:**
- Physics simulation via MuJoCo (contact dynamics, actuator modeling)
- Robot model loading from MuJoCo Menagerie (URDF/MJCF format)
- Scenario definition via YAML/JSON (factory layout, object placement, task, randomization)
- Off-screen rendering and video replay generation
- Test harness emitting structured verdicts: success, duration, failures, violations
- Fleet simulation (N parallel sims or N robots in shared world)

**Constraints:**
- Entire simulation MUST run in a single AWS Lambda container image (Python)
- MuJoCo, OSMesa, and ffmpeg are native dependencies that MUST fit in Lambda container
- Trigger path: Supabase Database Webhook → Lambda Function URL
- Control plane: AWS (DynamoDB, DDB Streams, Lambda, S3)
- Robot model: Unitree G1 from MuJoCo Menagerie (stand-in for HMND 01)
- No GPU — MuJoCo runs on CPU only
- Customer-specific content lives in versioned site packs plugging into fixed extension points

**Undecided:**
- Authentication model for the dashboard (open question)
- Whether fleet simulation is MVP or later phase

## Evidence on Hand

- Humanoid website: https://thehumanoid.ai/
- MuJoCo physics engine: https://mujoco.org/ and https://github.com/google-deepmind/mujoco
- MuJoCo Menagerie (robot models): https://github.com/google-deepmind/mujoco_menagerie
- Unitree G1 model available in Menagerie
- No existing simulation codebase — this is greenfield
- No real KinetIQ control software available — will simulate/mock
- No customer factory layouts yet — will use synthetic scenarios

## Product Principles

1. **Feedback speed over fidelity.** A fast approximate answer that catches regressions beats a photorealistic render that takes an hour.
2. **Zero-config per customer.** Site packs are the only customer-specific artifact. The engine never changes per deployment.
3. **Verdicts, not data.** The dashboard shows pass/fail and what broke, not raw simulation dumps. Engineers read a verdict, not a log file.
4. **Comparable across builds.** Every run is versioned, reproducible, and diffable against previous builds. Regressions are visible, not guessed.
5. **Infrastructure disappears.** Engineers think about robot behavior, not Lambda containers or MuJoCo configs. The platform is invisible.
