#!/usr/bin/env bash
# deploy.sh — my4mlife-push-patch-decide-admin
#
# Admin-app Approve / Decline for a Push Patch encounter (AppSync DIRECT LAMBDA RESOLVER, mutation
# decidePushPatchAdmin). Runs the SAME decide() as the physician email link (push-patch-decision), so it
# needs the same access: PatientRecords, email-sender, SSM Genesis practice, Stripe key, order-form PDF.
# NO API Gateway route — AppSync invokes the function directly. Idempotent.
set -euo pipefail

FUNCTION_NAME="my4mlife-push-patch-decide-admin"
ROLE_NAME="${FUNCTION_NAME}-role"
REGION="us-east-2"
ACCOUNT="879696522760"
RUNTIME="nodejs20.x"
HANDLER="handler.handler"
TIMEOUT=30
MEMORY=512  # pdf-lib fill of the 900 KB Genesis template

PATIENT_RECORDS_TABLE="PatientRecords"
EMAIL_SENDER_FN="my4mlife-email-sender"
# INTERIM: keep identical to lambdas/push-patch-decision/infra/deploy.sh. After TJ's first test switch BOTH
# to orders@novobioalliance.com (the code default) and redeploy BOTH.
GENESIS_ORDER_EMAIL="drtj@my4mlife.com"
PRACTICE_PARAM="/my4mlife/genesis/practice"
STRIPE_KEYS_ARN="arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret:all-stripe-keys-*"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS="aws --region $REGION"
log() { echo "==> $*"; }

# ── 1. Build ──────────────────────────────────────────────────────────────────
log "Build"
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile
pnpm build
(cd dist && rm -f handler.zip && zip -q handler.zip handler.js genesis-order-form-2026.pdf)

# ── 2. IAM role ───────────────────────────────────────────────────────────────
TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
if ! $AWS iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  log "Creating IAM role $ROLE_NAME"
  $AWS iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST" >/dev/null
  sleep 10
fi
POLICY=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],
      "Resource": "arn:aws:logs:${REGION}:${ACCOUNT}:log-group:/aws/lambda/${FUNCTION_NAME}:*" },
    { "Effect": "Allow", "Action": ["dynamodb:GetItem","dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/${PATIENT_RECORDS_TABLE}" },
    { "Effect": "Allow", "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:${REGION}:${ACCOUNT}:function:${EMAIL_SENDER_FN}" },
    { "Effect": "Allow", "Action": "ssm:GetParameter",
      "Resource": "arn:aws:ssm:${REGION}:${ACCOUNT}:parameter${PRACTICE_PARAM}" },
    { "Effect": "Allow", "Action": "secretsmanager:GetSecretValue", "Resource": "${STRIPE_KEYS_ARN}" }
  ]
}
JSON
)
$AWS iam put-role-policy --role-name "$ROLE_NAME" --policy-name "${ROLE_NAME}-policy" --policy-document "$POLICY"
ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/${ROLE_NAME}"

# ── 3. Lambda create or update ────────────────────────────────────────────────
ENV_VARS="{\"Variables\":{\"STRIPE_MODE\":\"live\",\"GENESIS_ORDER_EMAIL\":\"${GENESIS_ORDER_EMAIL}\",\"PATIENT_RECORDS_TABLE\":\"${PATIENT_RECORDS_TABLE}\",\"EMAIL_SENDER_FN\":\"${EMAIL_SENDER_FN}\"}}"
if $AWS lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  log "Updating $FUNCTION_NAME"
  $AWS lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" >/dev/null
  $AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
  $AWS lambda update-function-configuration --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" --handler "$HANDLER" --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --environment "$ENV_VARS" >/dev/null
else
  log "Creating $FUNCTION_NAME"
  $AWS lambda create-function --function-name "$FUNCTION_NAME" --runtime "$RUNTIME" --role "$ROLE_ARN" \
    --handler "$HANDLER" --timeout "$TIMEOUT" --memory-size "$MEMORY" --environment "$ENV_VARS" \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" >/dev/null
fi
$AWS lambda wait function-active --function-name "$FUNCTION_NAME"

log "Done: $FUNCTION_NAME deployed (AppSync wires the resolver separately: cdk deploy ApiStack)."
