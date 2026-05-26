#!/usr/bin/env bash
# deploy.sh — build, provision IAM, create/update Lambda, wire EventBridge cron.
# Idempotent. Run from any directory.
set -euo pipefail

FUNCTION_NAME="my4mlife-daily-digest"
ROLE_NAME="my4mlife-daily-digest-role"
REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
EMAIL_SENDER_FN="my4mlife-email-sender"
DIGEST_TO="drtj@my4mlife.com"
RULE_NAME="daily-digest-6am-et"

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
      "Action": ["dynamodb:Scan","dynamodb:Query"],
      "Resource": [
        "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/AgentRuns",
        "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/ApprovalRequests",
        "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/Contact",
        "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/Events"
      ]
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
ENV_VARS="Variables={EMAIL_SENDER_FN=$EMAIL_SENDER_FN,DIGEST_TO=$DIGEST_TO}"

if $AWS lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  $AWS lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" >/dev/null
  $AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
  $AWS lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --environment "$ENV_VARS" \
    --timeout 60 >/dev/null
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
    --timeout 60 \
    --memory-size 256 >/dev/null
  log "Lambda created."
fi

$AWS lambda wait function-active --function-name "$FUNCTION_NAME"
LAMBDA_ARN="arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$FUNCTION_NAME"

# ── 4. EventBridge rule ───────────────────────────────────────────────────────
log "Ensuring EventBridge rule $RULE_NAME (cron 0 11 * * ? * = 6 AM ET)..."
$AWS events put-rule \
  --name "$RULE_NAME" \
  --schedule-expression "cron(0 11 * * ? *)" \
  --state ENABLED \
  --description "Fires daily at 11:00 UTC (6 AM ET) to send TJ's daily digest" >/dev/null

# Ensure Lambda permission for EventBridge
$AWS lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --statement-id "eventbridge-daily-digest" \
  --action "lambda:InvokeFunction" \
  --principal "events.amazonaws.com" \
  --source-arn "arn:aws:events:$REGION:$AWS_ACCOUNT_ID:rule/$RULE_NAME" \
  2>/dev/null || true

$AWS events put-targets \
  --rule "$RULE_NAME" \
  --targets "Id=daily-digest-target,Arn=$LAMBDA_ARN" >/dev/null

log "EventBridge rule + target wired."
log "Done. Lambda: $LAMBDA_ARN | Rule: $RULE_NAME fires cron(0 11 * * ? *)"
