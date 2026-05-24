#!/usr/bin/env bash
# Deploy create-checkout-session Lambda — idempotent
set -euo pipefail

FUNCTION_NAME="my4mlife-create-checkout-session"
ROLE_NAME="my4mlife-create-checkout-session-role"
REGION="us-east-2"
HTTP_API_ID="v9svm8ds74"
RUNTIME="nodejs24.x"
HANDLER="handler.handler"
TIMEOUT=15
MEMORY=256
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
STRIPE_KEYS_ARN="arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:stripe-keys"
ADMIN_DEMO_ARN="arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:admin-demo-auth"
CONTACT_TABLE_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Contact"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Ensure admin-demo-auth secret exists (placeholder)"
if ! aws secretsmanager describe-secret --secret-id admin-demo-auth --region "$REGION" >/dev/null 2>&1; then
  aws secretsmanager create-secret \
    --name admin-demo-auth \
    --region "$REGION" \
    --description "Admin demo route basic-auth password — TJ must update the value" \
    --secret-string '{"password":"CHANGE_ME_VIA_TJ"}' >/dev/null
  echo "    Created admin-demo-auth secret with placeholder password"
else
  echo "    admin-demo-auth secret already exists — skipping create"
fi
# Resolve true ARN (suffix varies)
ADMIN_DEMO_ARN="$(aws secretsmanager describe-secret --secret-id admin-demo-auth --region "$REGION" --query 'ARN' --output text)"
STRIPE_KEYS_ARN="$(aws secretsmanager describe-secret --secret-id stripe-keys --region "$REGION" --query 'ARN' --output text 2>/dev/null || echo "arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:stripe-keys")"

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

echo "==> Apply IAM inline policy (secrets + DDB)"
POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": ["${STRIPE_KEYS_ARN}", "${ADMIN_DEMO_ARN}"]
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem", "dynamodb:UpdateItem"],
      "Resource": "${CONTACT_TABLE_ARN}"
    }
  ]
}
EOF
)
aws iam put-role-policy --role-name "$ROLE_NAME" \
  --policy-name "checkout-secrets-ddb" \
  --policy-document "$POLICY_DOC" >/dev/null

echo "==> Deploy function"
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  aws lambda update-function-code --function-name "$FUNCTION_NAME" --region "$REGION" \
    --zip-file "fileb://dist/handler.zip" >/dev/null
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"
  # Set env WITHOUT STRIPE_SECRET_KEY — only STRIPE_MODE=live
  aws lambda update-function-configuration --function-name "$FUNCTION_NAME" --region "$REGION" \
    --runtime "$RUNTIME" --handler "$HANDLER" --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --environment "Variables={STRIPE_MODE=live}" >/dev/null
else
  aws lambda create-function --function-name "$FUNCTION_NAME" --region "$REGION" \
    --runtime "$RUNTIME" --role "$ROLE_ARN" --handler "$HANDLER" \
    --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --environment "Variables={STRIPE_MODE=live}" \
    --zip-file "fileb://dist/handler.zip" >/dev/null
fi

FN_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}"
aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"

echo "==> Wire HTTP API routes (idempotent)"
# Lambda permission covering all routes under this API
aws lambda remove-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id apigw-create-checkout-session >/dev/null 2>&1 || true
aws lambda add-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id apigw-create-checkout-session \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${HTTP_API_ID}/*/*/api/*" >/dev/null

# Ensure single integration for this function
INTEG_ID=$(aws apigatewayv2 get-integrations --api-id "$HTTP_API_ID" --region "$REGION" \
  --query "Items[?IntegrationUri=='${FN_ARN}'].IntegrationId | [0]" --output text)
if [ -z "$INTEG_ID" ] || [ "$INTEG_ID" = "None" ]; then
  INTEG_ID=$(aws apigatewayv2 create-integration --api-id "$HTTP_API_ID" --region "$REGION" \
    --integration-type AWS_PROXY --integration-uri "$FN_ARN" \
    --payload-format-version 2.0 --query 'IntegrationId' --output text)
fi

for r in "POST /api/create-checkout-session" "OPTIONS /api/create-checkout-session" \
          "POST /api/admin/demo-checkout-session" "OPTIONS /api/admin/demo-checkout-session"; do
  ROUTE_ID=$(aws apigatewayv2 get-routes --api-id "$HTTP_API_ID" --region "$REGION" \
    --query "Items[?RouteKey=='${r}'].RouteId | [0]" --output text)
  if [ -z "$ROUTE_ID" ] || [ "$ROUTE_ID" = "None" ]; then
    aws apigatewayv2 create-route --api-id "$HTTP_API_ID" --region "$REGION" \
      --route-key "$r" --target "integrations/${INTEG_ID}" >/dev/null
    echo "    Created route: $r"
  else
    aws apigatewayv2 update-route --api-id "$HTTP_API_ID" --region "$REGION" \
      --route-id "$ROUTE_ID" --target "integrations/${INTEG_ID}" >/dev/null
    echo "    Updated route: $r"
  fi
done

echo "==> Done: POST+OPTIONS /api/create-checkout-session + /api/admin/demo-checkout-session → $FUNCTION_NAME"
