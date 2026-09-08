#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$(cd "$ROOT_DIR/../infra" && pwd)"
CERTS_DIR="$ROOT_DIR/certs"
TENANTS=("schaeffler" "sap" "siemens" "bosch")

echo "=== Telemetry Pipeline Teardown ==="

# Step 1: Clean up IoT things, certs, policies
echo ""
echo "[1/3] Removing IoT things, certificates, and policies..."
for TENANT in "${TENANTS[@]}"; do
  THING_NAME="robot-sim-${TENANT}"
  POLICY_NAME="robot-sim-${TENANT}-policy"
  CERT_ARN_FILE="$CERTS_DIR/${TENANT}.cert-arn.txt"

  if [ -f "$CERT_ARN_FILE" ]; then
    CERT_ARN=$(cat "$CERT_ARN_FILE")
    CERT_ID=$(echo "$CERT_ARN" | grep -o '[^/]*$')

    echo "  Detaching $TENANT..."
    aws iot detach-thing-principal --thing-name "$THING_NAME" --principal "$CERT_ARN" 2>/dev/null || true
    aws iot detach-policy --policy-name "$POLICY_NAME" --target "$CERT_ARN" 2>/dev/null || true

    echo "  Revoking and deleting certificate..."
    aws iot update-certificate --certificate-id "$CERT_ID" --new-status INACTIVE 2>/dev/null || true
    aws iot delete-certificate --certificate-id "$CERT_ID" --force-delete 2>/dev/null || true
  fi

  echo "  Deleting policy: $POLICY_NAME"
  aws iot delete-policy --policy-name "$POLICY_NAME" 2>/dev/null || true

  echo "  Deleting thing: $THING_NAME"
  aws iot delete-thing --thing-name "$THING_NAME" 2>/dev/null || true

  echo "  ✓ $TENANT cleaned up"
done

# Step 2: Remove local certs
echo ""
echo "[2/3] Removing local certificates..."
rm -rf "$CERTS_DIR"
echo "  ✓ Certs removed"

# Step 3: Destroy CDK stack
echo ""
echo "[3/3] Destroying TelemetryPipelineStack..."
cd "$INFRA_DIR"
bunx cdk destroy TelemetryPipelineStack --force

echo ""
echo "=== Teardown Complete ==="
