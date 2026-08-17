"""Seed DynamoDB scenarios table with YAML files from backend/scenarios/."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import boto3

SCENARIOS_DIR = Path(__file__).resolve().parent.parent / "scenarios"
TABLE_NAME = os.environ.get("SCENARIOS_TABLE_NAME_ENV", "robot-sim-scenarios")


def seed() -> None:
    dynamodb = boto3.client("dynamodb")
    yaml_files = sorted(SCENARIOS_DIR.glob("*.yaml"))

    if not yaml_files:
        print(f"No YAML files found in {SCENARIOS_DIR}")
        sys.exit(1)

    for path in yaml_files:
        content = path.read_text()

        import yaml
        parsed = yaml.safe_load(content)
        scenario_id = parsed["scenario_id"]
        version = parsed["version"]

        dynamodb.put_item(
            TableName=TABLE_NAME,
            Item={
                "scenario_id": {"S": scenario_id},
                "version": {"N": str(version)},
                "yaml_content": {"S": content},
                "name": {"S": path.stem.replace("_", " ").title()},
            },
        )
        print(f"  Seeded: {scenario_id} v{version}")

    print(f"\nDone — {len(yaml_files)} scenarios loaded into {TABLE_NAME}")


if __name__ == "__main__":
    seed()
