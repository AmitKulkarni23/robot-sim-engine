#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CERTS_DIR="$ROOT_DIR/certs"
SIM_DIR="$ROOT_DIR/simulator"
GRAFANA_DIR="$ROOT_DIR/grafana"
TENANTS=("schaeffler" "sap" "siemens" "bosch")
PIDS=()

if [ ! -f "$CERTS_DIR/endpoint.txt" ]; then
  echo "ERROR: Run setup.sh first — no endpoint.txt found in certs/"
  exit 1
fi

IOT_ENDPOINT=$(cat "$CERTS_DIR/endpoint.txt")
echo "=== Telemetry Pipeline Demo ==="
echo "IoT endpoint: $IOT_ENDPOINT"

# Start Grafana
echo ""
echo "[1/2] Starting Grafana (http://localhost:3001, admin/demo1234)..."
cd "$GRAFANA_DIR"
docker compose up -d

# Install simulator deps if needed
echo ""
echo "[2/2] Starting simulators..."
cd "$SIM_DIR"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
fi

cleanup() {
  echo ""
  echo "Stopping simulators..."
  for PID in "${PIDS[@]}"; do
    kill "$PID" 2>/dev/null || true
  done
  wait "${PIDS[@]}" 2>/dev/null || true
  echo "Stopping Grafana..."
  cd "$GRAFANA_DIR" && docker compose down
  echo "Done."
}
trap cleanup EXIT INT TERM

for TENANT in "${TENANTS[@]}"; do
  echo "  Starting simulator: $TENANT"
  .venv/bin/python agent.py \
    --tenant "$TENANT" \
    --endpoint "$IOT_ENDPOINT" \
    --certs-dir "$CERTS_DIR" &
  PIDS+=($!)
done

echo ""
echo "=== All 4 tenants publishing ==="
echo "Grafana: http://localhost:3001 (admin / demo1234)"
echo "Press Ctrl+C to stop"
echo ""

wait
