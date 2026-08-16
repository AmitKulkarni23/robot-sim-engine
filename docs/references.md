# References

## Humanoid (The Company)
- Website: https://thehumanoid.ai/
- Product: HMND 01 Alpha — industrial humanoid robot
- Software: KinetIQ — robot control software platform

## Physics Engine — MuJoCo
- Homepage: https://mujoco.org/
- GitHub: https://github.com/google-deepmind/mujoco
- Documentation: https://mujoco.readthedocs.io/
- Python bindings: `pip install mujoco`
- Key features: contact dynamics, actuator modeling, off-screen rendering via OSMesa

## Robot Models — MuJoCo Menagerie
- GitHub: https://github.com/google-deepmind/mujoco_menagerie
- Unitree G1 (our HMND 01 stand-in): https://github.com/google-deepmind/mujoco_menagerie/tree/main/unitree_g1
- Format: MJCF (MuJoCo's XML format)
- Alternative format: URDF (Unified Robot Description Format)

## Rendering & Video
- OSMesa: off-screen rendering for headless environments (Lambda)
- imageio-ffmpeg: Python wrapper for ffmpeg, video encoding
- ffmpeg: frame-to-MP4 encoding

## AWS Infrastructure
- Lambda container images: https://docs.aws.amazon.com/lambda/latest/dg/images-create.html
- DynamoDB: scenario storage, simulation results
- S3: video replays, robot model files, site packs
- DynamoDB Streams + Lambda: event-driven trigger pipeline

## Frontend
- React 18: https://react.dev/
- Material UI (MUI): https://mui.com/
- Vercel: https://vercel.com/

## Simulation Concepts
- Digital twin: virtual replica of physical robot for testing
- Site pack: versioned customer-specific content (scenarios, configs) that plugs into fixed extension points
- Scenario: factory cell definition + task + randomization ranges
- Fleet simulation: N robots in shared world or N parallel sims
