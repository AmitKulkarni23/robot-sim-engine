"""Lambda entry point: handles both simulation triggers (POST) and
dashboard read queries (GET /runs, GET /scenarios).
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from dataclasses import asdict
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

_CORS_HEADERS = {
    "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN_ENV", "*"),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-webhook-secret",
}


def _response(status_code: int, body: Any) -> dict:
    return {
        "statusCode": status_code,
        "headers": _CORS_HEADERS,
        "body": body if isinstance(body, str) else json.dumps(body),
    }


def _get_method_and_path(event: dict) -> tuple[str, str]:
    rc = event.get("requestContext", {})
    http = rc.get("http", {})
    method = http.get("method", "POST").upper()
    path = http.get("path", "/")
    return method, path


def _handle_get_runs(dynamodb_client) -> dict:
    results_table = os.environ[RESULTS_TABLE_NAME_ENV]
    resp = dynamodb_client.scan(TableName=results_table, Limit=100)
    items = resp.get("Items", [])

    runs = []
    for item in items:
        violations_raw = json.loads(item.get("violations", {}).get("S", "[]"))
        failures_raw = json.loads(item.get("failures", {}).get("S", "[]"))
        success = item.get("success", {}).get("BOOL", False)

        verdict = "pass" if success else "fail"
        if failures_raw:
            verdict_reason = f"Simulation Failed — {failures_raw[0]}"
        elif not success and violations_raw:
            first_v = violations_raw[0]
            title = first_v.get("title", str(first_v)) if isinstance(first_v, dict) else str(first_v)
            verdict_reason = f"Simulation Failed — {title}"
        elif success:
            verdict_reason = "Simulation Passed — all thresholds met"
        else:
            verdict_reason = "Simulation Failed"

        run = {
            "id": item.get("runId", {}).get("S", ""),
            "scenarioId": item.get("scenarioId", {}).get("S", ""),
            "scenarioName": item.get("scenarioName", {}).get("S", ""),
            "verdict": verdict,
            "verdictReason": verdict_reason,
            "timestamp": item.get("startedAt", {}).get("S", ""),
            "buildNumber": int(item.get("buildNumber", {}).get("N", "0")),
            "robotModel": item.get("robotModel", {}).get("S", ""),
            "durationSeconds": float(item.get("durationS", {}).get("N", "0")),
            "stepsSimulated": int(item.get("stepsSimulated", {}).get("N", "0")),
            "keyMetricLabel": "",
            "keyMetricDeltaDirection": "neutral",
            "metrics": json.loads(item.get("metrics", {}).get("S", "[]")),
            "violations": violations_raw if violations_raw and isinstance(violations_raw[0], dict) else [],
        }
        runs.append(run)

    runs.sort(key=lambda r: r["timestamp"], reverse=True)
    return _response(200, runs)


def _handle_get_run(dynamodb_client, run_id: str) -> dict:
    results_table = os.environ[RESULTS_TABLE_NAME_ENV]
    resp = dynamodb_client.get_item(
        TableName=results_table,
        Key={"runId": {"S": run_id}},
    )
    item = resp.get("Item")
    if not item:
        return _response(404, {"error": "Run not found"})

    violations_raw = json.loads(item.get("violations", {}).get("S", "[]"))
    failures_raw = json.loads(item.get("failures", {}).get("S", "[]"))
    success = item.get("success", {}).get("BOOL", False)

    verdict = "pass" if success else "fail"
    if failures_raw:
        verdict_reason = f"Simulation Failed — {failures_raw[0]}"
    elif not success and violations_raw:
        first_v = violations_raw[0]
        title = first_v.get("title", str(first_v)) if isinstance(first_v, dict) else str(first_v)
        verdict_reason = f"Simulation Failed — {title}"
    elif success:
        verdict_reason = "Simulation Passed — all thresholds met"
    else:
        verdict_reason = "Simulation Failed"

    run = {
        "id": item.get("runId", {}).get("S", ""),
        "scenarioId": item.get("scenarioId", {}).get("S", ""),
        "scenarioName": item.get("scenarioName", {}).get("S", ""),
        "verdict": verdict,
        "verdictReason": verdict_reason,
        "timestamp": item.get("startedAt", {}).get("S", ""),
        "buildNumber": int(item.get("buildNumber", {}).get("N", "0")),
        "robotModel": item.get("robotModel", {}).get("S", ""),
        "durationSeconds": float(item.get("durationS", {}).get("N", "0")),
        "stepsSimulated": int(item.get("stepsSimulated", {}).get("N", "0")),
        "keyMetricLabel": "",
        "keyMetricDeltaDirection": "neutral",
        "metrics": json.loads(item.get("metrics", {}).get("S", "[]")),
        "violations": violations_raw if violations_raw and isinstance(violations_raw[0], dict) else [],
    }
    return _response(200, run)


def _handle_get_scenarios(dynamodb_client) -> dict:
    scenarios_table = os.environ[SCENARIOS_TABLE_NAME_ENV]
    resp = dynamodb_client.scan(TableName=scenarios_table)
    items = resp.get("Items", [])

    scenarios = []
    for item in items:
        scenario = {
            "id": item.get("scenarioId", {}).get("S", ""),
            "name": item.get("name", {}).get("S", item.get("scenarioId", {}).get("S", "")),
            "status": item.get("status", {}).get("S", "draft"),
            "description": item.get("description", {}).get("S", ""),
            "robotModel": item.get("robotModel", {}).get("S", ""),
            "updatedAt": item.get("updatedAt", {}).get("S", ""),
            "runCount": int(item.get("runCount", {}).get("N", "0")),
            "passRate": float(item.get("passRate", {}).get("N", "0")),
        }
        scenarios.append(scenario)

    return _response(200, scenarios)


def _handle_simulate(event: dict, dynamodb_client) -> dict:
    headers = event.get("headers") or {}
    provided_secret = headers.get("x-webhook-secret")
    expected_secret = os.environ.get(WEBHOOK_SECRET_ENV)
    if not provided_secret or provided_secret != expected_secret:
        return _response(401, "Unauthorized")

    try:
        payload = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"error": "Invalid JSON payload"})

    scenario_id = payload.get("scenario_id")
    version = payload.get("version")
    build_number = payload.get("build_number", 0)
    if not scenario_id or not version:
        return _response(400, {"error": "scenario_id and version are required"})

    scenarios_table = os.environ[SCENARIOS_TABLE_NAME_ENV]
    item = dynamodb_client.get_item(
        TableName=scenarios_table,
        Key={"scenarioId": {"S": scenario_id}, "version": {"N": str(version)}},
    ).get("Item")
    if item is None:
        return _response(404, {"error": "Scenario not found"})

    yaml_content = item["yaml_content"]["S"]
    scenario_name = item.get("name", {}).get("S", scenario_id)
    robot_model = item.get("robotModel", {}).get("S", "")
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
        steps_simulated = result.steps_simulated
        failures = result.failures
        violations = [asdict(v) for v in result.violations]
        metrics = [asdict(m) for m in result.metrics]
    except ScenarioRunError as exc:
        success = False
        duration_s = 0.0
        steps_simulated = 0
        failures = [str(exc)]
        violations = []
        metrics = []
        video_uri = ""

    results_table = os.environ[RESULTS_TABLE_NAME_ENV]
    dynamodb_client.put_item(
        TableName=results_table,
        Item={
            "runId": {"S": run_id},
            "scenarioId": {"S": scenario_id},
            "scenarioName": {"S": scenario_name},
            "robotModel": {"S": robot_model or scenario.robot_model},
            "startedAt": {"S": started_at},
            "success": {"BOOL": success},
            "durationS": {"N": str(duration_s)},
            "stepsSimulated": {"N": str(steps_simulated)},
            "buildNumber": {"N": str(build_number)},
            "failures": {"S": json.dumps(failures)},
            "violations": {"S": json.dumps(violations)},
            "metrics": {"S": json.dumps(metrics)},
            "videoUri": {"S": video_uri},
        },
    )

    return _response(200, {"run_id": run_id, "success": success})


def handler(event: dict, context) -> dict:
    method, path = _get_method_and_path(event)

    if method == "OPTIONS":
        return _response(204, "")

    try:
        dynamodb_client = boto3.client("dynamodb")

        if method == "GET":
            if path == "/runs":
                return _handle_get_runs(dynamodb_client)
            if path.startswith("/runs/"):
                run_id = path.split("/runs/", 1)[1]
                return _handle_get_run(dynamodb_client, run_id)
            if path == "/scenarios":
                return _handle_get_scenarios(dynamodb_client)
            return _response(404, {"error": "Not found"})

        if method == "POST":
            return _handle_simulate(event, dynamodb_client)

        return _response(405, {"error": "Method not allowed"})
    except Exception as exc:
        logger.exception("Unhandled error in Lambda handler")
        return _response(500, str(exc))
