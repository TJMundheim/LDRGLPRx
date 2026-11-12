#!/usr/bin/env bash
# deploy.sh — my4mlife-push-patch-tracking
#
# Reads Novo tracking emails that SES drops in S3 (rule push-patch-tracking, see deploy-ses-rule.sh),
# stamps tracking on the matching PatientRecords encounter, and sends the "on its way" email via
# my4mlife-email-sender. Unclear matches go to TJ with HMAC-signed one-click links, signed with the
# SAME SSM key as push-patch-decision / push-patch-intake. Idempotent.
# ORDER: run this first, then deploy-ses-rule.sh.
set -euo pipefail

FUNCTION_NAME="my4mlife-push-patch-tracking"
ROLE_NAME="${FUNCTION_NAME}-role"
REGION="us-east-2"
ACCOUNT="879696522760"
RUNTIME="nodejs24.x"
HANDLER="handler.handler"
TIMEOUT=60
MEMORY=256

PATIENT_RECORDS_TABLE="PatientRecords"
EMAIL_SENDER_FN="my4mlife-email-sender"
HMAC_PARAM="push-patch-decision-hmac-key"   # shared signing key; created by push-patch-decision/infra/deploy.sh
INBOUND_BUCKET="my4mlife-inbound-mail"      # same bucket as concierge-inbox (verified via describe-receipt-rule)
OBJECT_PREFIX="push-patch-tracking/"
# One-click ship links hit push-patch-ship-admin: FULL route (that deploy prints the same URL).
# HTTP API v9svm8ds74 uses the $default stage, so there is no stage segment in the path.
SHIP_ADMIN_URL="https://v9svm8ds74.execute-api.${REGION}.amazonaws.com/api/push-patch-ship"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS="aws --region $REGION"
log() { echo "==> $*"; }

# ── 1. Build ──────────────────────────────────────────────────────────────────
log "Build"
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile
pnpm build
(cd dist && rm -f handler.zip && zip -q handler.zip handler.js)

# ── 2. IAM role ───────────────────────────────────────────────────────────────
TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
if ! $AWS iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  log "Creating IAM role $ROLE_NAME"
  $AWS iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST" >/dev/null
  log "  waiting for role propagation..."; sleep 10
fi

log "Apply IAM inline policy"
# SecureString uses the default aws/ssm KMS key, which needs no explicit kms:Decrypt grant.
POLICY=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "Logs", "Effect": "Allow", "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],
      "Resource": "arn:aws:logs:${REGION}:${ACCOUNT}:log-group:/aws/lambda/${FUNCTION_NAME}:*" },
    { "Sid": "ReadInboundMail", "Effect": "Allow", "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${INBOUND_BUCKET}/${OBJECT_PREFIX}*" },
    { "Sid": "DDBPatientRecords", "Effect": "Allow", "Action": ["dynamodb:Scan","dynamodb:GetItem","dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/${PATIENT_RECORDS_TABLE}" },
    { "Sid": "InvokeEmailSender", "Effect": "Allow", "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:${REGION}:${ACCOUNT}:function:${EMAIL_SENDER_FN}" },
    { "Sid": "ReadSigningKey", "Effect": "Allow", "Action": "ssm:GetParameter",
      "Resource": "arn:aws:ssm:${REGION}:${ACCOUNT}:parameter/${HMAC_PARAM}" }
  ]
}
JSON
)
$AWS iam put-role-policy --role-name "$ROLE_NAME" --policy-name "${FUNCTION_NAME}-policy" \
  --policy-document "$POLICY" >/dev/null

# ── 3. Function (create or update) ─────────────────────────────────────────────
ENV_FILE="$(mktemp)"; trap 'rm -f "$ENV_FILE"' EXIT
cat > "$ENV_FILE" <<JSON
{"Variables":{"PATIENT_RECORDS_TABLE":"${PATIENT_RECORDS_TABLE}","EMAIL_SENDER_FN":"${EMAIL_SENDER_FN}","HMAC_PARAM":"${HMAC_PARAM}","SHIP_ADMIN_URL":"${SHIP_ADMIN_URL}","INBOUND_BUCKET":"${INBOUND_BUCKET}"}}
JSON

log "Deploy function"
if $AWS lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  $AWS lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file "fileb://dist/handler.zip" >/dev/null
  $AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
  $AWS lambda update-function-configuration --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" --handler "$HANDLER" --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --environment "file://$ENV_FILE" >/dev/null
else
  $AWS lambda create-function --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" --role "arn:aws:iam::${ACCOUNT}:role/${ROLE_NAME}" --handler "$HANDLER" \
    --timeout "$TIMEOUT" --memory-size "$MEMORY" --environment "file://$ENV_FILE" \
    --zip-file "fileb://dist/handler.zip" >/dev/null
fi
$AWS lambda wait function-updated --function-name "$FUNCTION_NAME"

log "Done: $FUNCTION_NAME deployed to $REGION. Next: infra/deploy-ses-rule.sh"
