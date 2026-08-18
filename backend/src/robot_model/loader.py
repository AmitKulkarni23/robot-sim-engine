"""Resolve a robot model name to a local MJCF file path.

Resolution order: local `cache_dir` -> S3 `robot-models` bucket -> public
MuJoCo Menagerie GitHub repo (first-run bootstrap, which also seeds S3 for
future invocations).
"""
from __future__ import annotations

import os
import xml.etree.ElementTree as ET
from pathlib import Path

import boto3
import requests
from botocore.exceptions import ClientError

from .registry import get_model_registry_entry

MENAGERIE_RAW_BASE = (
    "https://raw.githubusercontent.com/google-deepmind/mujoco_menagerie/main"
)
MODELS_BUCKET_NAME_ENV = "MODELS_BUCKET_NAME_ENV"


def _local_mjcf_path(cache_dir: str, model_name: str, version: str) -> Path:
    return Path(cache_dir) / model_name / version / "model.mjcf"


def _s3_key(model_name: str, version: str) -> str:
    return f"{model_name}/{version}/model.mjcf"


def _extract_meshdir(mjcf_content: str) -> str:
    """Return the `meshdir` attribute from `<compiler>`, or empty string."""
    try:
        root = ET.fromstring(mjcf_content)
    except ET.ParseError:
        return ""
    compiler = root.find("compiler")
    if compiler is not None:
        return compiler.get("meshdir", "")
    return ""


def _extract_mesh_filenames(mjcf_content: str) -> list[str]:
    """Return mesh file paths (with meshdir prefix) for every `<mesh>` under `<asset>`."""
    try:
        root = ET.fromstring(mjcf_content)
    except ET.ParseError:
        return []

    meshdir = _extract_meshdir(mjcf_content)

    paths = []
    for asset in root.findall(".//asset"):
        for mesh in asset.findall("mesh"):
            filename = mesh.get("file")
            if filename:
                if meshdir:
                    paths.append(f"{meshdir}/{filename}")
                else:
                    paths.append(filename)
    return paths


def _download_from_menagerie(model_name: str, local_path: Path) -> None:
    entry = get_model_registry_entry(model_name)
    menagerie_dir = entry["menagerie_dir"]
    mjcf_filename = entry["mjcf_filename"]

    local_path.parent.mkdir(parents=True, exist_ok=True)

    mjcf_url = f"{MENAGERIE_RAW_BASE}/{menagerie_dir}/{mjcf_filename}"
    response = requests.get(mjcf_url, timeout=30)
    response.raise_for_status()
    mjcf_content = response.text
    local_path.write_text(mjcf_content)

    for mesh_filename in _extract_mesh_filenames(mjcf_content):
        mesh_url = f"{MENAGERIE_RAW_BASE}/{menagerie_dir}/{mesh_filename}"
        mesh_response = requests.get(mesh_url, timeout=30)
        mesh_response.raise_for_status()
        mesh_path = local_path.parent / mesh_filename
        mesh_path.parent.mkdir(parents=True, exist_ok=True)
        mesh_path.write_bytes(mesh_response.content)


def get_robot_model(
    model_name: str, version: str, cache_dir: str = "/tmp/robot_models"
) -> str:
    """Return the local filesystem path to `model_name`'s MJCF file.

    Checks the local cache first, then S3, then falls back to fetching from
    the public MuJoCo Menagerie repo (seeding S3 for next time).
    """
    get_model_registry_entry(model_name)  # raises RobotModelNotFoundError if unknown

    local_path = _local_mjcf_path(cache_dir, model_name, version)
    if local_path.exists():
        return str(local_path)

    local_path.parent.mkdir(parents=True, exist_ok=True)
    bucket_name = os.environ.get(MODELS_BUCKET_NAME_ENV, "")
    client = boto3.client("s3")

    try:
        client.download_file(bucket_name, _s3_key(model_name, version), str(local_path))
        return str(local_path)
    except ClientError:
        pass

    _download_from_menagerie(model_name, local_path)
    client.upload_file(str(local_path), bucket_name, _s3_key(model_name, version))
    return str(local_path)
