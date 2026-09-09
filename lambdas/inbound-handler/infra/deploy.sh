#!/usr/bin/env bash
# deploy.sh — build, provision IAM role, create/update the inbound-handler Lambda.
# Idempotent. Run from any directory.
#
# ORDERING: run lambdas/concierge-approve/infra/deploy.sh FIRST (it creates
# the APPROVE_SECRET + APPROVE_URL this script reads from SSM). Then run this
# script. Then run infra/deploy-ses-receiving.sh (in this same lambda's infra/
# dir) to wire the SES inbound trigger (active receipt rule set + S3 inbound
# bucket + MX records) — until that last step runs, the function is deployed
# but dormant (nothing invokes it).
set -euo pipefail

FUNCTION_NAME="my4mlife-inbound-handler"
ROLE_NAME="my4mlife-inbound-handler-role"
REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
RUNTIME="nodejs20.x"
HANDLER="handler.handler"
TIMEOUT=60
MEMORY=512

CONTACT_TABLE="Contact"
CONVERSATIONS_TABLE="Conversations"
CONCIERGE_FROM="concierge@my4mlife.com"
BEDROCK_MODEL="us.anthropic.claude-haiku-4-5-20251001-v1:0"

CONCIERGE_MODE="draft"
NOTIFY_TO="drtj@my4mlife.com"
EMAIL_SENDER_FN="my4mlife-email-sender"
APPROVE_URL_PARAM="/my4mlife/concierge/approve-url"
APPROVE_SECRET_PARAM="/my4mlife/concierge/approve-secret"

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
    },
    {
      "Effect": "Allow",
      "Action": ["lambda:InvokeFunction"],
      "Resource": "arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$EMAIL_SENDER_FN"
    },
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter"],
      "Resource": [
        "arn:aws:ssm:$REGION:$AWS_ACCOUNT_ID:parameter$APPROVE_URL_PARAM",
        "arn:aws:ssm:$REGION:$AWS_ACCOUNT_ID:parameter$APPROVE_SECRET_PARAM"
      ]
    }
  ]
}
EOF
)
# NOTE: s3:GetObject on arn:aws:s3:::my4mlife-*/* above already covers the
# my4mlife-inbound-mail bucket used by SES receiving — no separate statement
# needed.

$AWS iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "${ROLE_NAME}-policy" \
  --policy-document "$INLINE_POLICY"
log "Role policy updated."

ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME"

# ── 3. Resolve APPROVE_URL / APPROVE_SECRET from SSM ────────────────────────────
log "Reading $APPROVE_URL_PARAM from SSM..."
if APPROVE_URL="$($AWS ssm get-parameter --name "$APPROVE_URL_PARAM" --query 'Parameter.Value' --output text 2>/dev/null)"; then
  log "  Found APPROVE_URL."
else
  log "  WARNING: $APPROVE_URL_PARAM not found — run lambdas/concierge-approve/infra/deploy.sh first. Setting APPROVE_URL empty for now."
  APPROVE_URL=""
fi

log "Reading $APPROVE_SECRET_PARAM from SSM..."
if APPROVE_SECRET="$($AWS ssm get-parameter --name "$APPROVE_SECRET_PARAM" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null)"; then
  log "  Found APPROVE_SECRET."
else
  log "  APPROVE_SECRET not found — generating and storing a new one."
  APPROVE_SECRET="$(openssl rand -hex 32)"
  $AWS ssm put-parameter \
    --name "$APPROVE_SECRET_PARAM" \
    --type SecureString \
    --value "$APPROVE_SECRET" >/dev/null
fi

# ── 4. Lambda create or update ────────────────────────────────────────────────
log "Deploying Lambda $FUNCTION_NAME..."
ENV_VARS="Variables={CONTACT_TABLE=$CONTACT_TABLE,CONVERSATIONS_TABLE=$CONVERSATIONS_TABLE,CONCIERGE_FROM=$CONCIERGE_FROM,BEDROCK_MODEL=$BEDROCK_MODEL,CONCIERGE_MODE=$CONCIERGE_MODE,NOTIFY_TO=$NOTIFY_TO,EMAIL_SENDER_FN=$EMAIL_SENDER_FN,APPROVE_URL=$APPROVE_URL,APPROVE_SECRET=$APPROVE_SECRET}"

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
