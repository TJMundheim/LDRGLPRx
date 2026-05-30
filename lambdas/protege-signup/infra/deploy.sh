#!/usr/bin/env bash
# deploy.sh — build, provision IAM role, create/update Lambda, wire HTTP API route.
# Idempotent. Run from any directory.
set -euo pipefail

FUNCTION_NAME="my4mlife-protege-signup"
ROLE_NAME="my4mlife-protege-signup-role"
REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
USER_POOL_ID="us-east-2_kIpKnr17R"
CONTACT_TABLE="Contact"
USER_PROFILE_TABLE="Users"
API_ID="v9svm8ds74"
EMAIL_SENDER_FN="my4mlife-email-sender"

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
      "Action": ["cognito-idp:AdminCreateUser","cognito-idp:AdminGetUser"],
      "Resource": "arn:aws:cognito-idp:$REGION:$AWS_ACCOUNT_ID:userpool/$USER_POOL_ID"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem","dynamodb:UpdateItem","dynamodb:GetItem"],
      "Resource": "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$CONTACT_TABLE"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem","dynamodb:UpdateItem","dynamodb:GetItem"],
      "Resource": "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$USER_PROFILE_TABLE"
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

$AWS iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "${ROLE_NAME}-policy" \
  --policy-document "$INLINE_POLICY"
log "Role policy updated."

ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME"

# ── 3. Lambda create or update ────────────────────────────────────────────────
log "Deploying Lambda $FUNCTION_NAME..."
ENV_VARS="Variables={CONTACT_TABLE=$CONTACT_TABLE,USER_PROFILE_TABLE=$USER_PROFILE_TABLE,COGNITO_USER_POOL_ID=$USER_POOL_ID,EMAIL_SENDER_FN=$EMAIL_SENDER_FN}"

if $AWS lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  $AWS lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" >/dev/null
  # Wait for update to complete before updating config
  $AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
  $AWS lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --environment "$ENV_VARS" >/dev/null
  log "Lambda updated."
else
  # Brief sleep to let IAM propagate
  sleep 8
  $AWS lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs20.x \
    --role "$ROLE_ARN" \
    --handler handler.handler \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" \
    --environment "$ENV_VARS" \
    --timeout 15 \
    --memory-size 256 >/dev/null
  log "Lambda created."
fi

$AWS lambda wait function-active --function-name "$FUNCTION_NAME"

# ── 4. HTTP API route ─────────────────────────────────────────────────────────
log "Wiring HTTP API route POST /api/protege-signup..."
ROUTE_KEY="POST /api/protege-signup"

# Check if integration already exists
EXISTING_ROUTE=$($AWS apigatewayv2 get-routes --api-id "$API_ID" \
  --query "Items[?RouteKey=='$ROUTE_KEY'].RouteId | [0]" --output text)

if [[ "$EXISTING_ROUTE" != "None" && -n "$EXISTING_ROUTE" ]]; then
  log "Route already exists ($EXISTING_ROUTE). Skipping."
else
  LAMBDA_ARN="arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$FUNCTION_NAME"

  # Ensure Lambda permission for API Gateway
  $AWS lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "apigateway-protege-signup" \
    --action "lambda:InvokeFunction" \
    --principal "apigateway.amazonaws.com" \
    --source-arn "arn:aws:execute-api:$REGION:$AWS_ACCOUNT_ID:$API_ID/*/*/api/protege-signup" \
    2>/dev/null || true

  # Create integration
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

log "Done. Endpoint: https://$API_ID.execute-api.$REGION.amazonaws.com/api/protege-signup"
