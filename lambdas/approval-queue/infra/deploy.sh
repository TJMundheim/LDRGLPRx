#!/usr/bin/env bash
# deploy.sh — build, package, and deploy the approval-queue Lambdas.
# Creates: my4mlife-approval-queue-dispatch + my4mlife-approval-queue-respond
# Idempotent: creates IAM roles + Lambdas on first run, updates on subsequent runs.
set -euo pipefail

REGION="us-east-2"
DISPATCH_FN="my4mlife-approval-queue-dispatch"
RESPOND_FN="my4mlife-approval-queue-respond"
DISPATCH_ROLE="my4mlife-approval-queue-dispatch-role"
RESPOND_ROLE="my4mlife-approval-queue-respond-role"
HTTP_API_ID="v9svm8ds74"
RUNTIME="nodejs24.x"
TIMEOUT=15
MEMORY=256
APPROVAL_BASE_URL="https://api.my4mlife.com"
APPROVAL_TO="drtj@my4mlife.com"
EMAIL_SENDER_FN="my4mlife-email-sender"
HMAC_SECRET_ID="approval-queue-hmac-key"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

log() { echo "==> $*"; }

# ── Build ─────────────────────────────────────────────────────────────────────
log "Build"
cd "$ROOT"
pnpm install --frozen-lockfile
pnpm build
cd dist
zip -q -FS dispatch-handler.zip dispatch-handler.js
zip -q -FS respond-handler.zip  respond-handler.js
cd "$ROOT"

# ── HMAC secret (create if missing) ──────────────────────────────────────────
log "Ensure HMAC secret: $HMAC_SECRET_ID"
HMAC_ARN=""
if aws secretsmanager describe-secret --secret-id "$HMAC_SECRET_ID" --region "$REGION" >/dev/null 2>&1; then
  log "  Secret already exists."
  HMAC_ARN="$(aws secretsmanager describe-secret --secret-id "$HMAC_SECRET_ID" --region "$REGION" --query ARN --output text)"
else
  log "  Creating secret with random 32-byte key..."
  RANDOM_KEY="$(openssl rand -hex 32)"
  HMAC_ARN="$(aws secretsmanager create-secret \
    --name "$HMAC_SECRET_ID" \
    --region "$REGION" \
    --secret-string "{\"key\":\"$RANDOM_KEY\"}" \
    --query ARN --output text)"
  log "  Created: $HMAC_ARN"
fi

HMAC_SECRET_ARN_WILDCARD="arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:${HMAC_SECRET_ID}-*"
EMAIL_SENDER_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${EMAIL_SENDER_FN}"
DDB_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ApprovalRequests"

# ── IAM role helper ───────────────────────────────────────────────────────────
ensure_role() {
  local role="$1"
  if ! aws iam get-role --role-name "$role" >/dev/null 2>&1; then
    aws iam create-role --role-name "$role" \
      --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
    aws iam attach-role-policy --role-name "$role" \
      --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    log "  Role $role created — waiting for propagation..."; sleep 10
  fi
}

# ── Dispatch role ─────────────────────────────────────────────────────────────
log "IAM: dispatch role"
ensure_role "$DISPATCH_ROLE"
aws iam put-role-policy --role-name "$DISPATCH_ROLE" --policy-name approval-dispatch-policy \
  --policy-document "$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:UpdateItem"],
      "Resource": "$DDB_ARN"
    },
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "$HMAC_SECRET_ARN_WILDCARD"
    },
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "$EMAIL_SENDER_ARN"
    }
  ]
}
EOF
)" >/dev/null

# ── Respond role ──────────────────────────────────────────────────────────────
log "IAM: respond role"
ensure_role "$RESPOND_ROLE"
aws iam put-role-policy --role-name "$RESPOND_ROLE" --policy-name approval-respond-policy \
  --policy-document "$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:UpdateItem"],
      "Resource": "$DDB_ARN"
    },
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "$HMAC_SECRET_ARN_WILDCARD"
    }
  ]
}
EOF
)" >/dev/null

