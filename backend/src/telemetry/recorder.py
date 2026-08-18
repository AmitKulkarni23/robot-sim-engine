"""Upload telemetry JSON to S3."""
from __future__ import annotations

import json
import os

import boto3

from .models import TelemetryBundle

TELEMETRY_BUCKET_NAME_ENV = "VIDEO_BUCKET_NAME_ENV"


def upload_telemetry(bundle: TelemetryBundle, scenario_id: str, run_id: str) -> str:
    """Serialize telemetry to JSON, upload to S3, return the URI."""
    bucket_name = os.environ[TELEMETRY_BUCKET_NAME_ENV]
    key = f"{scenario_id}/{run_id}/telemetry.json"
    client = boto3.client("s3")
    client.put_object(
        Bucket=bucket_name,
        Key=key,
        Body=json.dumps(bundle.to_dict()),
        ContentType="application/json",
    )
    return f"s3://{bucket_name}/{key}"
