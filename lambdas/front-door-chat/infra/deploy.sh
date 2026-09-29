#!/usr/bin/env bash
# deploy.sh — build, provision IAM role, create/update Lambda, wire POST /api/chat.
# Idempotent. Run from any directory.
#
# The embedding index ships inside the zip when it fits; if the packaged zip
# would exceed the 50 MB direct-upload limit the index is uploaded to S3 and the
# Lambda reads it at cold start instead (INDEX_S3_BUCKET/INDEX_S3_KEY).
set -euo pipefail

FUNCTION_NAME="my4mlife-front-door-chat"
ROLE_NAME="my4mlife-front-door-chat-role"
REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
API_ID="v9svm8ds74"
BEDROCK_MODEL="us.anthropic.claude-haiku-4-5-20251001-v1:0"
EMBED_MODEL="amazon.titan-embed-text-v2:0"
CONVERSATIONS_TABLE="Conversations"
INDEX_BUCKET="my4mlife-digital-fulfillment"
INDEX_KEY="front-door/chunks.json"
ZIP_LIMIT_BYTES=$((50 * 1024 * 1024))

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AWS="aws --region $REGION"

log() { echo "==> $*"; }

# ── 1. Build ──────────────────────────────────────────────────────────────────
log "Installing dependencies..."
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile

log "Building with esbuild..."
pnpm build

# Prefer the real index; fall back to the fixture so a deploy is never blocked.
INDEX_SRC="$SCRIPT_DIR/index/chunks.json"
if [[ ! -f "$INDEX_SRC" ]]; then
  log "WARNING: index/chunks.json not found — packaging the 5-chunk fixture instead."
  INDEX_SRC="$SCRIPT_DIR/index/chunks.sample.json"
fi

log "Packaging dist/handler.zip (index: $(basename "$INDEX_SRC"))..."
rm -rf "$SCRIPT_DIR/dist/index"
mkdir -p "$SCRIPT_DIR/dist/index"
cp "$INDEX_SRC" "$SCRIPT_DIR/dist/index/chunks.json"
cd "$SCRIPT_DIR/dist"
rm -f handler.zip
zip -qr handler.zip handler.js index
ZIP_BYTES=$(wc -c < handler.zip | tr -d ' ')
log "Zip is $((ZIP_BYTES / 1024 / 1024)) MB."

USE_S3_INDEX=0
if (( ZIP_BYTES > ZIP_LIMIT_BYTES )); then
  log "Zip over 50 MB — moving the index to s3://$INDEX_BUCKET/$INDEX_KEY."
  $AWS s3 cp "$INDEX_SRC" "s3://$INDEX_BUCKET/$INDEX_KEY" >/dev/null
  rm -rf "$SCRIPT_DIR/dist/index"
  rm -f handler.zip
  zip -q handler.zip handler.js
  USE_S3_INDEX=1
fi
cd "$SCRIPT_DIR"

# ── 2. IAM role ───────────────────────────────────────────────────────────────
log "Ensuring IAM role $ROLE_NAME..."
TRUST_DOC='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

if ! $AWS iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  $AWS iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST_DOC" >/dev/null
  log "Role created. Waiting for propagation..."
  sleep 10
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
      "Action": ["bedrock:InvokeModel"],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/*",
        "arn:aws:bedrock:*:$AWS_ACCOUNT_ID:inference-profile/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$CONVERSATIONS_TABLE"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::$INDEX_BUCKET/front-door/*"
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

# ── 3. Conversations TTL (30-day anonymous transcripts) ───────────────────────
TTL_STATUS=$($AWS dynamodb describe-time-to-live --table-name "$CONVERSATIONS_TABLE" \
  --query "TimeToLiveDescription.TimeToLiveStatus" --output text 2>/dev/null || echo "UNKNOWN")
if [[ "$TTL_STATUS" == "DISABLED" ]]; then
  log "Enabling TTL on $CONVERSATIONS_TABLE (attribute: ttl)..."
  $AWS dynamodb update-time-to-live --table-name "$CONVERSATIONS_TABLE" \
    --time-to-live-specification "Enabled=true,AttributeName=ttl" >/dev/null
else
  log "Conversations TTL: $TTL_STATUS."
fi

# ── 4. Lambda create or update ────────────────────────────────────────────────
log "Deploying Lambda $FUNCTION_NAME..."
ENV_FILE="$(mktemp)"
if (( USE_S3_INDEX == 1 )); then
  INDEX_VARS="\"INDEX_S3_BUCKET\":\"$INDEX_BUCKET\",\"INDEX_S3_KEY\":\"$INDEX_KEY\","
else
  INDEX_VARS="\"INDEX_PATH\":\"/var/task/index/chunks.json\","
fi
cat > "$ENV_FILE" <<JSON
{"Variables":{"BEDROCK_MODEL":"$BEDROCK_MODEL","EMBED_MODEL":"$EMBED_MODEL","CONVERSATIONS_TABLE":"$CONVERSATIONS_TABLE",$INDEX_VARS"NODE_OPTIONS":"--max-old-space-size=1536"}}
JSON
ENV_VARS="file://$ENV_FILE"

if $AWS lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  $AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
  $AWS lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" >/dev/null
  $AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
  $AWS lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --environment "$ENV_VARS" \
    --timeout 25 --memory-size 2048 >/dev/null
  log "Lambda updated."
else
  $AWS lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs20.x \
    --role "$ROLE_ARN" \
    --handler handler.handler \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" \
    --environment "$ENV_VARS" \
    --timeout 25 \
    --memory-size 2048 >/dev/null
  log "Lambda created."
fi

$AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
$AWS lambda wait function-active --function-name "$FUNCTION_NAME"

# ── 5. HTTP API route ─────────────────────────────────────────────────────────
log "Wiring HTTP API route POST /api/chat..."
ROUTE_KEY="POST /api/chat"

EXISTING_ROUTE=$($AWS apigatewayv2 get-routes --api-id "$API_ID" \
  --query "Items[?RouteKey=='$ROUTE_KEY'].RouteId | [0]" --output text)

if [[ "$EXISTING_ROUTE" != "None" && -n "$EXISTING_ROUTE" ]]; then
  log "Route already exists ($EXISTING_ROUTE). Skipping."
else
  LAMBDA_ARN="arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$FUNCTION_NAME"

  $AWS lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "apigateway-front-door-chat" \
    --action "lambda:InvokeFunction" \
    --principal "apigateway.amazonaws.com" \
    --source-arn "arn:aws:execute-api:$REGION:$AWS_ACCOUNT_ID:$API_ID/*/*/api/chat" \
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

# ── 6. Throttling (cost guard) ────────────────────────────────────────────────
log "Applying per-route throttles..."
bash "$REPO_ROOT/infra/api-throttling.sh" >/dev/null

log "Done. Endpoint: https://$API_ID.execute-api.$REGION.amazonaws.com/api/chat"
