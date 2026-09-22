#!/usr/bin/env bash
# deploy.sh — build, provision IAM role, create/update the consent-sign Lambda
# + its public Function URL (hosted Stage-2 HIPAA e-sign page).
# Idempotent. Run from any directory.
#
# Security note: the Function URL is public (auth-type NONE) — the real gate is
# an HMAC token carried in the query string (verified in src/handler.ts), not
# secrecy of the URL. The HMAC key lives in Secrets Manager and is created with
# a random 32-byte hex value on first run (mirrors approval-queue-hmac-key).
set -euo pipefail

FUNCTION_NAME="my4mlife-consent-sign"
ROLE_NAME="my4mlife-consent-sign-role"
REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
RUNTIME="nodejs20.x"
HANDLER="handler.handler"
TIMEOUT=30
MEMORY=512

PATIENT_RECORDS_TABLE="PatientRecords"
EMAIL_SENDER_FN="my4mlife-email-sender"
NOTIFY_TO="drtj@my4mlife.com"
HMAC_SECRET_ID="consent-sign-hmac-key"
SIGN_URL_PARAM="/my4mlife/consent/sign-url"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS="aws --region $REGION"

log() { echo "==> $*"; }

# ── 1. Build (prebuild regenerates src/legal.ts from docs/legal/*.md) ─────────
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

# ── 2. HMAC secret (create if missing) ───────────────────────────────────────
log "Ensuring Secrets Manager secret $HMAC_SECRET_ID..."
if $AWS secretsmanager describe-secret --secret-id "$HMAC_SECRET_ID" >/dev/null 2>&1; then
  log "  Secret already exists — leaving as-is."
else
  RANDOM_KEY="$(openssl rand -hex 32)"
  $AWS secretsmanager create-secret \
    --name "$HMAC_SECRET_ID" \
    --secret-string "{\"key\":\"$RANDOM_KEY\"}" \
    --query ARN --output text >/dev/null
  log "  Created with a random 32-byte key."
fi
CONSENT_SECRET_VALUE="$($AWS secretsmanager get-secret-value --secret-id "$HMAC_SECRET_ID" \
  --query SecretString --output text | python3 -c 'import json,sys; print(json.load(sys.stdin)["key"])')"
HMAC_SECRET_ARN_WILDCARD="arn:aws:secretsmanager:${REGION}:${AWS_ACCOUNT_ID}:secret:${HMAC_SECRET_ID}-*"

# ── 3. IAM role ──────────────────────────────────────────────────────────────
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
        "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$PATIENT_RECORDS_TABLE",
        "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$PATIENT_RECORDS_TABLE/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["lambda:InvokeFunction"],
      "Resource": "arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$EMAIL_SENDER_FN"
    },
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "$HMAC_SECRET_ARN_WILDCARD"
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

# ── 4. Lambda create or update ───────────────────────────────────────────────
log "Deploying Lambda $FUNCTION_NAME..."
ENV_JSON="$(python3 - "$PATIENT_RECORDS_TABLE" "$CONSENT_SECRET_VALUE" "$EMAIL_SENDER_FN" "$NOTIFY_TO" <<'PY'
import json,sys
t,s,f,n = sys.argv[1:5]
print(json.dumps({"Variables":{"PATIENT_RECORDS_TABLE":t,"CONSENT_SECRET":s,"EMAIL_SENDER_FN":f,"NOTIFY_TO":n}}))
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

# ── 5. Function URL (public, auth NONE — HMAC token in query string gates it) ─
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

# ── 6. Publish the sign URL to SSM for the sender Lambda (buildSignUrl base) ──
log "Writing $SIGN_URL_PARAM..."
$AWS ssm put-parameter \
  --name "$SIGN_URL_PARAM" \
  --type String \
  --value "$FUNCTION_URL" \
  --overwrite >/dev/null

log "Done. Function $FUNCTION_NAME is active."
log "CONSENT_SIGN_URL: $FUNCTION_URL"
log "Senders should read $SIGN_URL_PARAM + secret $HMAC_SECRET_ID and call buildSignUrl()."