# ── Lambda deploy helper ──────────────────────────────────────────────────────
deploy_lambda() {
  local fn="$1" role="$2" handler="$3" zip="$4"
  local role_arn="arn:aws:iam::${ACCOUNT_ID}:role/${role}"
  local env_vars="Variables={APPROVAL_BASE_URL=$APPROVAL_BASE_URL,APPROVAL_TO=$APPROVAL_TO,EMAIL_SENDER_FN=$EMAIL_SENDER_FN}"

  if aws lambda get-function --function-name "$fn" --region "$REGION" >/dev/null 2>&1; then
    log "  Updating $fn code..."
    aws lambda update-function-code --function-name "$fn" --region "$REGION" \
      --zip-file "fileb://dist/${zip}" >/dev/null
    aws lambda wait function-updated --function-name "$fn" --region "$REGION"
    aws lambda update-function-configuration --function-name "$fn" --region "$REGION" \
      --runtime "$RUNTIME" --handler "$handler" --timeout "$TIMEOUT" --memory-size "$MEMORY" \
      --environment "$env_vars" >/dev/null
  else
    log "  Creating $fn..."
    aws lambda create-function --function-name "$fn" --region "$REGION" \
      --runtime "$RUNTIME" --role "$role_arn" --handler "$handler" \
      --timeout "$TIMEOUT" --memory-size "$MEMORY" \
      --environment "$env_vars" \
      --zip-file "fileb://dist/${zip}" >/dev/null
  fi
  aws lambda wait function-active --function-name "$fn" --region "$REGION"
  log "  $fn active."
}

log "Deploy: $DISPATCH_FN"
deploy_lambda "$DISPATCH_FN" "$DISPATCH_ROLE" "dispatch-handler.handler" "dispatch-handler.zip"

log "Deploy: $RESPOND_FN"
deploy_lambda "$RESPOND_FN" "$RESPOND_ROLE" "respond-handler.handler" "respond-handler.zip"

# ── Wire GET /api/approve on HTTP API ────────────────────────────────────────
log "Wire HTTP API route GET /api/approve → $RESPOND_FN"

RESPOND_FN_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${RESPOND_FN}"

# Create or reuse integration
EXISTING_INT="$(aws apigatewayv2 get-integrations --api-id "$HTTP_API_ID" --region "$REGION" \
  --query "Items[?IntegrationUri=='$RESPOND_FN_ARN'].IntegrationId" --output text 2>/dev/null || true)"

if [[ -z "$EXISTING_INT" ]]; then
  INTEGRATION_ID="$(aws apigatewayv2 create-integration --api-id "$HTTP_API_ID" --region "$REGION" \
    --integration-type AWS_PROXY --integration-uri "$RESPOND_FN_ARN" \
    --payload-format-version 2.0 \
    --query IntegrationId --output text)"
  log "  Created integration $INTEGRATION_ID"
else
  INTEGRATION_ID="$EXISTING_INT"
  log "  Reusing integration $INTEGRATION_ID"
fi

# Create or reuse route
EXISTING_ROUTE="$(aws apigatewayv2 get-routes --api-id "$HTTP_API_ID" --region "$REGION" \
  --query "Items[?RouteKey=='GET /api/approve'].RouteId" --output text 2>/dev/null || true)"

if [[ -z "$EXISTING_ROUTE" ]]; then
  aws apigatewayv2 create-route --api-id "$HTTP_API_ID" --region "$REGION" \
    --route-key "GET /api/approve" \
    --target "integrations/$INTEGRATION_ID" \
    --authorization-type NONE >/dev/null
  log "  Route GET /api/approve created."
else
  aws apigatewayv2 update-route --api-id "$HTTP_API_ID" --region "$REGION" \
    --route-id "$EXISTING_ROUTE" \
    --target "integrations/$INTEGRATION_ID" >/dev/null
  log "  Route GET /api/approve updated."
fi

# Lambda permission for API GW
API_ARN="arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${HTTP_API_ID}/*/*/api/approve"
aws lambda remove-permission --function-name "$RESPOND_FN" --region "$REGION" \
  --statement-id apigw-approval-respond >/dev/null 2>&1 || true
aws lambda add-permission --function-name "$RESPOND_FN" --region "$REGION" \
  --statement-id apigw-approval-respond \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "$API_ARN" >/dev/null
log "  Lambda permission granted."

log "Done. Both Lambdas deployed, route wired."
