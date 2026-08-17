"""Lambda entry point: webhook -> scenario/model resolution -> harness run ->
video encode/upload -> DynamoDB result record.

Wires together tasks 004-009; contains no simulation logic of its own.
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import boto3

from control.factory import load_controller
from harness.models import ScenarioRunError
from harness.runner import run_scenario
from robot_model.loader import get_robot_model
from scenario.loader import load_scenario
from video.recorder import VideoRecorder, upload_replay

logger = logging.getLogger(__name__)

WEBHOOK_SECRET_ENV = "WEBHOOK_SECRET_ENV"
SCENARIOS_TABLE_NAME_ENV = "SCENARIOS_TABLE_NAME_ENV"
RESULTS_TABLE_NAME_ENV = "RESULTS_TABLE_NAME_ENV"


def _response(status_code: int, body: Any) -> dict:
    return {
        "statusCode": status_code,
        "body": body if isinstance(body, str) else json.dumps(body),
    }


def handler(event: dict, context) -> dict:
    headers = event.get("headers") or {}
    provided_secret = headers.get("x-webhook-secret")
    expected_secret = os.environ.get(WEBHOOK_SECRET_ENV)
    if not provided_secret or provided_secret != expected_secret:
        return {"statusCode": 401, "body": "Unauthorized"}

    try:
        payload = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"error": "Invalid JSON payload"})

    scenario_id = payload.get("scenario_id")
    version = payload.get("version")
    if not scenario_id or not version:
        return _response(400, {"error": "scenario_id and version are required"})

    try:
        dynamodb = boto3.client("dynamodb")
        scenarios_table = os.environ[SCENARIOS_TABLE_NAME_ENV]
        item = dynamodb.get_item(
            TableName=scenarios_table,
            Key={"scenario_id": {"S": scenario_id}, "version": {"N": str(version)}},
        ).get("Item")
        if item is None:
            return _response(404, {"error": "Scenario not found"})

        yaml_content = item["yaml_content"]["S"]
        scenario = load_scenario(yaml_content)
        model_path = get_robot_model(scenario.robot_model, str(version))
        controller = load_controller("stand_still")

        run_id = str(uuid.uuid4())
        started_at = datetime.now(timezone.utc).isoformat()

        try:
            result = run_scenario(scenario, controller, model_path)

            recorder = VideoRecorder()
            for frame in result.video_frames:
                recorder.add_frame(frame)
            local_video_path = f"/tmp/{run_id}.mp4"
            recorder.encode(local_video_path)
            video_uri = upload_replay(local_video_path, scenario_id, run_id)

            success = result.success
            duration_s = result.duration_s
            failures = result.failures
            violations = result.violations
        except ScenarioRunError as exc:
            success = False
            duration_s = 0.0
            failures = [str(exc)]
            violations = []
            video_uri = ""

        results_table = os.environ[RESULTS_TABLE_NAME_ENV]
        dynamodb.put_item(
            TableName=results_table,
            Item={
                "run_id": {"S": run_id},
                "scenario_id": {"S": scenario_id},
                "started_at": {"S": started_at},
                "success": {"BOOL": success},
                "duration_s": {"N": str(duration_s)},
                "failures": {"S": json.dumps(failures)},
                "violations": {"S": json.dumps(violations)},
                "video_uri": {"S": video_uri},
            },
        )

        return _response(200, {"run_id": run_id, "success": success})
    except Exception as exc:
        logger.exception("Unhandled error in Lambda handler")
        return _response(500, str(exc))
