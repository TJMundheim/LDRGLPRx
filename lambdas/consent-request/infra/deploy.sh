#!/usr/bin/env bash
# deploy.sh — build, provision IAM role, create/update the consent-request Lambda.
# Idempotent. Run from any directory.
#
# This function is an AppSync direct Lambda data source (sendConsentRequestAdmin).
# Wiring the AppSync data source + resolver itself is out of scope for this script.
set -euo pipefail

FUNCTION_NAME="my4mlife-consent-request"
ROLE_NAME="my4mlife-consent-request-role"
REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
RUNTIME="nodejs20.x"
HANDLER="handler.handler"
TIMEOUT=30
MEMORY=256

PATIENT_RECORDS_TABLE="PatientRecords"
EMAIL_SENDER_FN="my4mlife-email-sender"
HMAC_SECRET_ID="consent-sign-hmac-key"

# TODO: set to the Function URL printed by the consent-sign lambda's own
# deploy.sh once that lambda is deployed.
CONSENT_SIGN_URL="https://REPLACE-AFTER-CONSENT-SIGN-DEPLOY"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS="aws --region $REGION"

log() { echo "==> $*"; }

# CONSENT_SIGN_HMAC_KEY: never logged, never printed. Sourced from AWS Secrets
# Manager (created out-of-band; never committed). Rotate with:
#   aws secretsmanager put-secret-value --secret-id consent-sign-hmac-key --secret-string <new>
CONSENT_SIGN_HMAC_KEY="${CONSENT_SIGN_HMAC_KEY:-$($AWS secretsmanager get-secret-value --secret-id "$HMAC_SECRET_ID" --query SecretString --output text)}"
if [ -z "$CONSENT_SIGN_HMAC_KEY" ] || [ "$CONSENT_SIGN_HMAC_KEY" = "None" ]; then
  echo "ERROR: CONSENT_SIGN_HMAC_KEY unset and secret $HMAC_SECRET_ID not found" >&2
  exit 1
fi

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
      "Action": ["dynamodb:GetItem","dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$PATIENT_RECORDS_TABLE"
    },
    {
      "Effect": "Allow",
      "Action": ["lambda:InvokeFunction"],
      "Resource": "arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$EMAIL_SENDER_FN"
    },
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:$REGION:$AWS_ACCOUNT_ID:secret:$HMAC_SECRET_ID-*"
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
# JSON env file (shorthand syntax mangles values containing "://" / commas / colons).
ENV_FILE="$(mktemp)"
cat > "$ENV_FILE" <<JSON
{"Variables":{"PATIENT_RECORDS_TABLE":"$PATIENT_RECORDS_TABLE","EMAIL_SENDER_FN":"$EMAIL_SENDER_FN","CONSENT_SIGN_URL":"$CONSENT_SIGN_URL","CONSENT_SIGN_HMAC_KEY":"$CONSENT_SIGN_HMAC_KEY"}}
JSON
ENV_VARS="file://$ENV_FILE"

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

rm -f "$ENV_FILE"
$AWS lambda wait function-active --function-name "$FUNCTION_NAME"
log "Done. Function $FUNCTION_NAME is active. Wire it as an AppSync direct Lambda data source separately."
