#!/usr/bin/env bash
# Deploy my4mlife-subscription-handler Lambda — idempotent
# Handles customer.subscription.created|updated|deleted via EventBridge.
# TODO: Wire EventBridge rule + DLQ target once partner bus is provisioned (P2).
set -euo pipefail

FUNCTION_NAME="my4mlife-subscription-handler"
ROLE_NAME="my4mlife-subscription-handler-role"
REGION="us-east-2"
RUNTIME="nodejs20.x"
HANDLER="handler.handler"
TIMEOUT=15
MEMORY=256

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

STRIPE_KEYS_ARN="$(aws secretsmanager describe-secret --secret-id all-stripe-keys --region "$REGION" --query 'ARN' --output text)"
CONTACT_TABLE_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Contact"
SUBSCRIPTIONS_TABLE_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Subscriptions"
TOUCHPOINTS_TABLE_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Touchpoints"

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
  echo "    Waiting for role propagation..."; sleep 10
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
      "Action": ["dynamodb:UpdateItem", "dynamodb:GetItem"],
      "Resource": "${CONTACT_TABLE_ARN}"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem", "dynamodb:UpdateItem"],
      "Resource": "${SUBSCRIPTIONS_TABLE_ARN}"
    },
    {
      "Effect": "Allow",
      "Action": "dynamodb:PutItem",
      "Resource": "${TOUCHPOINTS_TABLE_ARN}"
    }
  ]
}
EOF
)
aws iam put-role-policy --role-name "$ROLE_NAME" \
  --policy-name "subscription-handler-policy" \
  --policy-document "$POLICY_DOC" >/dev/null

echo "==> Deploy Lambda"
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  aws lambda update-function-code --function-name "$FUNCTION_NAME" --region "$REGION" \
    --zip-file "fileb://dist/handler.zip" >/dev/null
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"
  aws lambda update-function-configuration --function-name "$FUNCTION_NAME" --region "$REGION" \
    --runtime "$RUNTIME" --handler "$HANDLER" --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --environment "Variables={STRIPE_MODE=test}" >/dev/null
else
  aws lambda create-function --function-name "$FUNCTION_NAME" --region "$REGION" \
    --runtime "$RUNTIME" --role "$ROLE_ARN" --handler "$HANDLER" \
    --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --environment "Variables={STRIPE_MODE=test}" \
    --zip-file "fileb://dist/handler.zip" >/dev/null
fi
aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"

echo "==> Done: $FUNCTION_NAME deployed in $REGION"
echo "    NOTE: EventBridge rule NOT wired — blocked on P2 partner bus setup."
echo "    Run P2 first, then update this script with rule + DLQ target."
