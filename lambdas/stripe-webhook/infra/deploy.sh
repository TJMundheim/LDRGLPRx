#!/usr/bin/env bash
# deploy.sh — build, package, and deploy the stripe-webhook Lambda.
# Idempotent: creates IAM role + function + API Gateway route on first run,
# updates on subsequent runs. Mirrors the pattern from email-sender.
#
# Env vars on the Lambda must be set separately via update-function-configuration
# (Stripe secret key + webhook signing secret + Mailgun creds + booking URL).
set -euo pipefail

FUNCTION_NAME="my4mlife-stripe-webhook"
ROLE_NAME="my4mlife-stripe-webhook-role"
REGION="us-east-2"
HTTP_API_ID="v9svm8ds74"
WEBHOOK_ROUTE="POST /api/stripe-webhook"
RUNTIME="nodejs24.x"
HANDLER="handler.handler"
TIMEOUT=30
MEMORY=512
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Build"
pnpm install --frozen-lockfile
pnpm build
cd dist && zip -q -FS handler.zip handler.js && cd ..

echo "==> Ensure IAM role"
if ! aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws iam create-role --role-name "$ROLE_NAME" \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  aws iam attach-role-policy --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "    waiting for role propagation..."; sleep 10
fi

echo "==> Inline policies (DynamoDB Contact/Orders/Touchpoints + SNS publish + Secrets read)"
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name ddb-rw \
  --policy-document "$(cat <<EOF
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["dynamodb:GetItem","dynamodb:PutItem","dynamodb:UpdateItem","dynamodb:Query"],"Resource":["arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Contact","arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Contact/index/*","arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Orders","arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Orders/index/*","arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Touchpoints","arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Touchpoints/index/*"]}]}
EOF
)" >/dev/null

aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name sns-publish \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"sns:Publish","Resource":"*"}]}' >/dev/null

aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name secrets-read \
  --policy-document "$(cat <<EOF
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"secretsmanager:GetSecretValue","Resource":["arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:mailgun-api-key-*","arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:mailgun-email-addresses-*","arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:stripe-keys-*"]}]}
EOF
)" >/dev/null

echo "==> Deploy function"
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  aws lambda update-function-code --function-name "$FUNCTION_NAME" --region "$REGION" \
    --zip-file "fileb://dist/handler.zip" >/dev/null
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"
  aws lambda update-function-configuration --function-name "$FUNCTION_NAME" --region "$REGION" \
    --runtime "$RUNTIME" --handler "$HANDLER" --timeout "$TIMEOUT" --memory-size "$MEMORY" >/dev/null
else
  aws lambda create-function --function-name "$FUNCTION_NAME" --region "$REGION" \
    --runtime "$RUNTIME" --role "$ROLE_ARN" --handler "$HANDLER" \
    --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --zip-file "fileb://dist/handler.zip" >/dev/null
fi

FN_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}"

echo "==> Wire HTTP API route $WEBHOOK_ROUTE → $FUNCTION_NAME"
API_ARN="arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${HTTP_API_ID}/*/*/api/stripe-webhook"
aws lambda remove-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id apigw-stripe-webhook >/dev/null 2>&1 || true
aws lambda add-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id apigw-stripe-webhook \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "$API_ARN" >/dev/null

INTEG_ID=$(aws apigatewayv2 get-integrations --api-id "$HTTP_API_ID" --region "$REGION" \
  --query "Items[?IntegrationUri=='${FN_ARN}'].IntegrationId | [0]" --output text)
if [ -z "$INTEG_ID" ] || [ "$INTEG_ID" = "None" ]; then
  INTEG_ID=$(aws apigatewayv2 create-integration --api-id "$HTTP_API_ID" --region "$REGION" \
    --integration-type AWS_PROXY --integration-uri "$FN_ARN" \
    --payload-format-version 2.0 --query 'IntegrationId' --output text)
fi

ROUTE_ID=$(aws apigatewayv2 get-routes --api-id "$HTTP_API_ID" --region "$REGION" \
  --query "Items[?RouteKey=='${WEBHOOK_ROUTE}'].RouteId | [0]" --output text)
if [ -z "$ROUTE_ID" ] || [ "$ROUTE_ID" = "None" ]; then
  aws apigatewayv2 create-route --api-id "$HTTP_API_ID" --region "$REGION" \
    --route-key "$WEBHOOK_ROUTE" --target "integrations/${INTEG_ID}" >/dev/null
else
  aws apigatewayv2 update-route --api-id "$HTTP_API_ID" --region "$REGION" \
    --route-id "$ROUTE_ID" --target "integrations/${INTEG_ID}" >/dev/null
fi

WEBHOOK_URL="https://${HTTP_API_ID}.execute-api.${REGION}.amazonaws.com/api/stripe-webhook"
echo "==> Deployed + wired: $FUNCTION_NAME ($RUNTIME)"
echo "    Webhook URL (paste this into Stripe Dashboard → Webhooks → Add endpoint):"
echo "    $WEBHOOK_URL"
