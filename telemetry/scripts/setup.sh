#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$(cd "$ROOT_DIR/../infra" && pwd)"
CERTS_DIR="$ROOT_DIR/certs"
TENANTS=("schaeffler" "sap" "siemens" "bosch")

echo "=== Telemetry Pipeline Setup ==="

# Step 1: Deploy CDK stack
echo ""
echo "[1/4] Deploying TelemetryPipelineStack..."
cd "$INFRA_DIR"
bunx cdk deploy TelemetryPipelineStack --require-approval never

# Step 2: Get IoT endpoint
echo ""
echo "[2/4] Getting IoT Core endpoint..."
IOT_ENDPOINT=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS --query 'endpointAddress' --output text)
echo "IoT endpoint: $IOT_ENDPOINT"
echo "$IOT_ENDPOINT" > "$CERTS_DIR/endpoint.txt"

# Step 3: Download root CA
echo ""
echo "[3/4] Downloading Amazon Root CA..."
mkdir -p "$CERTS_DIR"
curl -s -o "$CERTS_DIR/AmazonRootCA1.pem" \
  https://www.amazontrust.com/repository/AmazonRootCA1.pem
echo "Root CA saved to $CERTS_DIR/AmazonRootCA1.pem"

# Step 4: Create IoT things, certs, and policies per tenant
echo ""
echo "[4/4] Provisioning IoT things and certificates..."
for TENANT in "${TENANTS[@]}"; do
  THING_NAME="robot-sim-${TENANT}"
  POLICY_NAME="robot-sim-${TENANT}-policy"

  echo "  Creating thing: $THING_NAME"
  aws iot create-thing --thing-name "$THING_NAME" 2>/dev/null || true

  echo "  Creating certificate for $TENANT..."
  CERT_OUTPUT=$(aws iot create-keys-and-certificate \
    --set-as-active \
    --certificate-pem-outfile "$CERTS_DIR/${TENANT}.cert.pem" \
    --private-key-outfile "$CERTS_DIR/${TENANT}.private.key" \
    --public-key-outfile "$CERTS_DIR/${TENANT}.public.key" \
    --output json)

  CERT_ARN=$(echo "$CERT_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['certificateArn'])")
  echo "$CERT_ARN" > "$CERTS_DIR/${TENANT}.cert-arn.txt"

  echo "  Creating policy: $POLICY_NAME"
  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  REGION=$(aws configure get region || echo "$AWS_DEFAULT_REGION")

  POLICY_DOC=$(cat <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "arn:aws:iot:${REGION}:${ACCOUNT_ID}:client/${TENANT}-*"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Publish",
      "Resource": "arn:aws:iot:${REGION}:${ACCOUNT_ID}:topic/dt/${TENANT}/*"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Subscribe",
      "Resource": "arn:aws:iot:${REGION}:${ACCOUNT_ID}:topicfilter/dt/${TENANT}/*"
    }
  ]
}
POLICY
)

  aws iot create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document "$POLICY_DOC" 2>/dev/null || \
  aws iot create-policy-version \
    --policy-name "$POLICY_NAME" \
    --policy-document "$POLICY_DOC" \
    --set-as-default 2>/dev/null || true

  aws iot attach-policy --policy-name "$POLICY_NAME" --target "$CERT_ARN"
  aws iot attach-thing-principal --thing-name "$THING_NAME" --principal "$CERT_ARN"

  echo "  ✓ $TENANT provisioned"
done

echo ""
echo "=== Setup Complete ==="
echo "IoT endpoint: $IOT_ENDPOINT"
echo "Certs directory: $CERTS_DIR"
echo ""
echo "Optional: Subscribe an email to fault alerts"
echo "  aws sns subscribe --topic-arn \$(aws sns list-topics --query 'Topics[?contains(TopicArn, \`robot-sim-fault-alerts\`)].TopicArn' --output text) --protocol email --notification-endpoint YOUR_EMAIL"
echo ""
echo "Next: ./run.sh"
