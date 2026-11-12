#!/usr/bin/env bash
# deploy.sh — build, provision IAM, create/update my4mlife-push-patch-ship-admin, and wire
# GET + POST /api/push-patch-ship on the public HTTP API (auth NONE, like push-patch-decision:
# the HMAC-signed link is the auth). Reuses the existing SSM key; never creates it. Idempotent.
set -euo pipefail

FUNCTION_NAME="my4mlife-push-patch-ship-admin"
ROLE_NAME="${FUNCTION_NAME}-role"
REGION="us-east-2"
ACCOUNT="879696522760"
RUNTIME="nodejs24.x"
HANDLER="handler.handler"
TIMEOUT=30
MEMORY=256
HTTP_API_ID="v9svm8ds74"
ROUTE_PATH="/api/push-patch-ship"
PATIENT_RECORDS_TABLE="PatientRecords"
EMAIL_SENDER_FN="my4mlife-email-sender"
HMAC_PARAM="push-patch-decision-hmac-key"   # created by push-patch-decision's deploy

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS="aws --region $REGION"
log() { echo "==> $*"; }

log "Build"
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile
pnpm build
(cd dist && rm -f handler.zip && zip -q handler.zip handler.js)

if ! $AWS ssm get-parameter --name "$HMAC_PARAM" >/dev/null 2>&1; then
  echo "SSM $HMAC_PARAM missing: deploy push-patch-decision first." >&2; exit 1
fi

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
      "Resource": "arn:aws:ssm:${REGION}:${ACCOUNT}:parameter/${HMAC_PARAM}" }
  ]
}
JSON
)
$AWS iam put-role-policy --role-name "$ROLE_NAME" --policy-name "${ROLE_NAME}-policy" --policy-document "$POLICY"
ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/${ROLE_NAME}"

ENV_VARS="{\"Variables\":{\"PATIENT_RECORDS_TABLE\":\"${PATIENT_RECORDS_TABLE}\",\"EMAIL_SENDER_FN\":\"${EMAIL_SENDER_FN}\",\"HMAC_PARAM\":\"${HMAC_PARAM}\"}}"
if $AWS lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  log "Updating $FUNCTION_NAME"
  $AWS lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" >/dev/null
  $AWS lambda wait function-updated --function-name "$FUNCTION_NAME"
  $AWS lambda update-function-configuration --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" --handler "$HANDLER" --timeout "$TIMEOUT" --memory-size "$MEMORY" --environment "$ENV_VARS" >/dev/null
else
  log "Creating $FUNCTION_NAME"
  $AWS lambda create-function --function-name "$FUNCTION_NAME" --runtime "$RUNTIME" --role "$ROLE_ARN" \
    --handler "$HANDLER" --timeout "$TIMEOUT" --memory-size "$MEMORY" --environment "$ENV_VARS" \
    --zip-file "fileb://$SCRIPT_DIR/dist/handler.zip" >/dev/null
fi
$AWS lambda wait function-active --function-name "$FUNCTION_NAME"

FN_ARN="arn:aws:lambda:${REGION}:${ACCOUNT}:function:${FUNCTION_NAME}"
INTEGRATION_ID="$($AWS apigatewayv2 get-integrations --api-id "$HTTP_API_ID" \
  --query "Items[?IntegrationUri=='$FN_ARN'].IntegrationId" --output text 2>/dev/null || true)"
if [[ -z "$INTEGRATION_ID" || "$INTEGRATION_ID" == "None" ]]; then
  INTEGRATION_ID="$($AWS apigatewayv2 create-integration --api-id "$HTTP_API_ID" --integration-type AWS_PROXY \
    --integration-uri "$FN_ARN" --payload-format-version 2.0 --query IntegrationId --output text)"
fi
for METHOD in GET POST; do
  ROUTE_KEY="$METHOD $ROUTE_PATH"
  ROUTE_ID="$($AWS apigatewayv2 get-routes --api-id "$HTTP_API_ID" \
    --query "Items[?RouteKey=='$ROUTE_KEY'].RouteId" --output text 2>/dev/null || true)"
  if [[ -z "$ROUTE_ID" || "$ROUTE_ID" == "None" ]]; then
    $AWS apigatewayv2 create-route --api-id "$HTTP_API_ID" --route-key "$ROUTE_KEY" \
      --target "integrations/$INTEGRATION_ID" --authorization-type NONE >/dev/null
  else
    $AWS apigatewayv2 update-route --api-id "$HTTP_API_ID" --route-id "$ROUTE_ID" --target "integrations/$INTEGRATION_ID" >/dev/null
  fi
done
$AWS lambda remove-permission --function-name "$FUNCTION_NAME" --statement-id apigw-push-patch-ship >/dev/null 2>&1 || true
$AWS lambda add-permission --function-name "$FUNCTION_NAME" --statement-id apigw-push-patch-ship \
  --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT}:${HTTP_API_ID}/*/*${ROUTE_PATH}" >/dev/null

log "Done. SHIP_ADMIN_URL=https://${HTTP_API_ID}.execute-api.${REGION}.amazonaws.com${ROUTE_PATH}"
