#!/usr/bin/env bash
# Deploy reminder-dispatcher Lambda — idempotent
# Triggered by EventBridge cron every 10 minutes.
# Scans EventReminders for due scheduled reminders, invokes email-sender, marks sent/failed.
set -euo pipefail

FUNCTION_NAME="my4mlife-reminder-dispatcher"
ROLE_NAME="my4mlife-reminder-dispatcher-role"
REGION="us-east-2"
RUNTIME="nodejs20.x"
HANDLER="handler.handler"
TIMEOUT=60
MEMORY=256
RULE_NAME="reminder-dispatcher-every-10min"

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

echo "==> Apply IAM inline policy"
POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DDBReminders",
      "Effect": "Allow",
      "Action": ["dynamodb:Scan", "dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/EventReminders"
    },
    {
      "Sid": "DDBLookups",
      "Effect": "Allow",
      "Action": "dynamodb:GetItem",
      "Resource": [
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Events",
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Contact"
      ]
    },
    {
      "Sid": "InvokeEmailSender",
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:my4mlife-email-sender"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/aws/lambda/${FUNCTION_NAME}:*"
    }
  ]
}
EOF
)
aws iam put-role-policy --role-name "$ROLE_NAME" \
  --policy-name "reminder-dispatcher-policy" \
  --policy-document "$POLICY_DOC" >/dev/null

echo "==> Deploy function"
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  aws lambda update-function-code --function-name "$FUNCTION_NAME" --region "$REGION" \
    --zip-file "fileb://dist/handler.zip" >/dev/null
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"
  aws lambda update-function-configuration --function-name "$FUNCTION_NAME" --region "$REGION" \
    --runtime "$RUNTIME" --handler "$HANDLER" \
    --timeout "$TIMEOUT" --memory-size "$MEMORY" >/dev/null
else
  aws lambda create-function --function-name "$FUNCTION_NAME" --region "$REGION" \
    --runtime "$RUNTIME" --role "$ROLE_ARN" --handler "$HANDLER" \
    --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --zip-file "fileb://dist/handler.zip" >/dev/null
fi
aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"

FN_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}"

echo "==> Wire EventBridge rule: $RULE_NAME"
aws events put-rule --name "$RULE_NAME" --region "$REGION" \
  --schedule-expression "rate(10 minutes)" \
  --state ENABLED >/dev/null

aws lambda remove-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id eventbridge-every-10min >/dev/null 2>&1 || true
aws lambda add-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id eventbridge-every-10min \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/${RULE_NAME}" >/dev/null

aws events put-targets --rule "$RULE_NAME" --region "$REGION" \
  --targets "[{\"Id\":\"reminder-dispatcher-target\",\"Arn\":\"${FN_ARN}\"}]" >/dev/null

echo "==> Done: $FUNCTION_NAME + EventBridge rule $RULE_NAME deployed to $REGION"
