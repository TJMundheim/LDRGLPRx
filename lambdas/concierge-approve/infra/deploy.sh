#!/usr/bin/env bash
# deploy.sh — build, provision IAM role, create/update the concierge-approve
# Lambda + its public Function URL.
# Idempotent. Run from any directory.
#
# ORDERING: run this script FIRST (it creates the APPROVE_SECRET in SSM and
# the Function URL). Then run lambdas/inbound-handler/infra/deploy.sh (it
# reads both back from SSM). Then run
# lambdas/inbound-handler/infra/deploy-ses-receiving.sh to wire SES inbound.
#
# Security note: the Function URL itself is public (auth-type NONE) — the
# real gate is an HMAC token carried in the query string (verified in
# src/handler.ts), not secrecy of the URL.
set -euo pipefail

FUNCTION_NAME="my4mlife-concierge-approve"
ROLE_NAME="my4mlife-concierge-approve-role"
REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
RUNTIME="nodejs20.x"
HANDLER="handler.handler"
TIMEOUT=30
MEMORY=256

CONVERSATIONS_TABLE="Conversations"
EMAIL_SENDER_FN="my4mlife-email-sender"
APPROVE_SECRET_PARAM="/my4mlife/concierge/approve-secret"
APPROVE_URL_PARAM="/my4mlife/concierge/approve-url"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS="aws --region $REGION"

log() { echo "==> $*"; }

# ── 1. Build ──────────────────────────────────────────────────────────────────
log "Installing dependencies..."
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile || pnpm install

log "Building with esbuild..."
pnpm build

log "Packaging dist/handler.zip..."
cd "$SCRIPT_DIR/dist"
rm -f handler.zip
zip -q handler.zip handler.js
cd "$SCRIPT_DIR"

# ── 2. APPROVE_SECRET in SSM (create if missing) ───────────────────────────────
log "Ensuring SSM SecureString $APPROVE_SECRET_PARAM..."
if ! $AWS ssm get-parameter --name "$APPROVE_SECRET_PARAM" --with-decryption >/dev/null 2>&1; then
  GENERATED_SECRET="$(openssl rand -hex 32)"
  $AWS ssm put-parameter \
    --name "$APPROVE_SECRET_PARAM" \
    --type SecureString \
    --value "$GENERATED_SECRET" >/dev/null
  log "  Generated and stored a new APPROVE_SECRET."
else
  log "  APPROVE_SECRET already exists — leaving as-is."
fi

# ── 3. IAM role ───────────────────────────────────────────────────────────────
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
      "Action": ["dynamodb:GetItem","dynamodb:UpdateItem","dynamodb:PutItem"],
      "Resource": [
        "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$CONVERSATIONS_TABLE",
        "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$CONVERSATIONS_TABLE/index/*"
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
      "Resource": "arn:aws:ssm:$REGION:$AWS_ACCOUNT_ID:parameter$APPROVE_SECRET_PARAM"
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

# ── 4. Lambda create or update ────────────────────────────────────────────────
log "Deploying Lambda $FUNCTION_NAME..."
APPROVE_SECRET_VALUE="$($AWS ssm get-parameter --name "$APPROVE_SECRET_PARAM" --with-decryption --query 'Parameter.Value' --output text)"
ENV_VARS="Variables={CONVERSATIONS_TABLE=$CONVERSATIONS_TABLE,EMAIL_SENDER_FN=$EMAIL_SENDER_FN,APPROVE_SECRET=$APPROVE_SECRET_VALUE}"

if $AWS lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  $AWS lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" >/dev/null
  $AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
  $AWS lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" --handler "$HANDLER" --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --environment "$ENV_VARS" >/dev/null
  $AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
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

# ── 5. Function URL (public, auth NONE — HMAC token in query string gates it) ──
log "Ensuring public Function URL..."
if $AWS lambda get-function-url-config --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  FUNCTION_URL="$($AWS lambda get-function-url-config --function-name "$FUNCTION_NAME" --query FunctionUrl --output text)"
  log "  Function URL already exists."
else
  FUNCTION_URL="$($AWS lambda create-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --auth-type NONE \
    --query FunctionUrl --output text)"
  log "  Function URL created."
fi

log "Ensuring resource policy allows public invoke via Function URL..."
$AWS lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --action lambda:InvokeFunctionUrl \
  --principal '*' \
  --function-url-auth-type NONE \
  --statement-id url-public >/dev/null 2>&1 || log "  Permission url-public already present (ignored)."
# Since Oct 2025 a NONE-auth URL ALSO needs lambda:InvokeFunction scoped to URL invocations.
$AWS lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --action lambda:InvokeFunction \
  --principal '*' \
  --invoked-via-function-url \
  --statement-id url-public-invoke >/dev/null 2>&1 || log "  Permission url-public-invoke already present (ignored)."

# ── 6. Publish APPROVE_URL to SSM ───────────────────────────────────────────────
log "Writing $APPROVE_URL_PARAM..."
$AWS ssm put-parameter \
  --name "$APPROVE_URL_PARAM" \
  --type String \
  --value "$FUNCTION_URL" \
  --overwrite >/dev/null

log "Done. Function $FUNCTION_NAME is active."
log "APPROVE_URL: $FUNCTION_URL"
log "Next: run lambdas/inbound-handler/infra/deploy.sh to pick up APPROVE_URL + APPROVE_SECRET."
