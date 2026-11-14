#!/usr/bin/env bash
# deploy.sh — IAM role, Lambda, HTTP API route (no table). Idempotent. (Pattern: lambdas/lead-capture/infra/deploy.sh)
set -euo pipefail

FUNCTION_NAME="my4mlife-ud-calculator-report"
ROLE_NAME="my4mlife-ud-calculator-report-role"
REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
CONTACT_TABLE="Contact"
EMAIL_SENDER_FN="my4mlife-email-sender"
API_ID="v9svm8ds74"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS="aws --region $REGION"

log() { echo "==> $*"; }

# ── 1. Build ──────────────────────────────────────────────────────────────────
log "Installing dependencies..."
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile

log "Running tests..."
pnpm test

log "Building with esbuild..."
pnpm build
(cd "$SCRIPT_DIR/dist" && rm -f handler.zip && zip -q handler.zip handler.js)

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
      "Action": ["dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$CONTACT_TABLE"
    },
    {
      "Effect": "Allow",
      "Action": ["lambda:InvokeFunction"],
      "Resource": "arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$EMAIL_SENDER_FN"
    }
  ]
}
EOF
)
$AWS iam put-role-policy --role-name "$ROLE_NAME" --policy-name "${ROLE_NAME}-policy" --policy-document "$INLINE_POLICY"
log "Role policy updated."
ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME"

# ── 3. Lambda create or update ────────────────────────────────────────────────
log "Deploying Lambda $FUNCTION_NAME..."
ENV_VARS="Variables={CONTACT_TABLE=$CONTACT_TABLE,EMAIL_SENDER_FN=$EMAIL_SENDER_FN}"

if $AWS lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  $AWS lambda update-function-code --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" >/dev/null
  $AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
  $AWS lambda update-function-configuration --runtime nodejs24.x --timeout 20 --memory-size 256 \
    --function-name "$FUNCTION_NAME" --environment "$ENV_VARS" >/dev/null
  log "Lambda updated."
else
  sleep 8
  $AWS lambda create-function --function-name "$FUNCTION_NAME" --runtime nodejs24.x \
    --role "$ROLE_ARN" --handler handler.handler \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" --environment "$ENV_VARS" \
    --timeout 20 --memory-size 256 >/dev/null
  log "Lambda created."
fi
$AWS lambda wait function-active --function-name "$FUNCTION_NAME"

# ── 4. HTTP API route ─────────────────────────────────────────────────────────
# Each piece (permission, integration, POST route, OPTIONS route) is checked on its own,
# so a re-run after a partial failure completes the wiring without duplicates.
ROUTE_PATH="/api/ud-calculator-report"
LAMBDA_ARN="arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$FUNCTION_NAME"
STATEMENT_ID="apigateway-ud-calculator-report"
first_id() { tr '\t' '\n' | grep -v -e '^None$' -e '^$' | head -n 1 || true; }
log "Wiring HTTP API route POST $ROUTE_PATH..."

if $AWS lambda get-policy --function-name "$FUNCTION_NAME" --query Policy --output text 2>/dev/null | grep -q "$STATEMENT_ID"; then
  log "Invoke permission exists."
else
  $AWS lambda add-permission --function-name "$FUNCTION_NAME" \
    --statement-id "$STATEMENT_ID" \
    --action "lambda:InvokeFunction" --principal "apigateway.amazonaws.com" \
    --source-arn "arn:aws:execute-api:$REGION:$AWS_ACCOUNT_ID:$API_ID/*/*$ROUTE_PATH" >/dev/null
  log "Invoke permission added."
fi

INTEGRATION_ID=$($AWS apigatewayv2 get-integrations --api-id "$API_ID" \
  --query "Items[?IntegrationUri=='$LAMBDA_ARN'].IntegrationId" --output text | first_id)
if [[ -z "$INTEGRATION_ID" ]]; then
  INTEGRATION_ID=$($AWS apigatewayv2 create-integration --api-id "$API_ID" \
    --integration-type AWS_PROXY --integration-uri "$LAMBDA_ARN" \
    --payload-format-version "2.0" --query "IntegrationId" --output text)
  log "Integration created ($INTEGRATION_ID)."
else
  log "Integration exists ($INTEGRATION_ID)."
fi

# OPTIONS is answered by the API's CORS config; the route is kept for parity with lead-capture.
for METHOD in POST OPTIONS; do
  ROUTE_KEY="$METHOD $ROUTE_PATH"
  EXISTING_ROUTE=$($AWS apigatewayv2 get-routes --api-id "$API_ID" \
    --query "Items[?RouteKey=='$ROUTE_KEY'].RouteId" --output text | first_id)
  if [[ -n "$EXISTING_ROUTE" ]]; then
    log "Route exists: $ROUTE_KEY ($EXISTING_ROUTE)."
  else
    $AWS apigatewayv2 create-route --api-id "$API_ID" --route-key "$ROUTE_KEY" \
      --target "integrations/$INTEGRATION_ID" >/dev/null
    log "Route created: $ROUTE_KEY -> $INTEGRATION_ID"
  fi
done

log "Done. Endpoint: https://$API_ID.execute-api.$REGION.amazonaws.com/api/ud-calculator-report"
