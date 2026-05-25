#!/usr/bin/env bash
# Deploy customer-portal-session Lambda + HTTP API route — idempotent
set -euo pipefail

FUNCTION_NAME="my4mlife-customer-portal-session"
ROLE_NAME="my4mlife-customer-portal-session-role"
REGION="us-east-2"
HTTP_API_ID="v9svm8ds74"
RUNTIME="nodejs20.x"
HANDLER="handler.handler"
TIMEOUT=15
MEMORY=256
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
CONTACT_TABLE_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Contact"
STRIPE_KEYS_ARN="$(aws secretsmanager describe-secret --secret-id stripe-keys --region "$REGION" --query 'ARN' --output text)"

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

echo "==> Apply IAM inline policy"
POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "${STRIPE_KEYS_ARN}"
    },
    {
      "Effect": "Allow",
      "Action": "dynamodb:GetItem",
      "Resource": "${CONTACT_TABLE_ARN}"
    }
  ]
}
EOF
)
aws iam put-role-policy --role-name "$ROLE_NAME" \
  --policy-name "portal-session-policy" \
  --policy-document "$POLICY_DOC" >/dev/null

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
aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"

FN_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}"

echo "==> Ensure Cognito JWT authorizer"
POOL_ARN="arn:aws:cognito-idp:${REGION}:${ACCOUNT_ID}:userpool/us-east-2_kIpKnr17R"
POOL_CLIENT_ID="$(aws cognito-idp list-user-pool-clients --user-pool-id us-east-2_kIpKnr17R --region "$REGION" --query 'UserPoolClients[0].ClientId' --output text)"
ISSUER="https://cognito-idp.${REGION}.amazonaws.com/us-east-2_kIpKnr17R"

AUTH_ID="$(aws apigatewayv2 get-authorizers --api-id "$HTTP_API_ID" --region "$REGION" \
  --query "Items[?Name=='CognitoJwt'].AuthorizerId | [0]" --output text)"
if [ -z "$AUTH_ID" ] || [ "$AUTH_ID" = "None" ]; then
  AUTH_ID="$(aws apigatewayv2 create-authorizer --api-id "$HTTP_API_ID" --region "$REGION" \
    --name CognitoJwt \
    --authorizer-type JWT \
    --identity-source '$request.header.Authorization' \
    --jwt-configuration "Issuer=${ISSUER},Audience=[\"${POOL_CLIENT_ID}\"]" \
    --query 'AuthorizerId' --output text)"
  echo "    Created JWT authorizer: $AUTH_ID"
else
  echo "    JWT authorizer already exists: $AUTH_ID"
fi

echo "==> Lambda permission"
aws lambda remove-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id apigw-customer-portal-session >/dev/null 2>&1 || true
aws lambda add-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id apigw-customer-portal-session \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${HTTP_API_ID}/*/*/api/*" >/dev/null

echo "==> Ensure integration"
INTEG_ID="$(aws apigatewayv2 get-integrations --api-id "$HTTP_API_ID" --region "$REGION" \
  --query "Items[?IntegrationUri=='${FN_ARN}'].IntegrationId | [0]" --output text)"
if [ -z "$INTEG_ID" ] || [ "$INTEG_ID" = "None" ]; then
  INTEG_ID="$(aws apigatewayv2 create-integration --api-id "$HTTP_API_ID" --region "$REGION" \
    --integration-type AWS_PROXY --integration-uri "$FN_ARN" \
    --payload-format-version 2.0 --query 'IntegrationId' --output text)"
fi

echo "==> Wire route POST /api/customer-portal-session with JWT authorizer"
ROUTE_ID="$(aws apigatewayv2 get-routes --api-id "$HTTP_API_ID" --region "$REGION" \
  --query "Items[?RouteKey=='POST /api/customer-portal-session'].RouteId | [0]" --output text)"
if [ -z "$ROUTE_ID" ] || [ "$ROUTE_ID" = "None" ]; then
  aws apigatewayv2 create-route --api-id "$HTTP_API_ID" --region "$REGION" \
    --route-key "POST /api/customer-portal-session" \
    --target "integrations/${INTEG_ID}" \
    --authorization-type JWT \
    --authorizer-id "$AUTH_ID" >/dev/null
  echo "    Created route with JWT auth"
else
  aws apigatewayv2 update-route --api-id "$HTTP_API_ID" --region "$REGION" \
    --route-id "$ROUTE_ID" \
    --target "integrations/${INTEG_ID}" \
    --authorization-type JWT \
    --authorizer-id "$AUTH_ID" >/dev/null
  echo "    Updated route with JWT auth"
fi

echo "==> Done: POST /api/customer-portal-session → $FUNCTION_NAME (JWT-authed)"
