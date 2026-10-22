#!/usr/bin/env bash
# deploy.sh — build, provision IAM role + HMAC key (if missing), create/update the
# push-patch-intake Lambda, wire GET + POST + OPTIONS /api/push-patch-intake and
# POST + OPTIONS /api/push-patch-pre-intake (pay-last: health form before Stripe).
# The same Lambda also serves {mode:'finalize'} direct invokes from my4mlife-order-handler and
# my4mlife-stripe-events-retry. Same account: their own IAM policies (infra of those Lambdas) grant
# lambda:InvokeFunction on this function, so no resource policy is added here.
# Idempotent. Run from any directory. Throttle lives in infra/api-throttling.sh.
set -euo pipefail

FUNCTION_NAME="my4mlife-push-patch-intake"
ROLE_NAME="my4mlife-push-patch-intake-role"
REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
API_ID="v9svm8ds74"
RUNTIME="nodejs20.x"
HANDLER="handler.handler"
TIMEOUT=60
MEMORY=256

PATIENT_RECORDS_TABLE="PatientRecords"
TOUCHPOINTS_TABLE="Touchpoints"
CONTACT_TABLE="Contact"
EMAIL_SENDER_FN="my4mlife-email-sender"
EXPORT_PACKET_FN="my4mlife-export-clinical-packet"
PROVIDER_EMAIL_PARAM="/my4mlife/provider/email"        # owned by provider-handoff/infra/deploy.sh
HMAC_PARAM="push-patch-decision-hmac-key"              # shared with push-patch-decision
STRIPE_SECRET_ID="all-stripe-keys"
ROUTE_PATH="/api/push-patch-intake"
PRE_ROUTE_PATH="/api/push-patch-pre-intake"
TEST_TOKEN_PARAM="/my4mlife/push-patch/test-token"     # private $2 test-price token (managed by infra/scripts/push-patch-test-token.sh)
DECISION_BASE_URL="https://$API_ID.execute-api.$REGION.amazonaws.com"   # my4mlife.com has no /api/* proxy

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS="aws --region $REGION"

log() { echo "==> $*"; }

# ── 1. HMAC signing key (create only if missing; never rotate here) ───────────
if $AWS ssm get-parameter --name "$HMAC_PARAM" >/dev/null 2>&1; then
  log "SSM $HMAC_PARAM already exists. Leaving it alone."
else
  log "Creating SSM SecureString $HMAC_PARAM..."
  $AWS ssm put-parameter --name "$HMAC_PARAM" --type SecureString \
    --value "$(openssl rand -hex 32)" \
    --description "HMAC key signing provider Approve/Decline links (push-patch intake + decision)." >/dev/null
fi

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

