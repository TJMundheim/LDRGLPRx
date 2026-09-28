#!/usr/bin/env bash
# deploy.sh — build, provision IAM role, publish the provider-inbox SSM
# parameter, create/update the provider-handoff Lambda. Idempotent.
#
# This function is an AppSync direct Lambda data source (sendToProviderAdmin).
# Wiring the AppSync data source + resolver is done by infra/clientportal/deploy.sh.
set -euo pipefail

FUNCTION_NAME="my4mlife-provider-handoff"
ROLE_NAME="my4mlife-provider-handoff-role"
REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
RUNTIME="nodejs20.x"
HANDLER="handler.handler"
TIMEOUT=60
MEMORY=256

PATIENT_RECORDS_TABLE="PatientRecords"
EMAIL_SENDER_FN="my4mlife-email-sender"
EXPORT_PACKET_FN="my4mlife-export-clinical-packet"
COORDINATOR_EMAIL="drtj@my4mlife.com"

# Provider inbox — infrastructure as code. This script OWNS the value; never
# edit the parameter in the console.
PROVIDER_EMAIL_PARAM="/my4mlife/provider/email"
PROVIDER_EMAIL="${PROVIDER_EMAIL:-drtj@mdspecialtygroup.com}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS="aws --region $REGION"

log() { echo "==> $*"; }

# ── 1. Provider inbox parameter ───────────────────────────────────────────────
log "Publishing $PROVIDER_EMAIL_PARAM = $PROVIDER_EMAIL"
$AWS ssm put-parameter \
  --name "$PROVIDER_EMAIL_PARAM" \
  --value "$PROVIDER_EMAIL" \
  --type String \
  --description "Provider inbox that receives clinical packets for asynchronous review." \
  --overwrite >/dev/null

# ── 2. Build ──────────────────────────────────────────────────────────────────
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
      "Action": ["dynamodb:GetItem","dynamodb:PutItem","dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$PATIENT_RECORDS_TABLE"
    },
    {
      "Effect": "Allow",
      "Action": ["lambda:InvokeFunction"],
      "Resource": [
        "arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$EMAIL_SENDER_FN",
        "arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$EXPORT_PACKET_FN"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter"],
      "Resource": "arn:aws:ssm:$REGION:$AWS_ACCOUNT_ID:parameter$PROVIDER_EMAIL_PARAM"
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
ENV_FILE="$(mktemp)"
cat > "$ENV_FILE" <<JSON
{"Variables":{"PATIENT_RECORDS_TABLE":"$PATIENT_RECORDS_TABLE","EMAIL_SENDER_FN":"$EMAIL_SENDER_FN","EXPORT_PACKET_FN":"$EXPORT_PACKET_FN","PROVIDER_EMAIL_PARAM":"$PROVIDER_EMAIL_PARAM","COORDINATOR_EMAIL":"$COORDINATOR_EMAIL"}}
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
log "Done. Run infra/clientportal/deploy.sh to wire sendToProviderAdmin."
