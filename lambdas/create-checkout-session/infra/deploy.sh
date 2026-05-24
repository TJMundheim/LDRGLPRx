#!/usr/bin/env bash
# Deploy create-checkout-session Lambda — receives {skuId, priceId, contactId, ...},
# creates a Stripe Checkout Session, returns the redirect URL.
set -euo pipefail

FUNCTION_NAME="my4mlife-create-checkout-session"
ROLE_NAME="my4mlife-create-checkout-session-role"
REGION="us-east-2"
HTTP_API_ID="v9svm8ds74"
ROUTE="POST /api/create-checkout-session"
OPTIONS_ROUTE="OPTIONS /api/create-checkout-session"
RUNTIME="nodejs24.x"
HANDLER="handler.handler"
TIMEOUT=15
MEMORY=256
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

echo "==> Wire HTTP API routes"
API_ARN="arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${HTTP_API_ID}/*/*/api/create-checkout-session"
aws lambda remove-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id apigw-create-checkout-session >/dev/null 2>&1 || true
aws lambda add-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id apigw-create-checkout-session \
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

for r in "$ROUTE" "$OPTIONS_ROUTE"; do
  ROUTE_ID=$(aws apigatewayv2 get-routes --api-id "$HTTP_API_ID" --region "$REGION" \
    --query "Items[?RouteKey=='${r}'].RouteId | [0]" --output text)
  if [ -z "$ROUTE_ID" ] || [ "$ROUTE_ID" = "None" ]; then
    aws apigatewayv2 create-route --api-id "$HTTP_API_ID" --region "$REGION" \
      --route-key "$r" --target "integrations/${INTEG_ID}" >/dev/null
  else
    aws apigatewayv2 update-route --api-id "$HTTP_API_ID" --region "$REGION" \
      --route-id "$ROUTE_ID" --target "integrations/${INTEG_ID}" >/dev/null
  fi
done

echo "==> Deployed: POST/OPTIONS /api/create-checkout-session → $FUNCTION_NAME"
