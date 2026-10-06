#!/usr/bin/env bash
# deploy.sh — build, provision IAM + HMAC key, create/update the push-patch-decision Lambda,
# and wire GET + POST /api/push-patch-decision on the public HTTP API. Idempotent.
# GET renders a confirm page only (email link scanners prefetch GETs); POST performs the decision.
set -euo pipefail

FUNCTION_NAME="my4mlife-push-patch-decision"
ROLE_NAME="${FUNCTION_NAME}-role"
REGION="us-east-2"
ACCOUNT="879696522760"
RUNTIME="nodejs20.x"
HANDLER="handler.handler"
TIMEOUT=30
MEMORY=512  # pdf-lib fill of the 900 KB Genesis template
HTTP_API_ID="v9svm8ds74"
ROUTE_PATH="/api/push-patch-decision"

PATIENT_RECORDS_TABLE="PatientRecords"
EMAIL_SENDER_FN="my4mlife-email-sender"
HMAC_PARAM="push-patch-decision-hmac-key"
# Genesis order emails go to Genesis's order desk (switched 2026-10-06 after TJ's tests + Genesis COO approval).
GENESIS_ORDER_EMAIL="orders@novobioalliance.com"   # LIVE 2026-10-06 (Genesis COO approved the form); drtj@my4mlife.com is cc'd on every order
# Practice constants (clinician, practice, phone, payment_email, billing, placer, ...) — one JSON String
# parameter, created by hand (NOT here). Until complete, orders are NOT sent to Genesis; TJ is alerted.
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
# The Genesis order-form template is copied into dist by `pnpm build`; package it beside the handler.
(cd dist && rm -f handler.zip && zip -q handler.zip handler.js genesis-order-form-2026.pdf)

# ── 2. HMAC key (SSM SecureString, created ONLY if missing) ───────────────────
# The physician review email (push-patch-intake) signs links with this same key.
if $AWS ssm get-parameter --name "$HMAC_PARAM" >/dev/null 2>&1; then
  log "SSM $HMAC_PARAM already exists — leaving it untouched."
else
  log "Creating SSM SecureString $HMAC_PARAM (random 32 bytes)"
  $AWS ssm put-parameter --name "$HMAC_PARAM" --type SecureString \
    --description "HMAC-SHA256 key for Push Patch physician approve/decline links." \
    --value "$(openssl rand -hex 32)" >/dev/null
fi

# ── 3. IAM role ───────────────────────────────────────────────────────────────
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
      "Resource": "arn:aws:ssm:${REGION}:${ACCOUNT}:parameter/${HMAC_PARAM}" },
    { "Effect": "Allow", "Action": "ssm:GetParameter",
      "Resource": "arn:aws:ssm:${REGION}:${ACCOUNT}:parameter${PRACTICE_PARAM}" },
    { "Effect": "Allow", "Action": "secretsmanager:GetSecretValue", "Resource": "${STRIPE_KEYS_ARN}" }
  ]
}
JSON
)
$AWS iam put-role-policy --role-name "$ROLE_NAME" --policy-name "${ROLE_NAME}-policy" --policy-document "$POLICY"
ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/${ROLE_NAME}"

# ── 4. Lambda create or update ────────────────────────────────────────────────
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

# ── 5. Wire GET + POST /api/push-patch-decision ──────────────────────────────────────
FN_ARN="arn:aws:lambda:${REGION}:${ACCOUNT}:function:${FUNCTION_NAME}"
INTEGRATION_ID="$($AWS apigatewayv2 get-integrations --api-id "$HTTP_API_ID" \
  --query "Items[?IntegrationUri=='$FN_ARN'].IntegrationId" --output text 2>/dev/null || true)"
if [[ -z "$INTEGRATION_ID" || "$INTEGRATION_ID" == "None" ]]; then
  INTEGRATION_ID="$($AWS apigatewayv2 create-integration --api-id "$HTTP_API_ID" --integration-type AWS_PROXY \
    --integration-uri "$FN_ARN" --payload-format-version 2.0 --query IntegrationId --output text)"
  log "Created integration $INTEGRATION_ID"
fi
for METHOD in GET POST; do
  ROUTE_KEY="$METHOD $ROUTE_PATH"
  ROUTE_ID="$($AWS apigatewayv2 get-routes --api-id "$HTTP_API_ID" \
    --query "Items[?RouteKey=='$ROUTE_KEY'].RouteId" --output text 2>/dev/null || true)"
  if [[ -z "$ROUTE_ID" || "$ROUTE_ID" == "None" ]]; then
    $AWS apigatewayv2 create-route --api-id "$HTTP_API_ID" --route-key "$ROUTE_KEY" \
      --target "integrations/$INTEGRATION_ID" --authorization-type NONE >/dev/null
  else
    $AWS apigatewayv2 update-route --api-id "$HTTP_API_ID" --route-id "$ROUTE_ID" \
      --target "integrations/$INTEGRATION_ID" >/dev/null
  fi
done
$AWS lambda remove-permission --function-name "$FUNCTION_NAME" --statement-id apigw-push-patch-decision >/dev/null 2>&1 || true
$AWS lambda add-permission --function-name "$FUNCTION_NAME" --statement-id apigw-push-patch-decision \
  --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT}:${HTTP_API_ID}/*/*${ROUTE_PATH}" >/dev/null

log "Done. Run infra/api-throttling.sh to apply the route throttle."
