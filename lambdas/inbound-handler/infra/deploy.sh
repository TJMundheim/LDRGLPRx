#!/usr/bin/env bash
# deploy.sh — build, provision IAM role, create/update the inbound-handler Lambda.
# Idempotent. Run from any directory.
#
# NOTE: This deploys the function only. The SES inbound-email trigger (active
# receipt rule set + S3 inbound bucket + MX records) is NOT wired here — the
# domain's MX currently points to Google Workspace, so standing up SES inbound
# receiving is a separate, deliberate infra step. Until then the function is
# deployed but dormant (nothing invokes it).
set -euo pipefail

FUNCTION_NAME="my4mlife-inbound-handler"
ROLE_NAME="my4mlife-inbound-handler-role"
REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
RUNTIME="nodejs20.x"
HANDLER="handler.handler"
TIMEOUT=30
MEMORY=512

CONTACT_TABLE="Contact"
CONVERSATIONS_TABLE="Conversations"
CONCIERGE_FROM="concierge@my4mlife.com"
BEDROCK_MODEL="us.anthropic.claude-haiku-4-5-20251001-v1:0"

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
      "Action": ["dynamodb:Query","dynamodb:GetItem","dynamodb:PutItem"],
      "Resource": [
        "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$CONTACT_TABLE",
        "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$CONTACT_TABLE/index/*",
        "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$CONVERSATIONS_TABLE",
        "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$CONVERSATIONS_TABLE/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::my4mlife-*/*"
    },
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail","ses:SendRawEmail"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/*",
        "arn:aws:bedrock:*:$AWS_ACCOUNT_ID:inference-profile/*"
      ]
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
ENV_VARS="Variables={CONTACT_TABLE=$CONTACT_TABLE,CONVERSATIONS_TABLE=$CONVERSATIONS_TABLE,CONCIERGE_FROM=$CONCIERGE_FROM,BEDROCK_MODEL=$BEDROCK_MODEL}"

if $AWS lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  $AWS lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" >/dev/null
  $AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
  $AWS lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" --handler "$HANDLER" --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --environment "$ENV_VARS" >/dev/null
  log "Lambda updated."
else
  $AWS lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" \
    --role "$ROLE_ARN" \
    --handler "$HANDLER" \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" \
    --environment "$ENV_VARS" \
    --timeout "$TIMEOUT" \
    --memory-size "$MEMORY" >/dev/null
  log "Lambda created."
fi

$AWS lambda wait function-active --function-name "$FUNCTION_NAME"
log "Done. Function $FUNCTION_NAME is active (dormant until SES inbound trigger is wired)."