# SecureString uses the default aws/ssm KMS key, which needs no explicit kms:Decrypt grant.
# SSM ARNs: names with a leading slash append directly; names without get "parameter/".
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
      "Action": ["dynamodb:GetItem","dynamodb:PutItem","dynamodb:UpdateItem","dynamodb:DeleteItem"],
      "Resource": "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$PATIENT_RECORDS_TABLE"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$TOUCHPOINTS_TABLE"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$CONTACT_TABLE"
    },
    {
      "Effect": "Allow",
      "Action": ["lambda:InvokeFunction"],
      "Resource": [
        "arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$EXPORT_PACKET_FN",
        "arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$EMAIL_SENDER_FN"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter"],
      "Resource": [
        "arn:aws:ssm:$REGION:$AWS_ACCOUNT_ID:parameter$PROVIDER_EMAIL_PARAM",
        "arn:aws:ssm:$REGION:$AWS_ACCOUNT_ID:parameter/$HMAC_PARAM",
        "arn:aws:ssm:$REGION:$AWS_ACCOUNT_ID:parameter$TEST_TOKEN_PARAM"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt"],
      "Resource": "*",
      "Condition": { "StringEquals": { "kms:ViaService": "ssm.$REGION.amazonaws.com" } }
    },
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:$REGION:$AWS_ACCOUNT_ID:secret:$STRIPE_SECRET_ID-*"
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

# ── 4. Lambda create or update ────────────────────────────────────────────────
log "Deploying Lambda $FUNCTION_NAME..."
ENV_FILE="$(mktemp)"
cat > "$ENV_FILE" <<JSON
{"Variables":{"STRIPE_MODE":"live","STRIPE_PROMO_CONSENT":"on","STRIPE_PROMO_CODES":"off","PATIENT_RECORDS_TABLE":"$PATIENT_RECORDS_TABLE","TOUCHPOINTS_TABLE":"$TOUCHPOINTS_TABLE","EMAIL_SENDER_FN":"$EMAIL_SENDER_FN","EXPORT_PACKET_FN":"$EXPORT_PACKET_FN","PROVIDER_EMAIL_PARAM":"$PROVIDER_EMAIL_PARAM","HMAC_PARAM":"$HMAC_PARAM","DECISION_BASE_URL":"$DECISION_BASE_URL"}}
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

# ── 5. HTTP API routes: GET (order status) + POST + OPTIONS (CORS preflight; the handler sets the
#       my4mlife.com origin allow-list headers itself); pre-intake is POST + OPTIONS ──────────
LAMBDA_ARN="arn:aws:lambda:$REGION:$AWS_ACCOUNT_ID:function:$FUNCTION_NAME"

$AWS lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --statement-id "apigateway-push-patch-intake" \
  --action "lambda:InvokeFunction" \
  --principal "apigateway.amazonaws.com" \
  --source-arn "arn:aws:execute-api:$REGION:$AWS_ACCOUNT_ID:$API_ID/*/*$ROUTE_PATH" \
  2>/dev/null || true
$AWS lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --statement-id "apigateway-push-patch-pre-intake" \
  --action "lambda:InvokeFunction" \
  --principal "apigateway.amazonaws.com" \
  --source-arn "arn:aws:execute-api:$REGION:$AWS_ACCOUNT_ID:$API_ID/*/*$PRE_ROUTE_PATH" \
  2>/dev/null || true

INTEGRATION_ID=""
for ROUTE_KEY in "GET $ROUTE_PATH" "POST $ROUTE_PATH" "OPTIONS $ROUTE_PATH" "POST $PRE_ROUTE_PATH" "OPTIONS $PRE_ROUTE_PATH"; do
  EXISTING_ROUTE=$($AWS apigatewayv2 get-routes --api-id "$API_ID" \
    --query "Items[?RouteKey=='$ROUTE_KEY'].RouteId | [0]" --output text | tr '\t' '\n' | grep -v -e '^None$' -e '^$' | head -n 1 || true)
  if [[ "$EXISTING_ROUTE" != "None" && -n "$EXISTING_ROUTE" ]]; then
    log "Route $ROUTE_KEY already exists ($EXISTING_ROUTE). Skipping."
    continue
  fi
  if [[ -z "$INTEGRATION_ID" ]]; then
    INTEGRATION_ID=$($AWS apigatewayv2 get-integrations --api-id "$API_ID" \
      --query "Items[?IntegrationUri=='$LAMBDA_ARN'].IntegrationId | [0]" --output text | tr '\t' '\n' | grep -v -e '^None$' -e '^$' | head -n 1 || true)
    if [[ "$INTEGRATION_ID" == "None" || -z "$INTEGRATION_ID" ]]; then
      INTEGRATION_ID=$($AWS apigatewayv2 create-integration \
        --api-id "$API_ID" \
        --integration-type AWS_PROXY \
        --integration-uri "$LAMBDA_ARN" \
        --payload-format-version "2.0" \
        --query "IntegrationId" --output text)
    fi
  fi
  $AWS apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "$ROUTE_KEY" \
    --target "integrations/$INTEGRATION_ID" >/dev/null
  log "Route created: $ROUTE_KEY -> $INTEGRATION_ID"
done

log "Run infra/api-throttling.sh to apply the route throttle."
log "Done. Endpoints: https://$API_ID.execute-api.$REGION.amazonaws.com$ROUTE_PATH and $PRE_ROUTE_PATH"
