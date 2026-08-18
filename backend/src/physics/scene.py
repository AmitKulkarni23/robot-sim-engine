"""Generate a scene MJCF that wraps a robot model with floor, lighting, and skybox."""
from __future__ import annotations

from pathlib import Path

_SCENE_TEMPLATE = """\
<mujoco model="{model_name} scene">
  <include file="{mjcf_filename}"/>

  <visual>
    <headlight diffuse="0.6 0.6 0.6" ambient="0.1 0.1 0.1" specular="0.9 0.9 0.9"/>
    <rgba haze="0.15 0.25 0.35 1"/>
    <global azimuth="140" elevation="-20"/>
  </visual>

  <asset>
    <texture type="skybox" builtin="gradient" rgb1="0.3 0.5 0.7" rgb2="0 0 0"
             width="512" height="3072"/>
    <texture type="2d" name="groundplane" builtin="checker" mark="edge"
             rgb1="0.2 0.3 0.4" rgb2="0.1 0.2 0.3" markrgb="0.8 0.8 0.8"
             width="300" height="300"/>
    <material name="groundplane" texture="groundplane" texuniform="true"
              texrepeat="5 5" reflectance="0.2"/>
  </asset>

  <worldbody>
    <geom name="scene_floor" size="0 0 0.05" type="plane" material="groundplane"/>
  </worldbody>
</mujoco>
"""


def ensure_scene_xml(model_path: str) -> str:
    """Return path to a scene MJCF that includes the robot model with floor and lighting.

    Looks for a pre-existing scene.xml first (e.g. from Menagerie).
    Otherwise generates a per-model scene file to avoid collisions.
    """
    model_dir = Path(model_path).parent
    mjcf_filename = Path(model_path).name
    model_stem = Path(model_path).stem

    existing_scene = model_dir / "scene.xml"
    if existing_scene.exists():
        return str(existing_scene)

    generated_scene = model_dir / f"{model_stem}.scene.xml"
    if generated_scene.exists():
        return str(generated_scene)

    model_name = model_dir.parent.name
    scene_content = _SCENE_TEMPLATE.format(
        model_name=model_name,
        mjcf_filename=mjcf_filename,
    )
    generated_scene.write_text(scene_content)
    return str(generated_scene)
