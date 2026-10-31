#!/usr/bin/env bash
# deploy.sh — build, provision the PartnerAgreements table + IAM role, create/update the
# partner-sign Lambda + its public Function URL (hosted partner-agreement e-sign page).
# Idempotent. Run from any directory.
#
# Security note: the Function URL is public (auth-type NONE) — the real gate is an HMAC
# token in the query string (verified in src/handler.ts). The HMAC key lives in SSM
# (SecureString) and is created with a random 32-byte hex value on first run.
# Links are minted with: node infra/scripts/partner-sign-link.mjs <CODE>
set -euo pipefail

FUNCTION_NAME="my4mlife-partner-sign"
ROLE_NAME="my4mlife-partner-sign-role"
REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
RUNTIME="nodejs24.x"
HANDLER="handler.handler"
TIMEOUT=30
MEMORY=512

TABLE_NAME="PartnerAgreements"
EMAIL_SENDER_FN="my4mlife-email-sender"
NOTIFY_TO="drtj@my4mlife.com"
HMAC_PARAM="/my4mlife/partner-sign/hmac-key"
URL_PARAM="/my4mlife/partner-sign/url"
STRIPE_SECRET_ID="all-stripe-keys"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS="aws --region $REGION"

log() { echo "==> $*"; }

# ── 1. Build (prebuild fails loudly if docs/legal/My_4M_Life_Partner_Agreement.md is missing) ──
log "Installing dependencies..."
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile || pnpm install

log "Running tests..."
pnpm test

log "Building with esbuild..."
pnpm build

log "Packaging dist/handler.zip..."
cd "$SCRIPT_DIR/dist"
rm -f handler.zip
zip -q handler.zip handler.js
cd "$SCRIPT_DIR"

# ── 2. DynamoDB table (create if missing) ────────────────────────────────────
log "Ensuring DynamoDB table $TABLE_NAME..."
if $AWS dynamodb describe-table --table-name "$TABLE_NAME" >/dev/null 2>&1; then
  log "  Table already exists — leaving as-is."
else
  $AWS dynamodb create-table \
    --table-name "$TABLE_NAME" \
    --attribute-definitions AttributeName=code,AttributeType=S \
    --key-schema AttributeName=code,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST >/dev/null
  $AWS dynamodb wait table-exists --table-name "$TABLE_NAME"
  $AWS dynamodb update-continuous-backups --table-name "$TABLE_NAME" \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true >/dev/null
  log "  Table created (PAY_PER_REQUEST, point-in-time recovery on)."
fi

# ── 3. HMAC key in SSM (create if missing) ───────────────────────────────────
log "Ensuring SSM parameter $HMAC_PARAM..."
if $AWS ssm get-parameter --name "$HMAC_PARAM" >/dev/null 2>&1; then
  log "  Parameter already exists — leaving as-is."
else
  $AWS ssm put-parameter --name "$HMAC_PARAM" --type SecureString --value "$(openssl rand -hex 32)" >/dev/null
  log "  Created with a random 32-byte key."
fi
PARTNER_SECRET_VALUE="$($AWS ssm get-parameter --name "$HMAC_PARAM" --with-decryption --query Parameter.Value --output text)"
HMAC_PARAM_ARN="arn:aws:ssm:${REGION}:${AWS_ACCOUNT_ID}:parameter${HMAC_PARAM}"
STRIPE_SECRET_ARN="$($AWS secretsmanager describe-secret --secret-id "$STRIPE_SECRET_ID" --query ARN --output text)"

# ── 4. IAM role ──────────────────────────────────────────────────────────────
log "Ensuring IAM role $ROLE_NAME..."
TRUST_DOC='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

if ! $AWS iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  $AWS iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST_DOC" >/dev/null
  log "Role created. Waiting for propagation..."
  sleep 10
fi

INLINE_POLICY=$(cat <<POLICY
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
      "Action": ["dynamodb:GetItem","dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$TABLE_NAME"
    },
    {
      "Effect": "Allow",
      "Action": ["lambda:InvokeFunction"],
      "Resource": "arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$EMAIL_SENDER_FN"
    },
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "$STRIPE_SECRET_ARN"
    },
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter"],
      "Resource": "$HMAC_PARAM_ARN"
    }
  ]
}
POLICY
)

$AWS iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "${ROLE_NAME}-policy" \
  --policy-document "$INLINE_POLICY"
log "Role policy updated."

ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME"

# ── 5. Lambda create or update ───────────────────────────────────────────────
log "Deploying Lambda $FUNCTION_NAME..."
# PARTNER_STRIPE_MODE is ALWAYS "live" here ("test" is for a manual E2E invocation only).
ENV_JSON="$(python3 - "$TABLE_NAME" "$PARTNER_SECRET_VALUE" "$EMAIL_SENDER_FN" "$NOTIFY_TO" <<'PY'
import json,sys
t,s,f,n = sys.argv[1:5]
print(json.dumps({"Variables":{"PARTNER_AGREEMENTS_TABLE":t,"PARTNER_SIGN_SECRET":s,"EMAIL_SENDER_FN":f,"NOTIFY_TO":n,"PARTNER_STRIPE_MODE":"live"}}))
PY
)"

if $AWS lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  $AWS lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" >/dev/null
  $AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
  $AWS lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" --handler "$HANDLER" --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --environment "$ENV_JSON" >/dev/null
  $AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
  log "Lambda updated."
else
  $AWS lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" \
    --role "$ROLE_ARN" \
    --handler "$HANDLER" \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" \
    --environment "$ENV_JSON" \
    --timeout "$TIMEOUT" \
    --memory-size "$MEMORY" >/dev/null
  log "Lambda created."
fi

$AWS lambda wait function-active --function-name "$FUNCTION_NAME"

# ── 6. Function URL (public, auth NONE — HMAC token in query string gates it) ─
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

# ── 7. Publish the sign URL to SSM for infra/scripts/partner-sign-link.mjs ───
log "Writing $URL_PARAM..."
$AWS ssm put-parameter --name "$URL_PARAM" --type String --value "$FUNCTION_URL" --overwrite >/dev/null

log "Done. Function $FUNCTION_NAME is active."
log "PARTNER_SIGN_URL: $FUNCTION_URL"
log "Mint a partner link: node infra/scripts/partner-sign-link.mjs <CODE> [--days 30]"
