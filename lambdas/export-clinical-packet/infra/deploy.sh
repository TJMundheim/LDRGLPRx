#!/usr/bin/env bash
# deploy.sh — build, provision IAM role, create/update Lambda, wire HTTP API route.
# Idempotent. Run from any directory.
set -euo pipefail

FUNCTION_NAME="my4mlife-export-clinical-packet"
ROLE_NAME="my4mlife-export-clinical-packet-role"
REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
PATIENT_RECORDS_TABLE="PatientRecords"
PACKET_BUCKET="my4mlife-digital-fulfillment"
API_ID="v9svm8ds74"

# AUTH: shared-secret key compared to x-packet-key header in the Lambda.
# Sourced from AWS Secrets Manager (created out-of-band; never committed).
# Rotate with: aws secretsmanager put-secret-value --secret-id export-clinical-packet-key --secret-string <new>
PACKET_API_KEY="${PACKET_API_KEY:-$(aws secretsmanager get-secret-value --secret-id export-clinical-packet-key --query SecretString --output text --region "$REGION")}"
if [ -z "$PACKET_API_KEY" ] || [ "$PACKET_API_KEY" = "None" ]; then
  echo "ERROR: PACKET_API_KEY unset and secret export-clinical-packet-key not found" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS="aws --region $REGION"

log() { echo "==> $*"; }

# ── 1. Build ──────────────────────────────────────────────────────────────────
log "Installing dependencies..."
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile

log "Building with esbuild..."
pnpm build

log "Packaging dist/handler.zip..."
cd "$SCRIPT_DIR/dist"
rm -f handler.zip
zip -q handler.zip handler.js
cd "$SCRIPT_DIR"

# ── 2. IAM role ───────────────────────────────────────────────────────────────
log "Ensuring IAM role $ROLE_NAME..."
TRUST_DOC='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

if ! $AWS iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  $AWS iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST_DOC" >/dev/null
  log "Role created."
fi

INLINE_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],
      "Resource": "arn:aws:logs:$REGION:$AWS_ACCOUNT_ID:log-group:/aws/lambda/$FUNCTION_NAME:*"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$PATIENT_RECORDS_TABLE"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject","s3:PutObject"],
      "Resource": "arn:aws:s3:::$PACKET_BUCKET/*"
    }
  ]
}
EOF
)

$AWS iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "${ROLE_NAME}-policy" \
  --policy-document "$INLINE_POLICY"
log "Role policy updated."

ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME"

# ── 3. Lambda create or update ────────────────────────────────────────────────
log "Deploying Lambda $FUNCTION_NAME..."
ENV_VARS="Variables={PATIENT_RECORDS_TABLE=$PATIENT_RECORDS_TABLE,PACKET_BUCKET=$PACKET_BUCKET,PACKET_API_KEY=$PACKET_API_KEY}"

if $AWS lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  $AWS lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" >/dev/null
  $AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
  $AWS lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --environment "$ENV_VARS" >/dev/null
  log "Lambda updated."
else
  sleep 8
  $AWS lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs20.x \
    --role "$ROLE_ARN" \
    --handler handler.handler \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" \
    --environment "$ENV_VARS" \
    --timeout 30 \
    --memory-size 256 >/dev/null
  log "Lambda created."
fi

$AWS lambda wait function-active --function-name "$FUNCTION_NAME"

# ── 4. HTTP API route ─────────────────────────────────────────────────────────
log "Wiring HTTP API route POST /api/export-clinical-packet..."
ROUTE_KEY="POST /api/export-clinical-packet"

EXISTING_ROUTE=$($AWS apigatewayv2 get-routes --api-id "$API_ID" \
  --query "Items[?RouteKey=='$ROUTE_KEY'].RouteId | [0]" --output text)

if [[ "$EXISTING_ROUTE" != "None" && -n "$EXISTING_ROUTE" ]]; then
  log "Route already exists ($EXISTING_ROUTE). Skipping."
else
  LAMBDA_ARN="arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$FUNCTION_NAME"

  $AWS lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "apigateway-export-clinical-packet" \
    --action "lambda:InvokeFunction" \
    --principal "apigateway.amazonaws.com" \
    --source-arn "arn:aws:execute-api:$REGION:$AWS_ACCOUNT_ID:$API_ID/*/*/api/export-clinical-packet" \
    2>/dev/null || true

  INTEGRATION_ID=$($AWS apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-uri "$LAMBDA_ARN" \
    --payload-format-version "2.0" \
    --query "IntegrationId" --output text)

  $AWS apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "$ROUTE_KEY" \
    --target "integrations/$INTEGRATION_ID" >/dev/null
  log "Route created: $ROUTE_KEY -> $INTEGRATION_ID"
fi

log "Done. Endpoint: https://$API_ID.execute-api.$REGION.amazonaws.com/api/export-clinical-packet"
