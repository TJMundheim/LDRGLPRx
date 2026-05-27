#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-2"
ACCOUNT="879696522760"
FUNCTION_NAME="my4mlife-stripe-events-retry"
ROLE_NAME="${FUNCTION_NAME}-role"
SCHEDULER_ROLE_NAME="${FUNCTION_NAME}-scheduler-role"

DLQ_ARN="arn:aws:sqs:${REGION}:${ACCOUNT}:my4mlife-stripe-events-dlq"
DLQ_URL="https://sqs.${REGION}.amazonaws.com/${ACCOUNT}/my4mlife-stripe-events-dlq"
PF_ARN="arn:aws:sqs:${REGION}:${ACCOUNT}:my4mlife-stripe-events-permanent-failures"
PF_URL="https://sqs.${REGION}.amazonaws.com/${ACCOUNT}/my4mlife-stripe-events-permanent-failures"
STRIPE_KEYS_ARN="$(aws secretsmanager describe-secret --secret-id all-stripe-keys --region "$REGION" --query 'ARN' --output text)"
RETRY_STATE_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/RetryState"
CONTACT_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/Contact"
ORDERS_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/Orders"
SUBSCRIPTIONS_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/Subscriptions"
TOUCHPOINTS_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/Touchpoints"

LAMBDA_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ── 1. Build ─────────────────────────────────────────────────────────────────
echo "Building ${FUNCTION_NAME}..."
mkdir -p "${LAMBDA_DIR}/dist"
npx esbuild "${LAMBDA_DIR}/src/handler.ts" \
  --bundle --platform=node --target=node20 --format=cjs \
  --outfile="${LAMBDA_DIR}/dist/handler.js" \
  --external:@aws-sdk/\*
cd "${LAMBDA_DIR}/dist" && zip -q handler.zip handler.js && cd -

# ── 2. Scheduler target role (idempotent) ────────────────────────────────────
echo "Ensuring scheduler target role ${SCHEDULER_ROLE_NAME}..."
SCHEDULER_ROLE_ARN=$(aws iam get-role --role-name "${SCHEDULER_ROLE_NAME}" \
  --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "${SCHEDULER_ROLE_ARN}" ]; then
  SCHEDULER_ROLE_ARN=$(aws iam create-role \
    --role-name "${SCHEDULER_ROLE_NAME}" \
    --assume-role-policy-document '{
      "Version":"2012-10-17",
      "Statement":[{"Effect":"Allow","Principal":{"Service":"scheduler.amazonaws.com"},
        "Action":"sts:AssumeRole"}]
    }' \
    --query 'Role.Arn' --output text)
  echo "Created scheduler role: ${SCHEDULER_ROLE_ARN}"
fi

# ── 3. Lambda execution role (idempotent) ────────────────────────────────────
echo "Ensuring Lambda role ${ROLE_NAME}..."
ROLE_ARN=$(aws iam get-role --role-name "${ROLE_NAME}" \
  --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "${ROLE_ARN}" ]; then
  ROLE_ARN=$(aws iam create-role \
    --role-name "${ROLE_NAME}" \
    --assume-role-policy-document '{
      "Version":"2012-10-17",
      "Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},
        "Action":"sts:AssumeRole"}]
    }' \
    --query 'Role.Arn' --output text)
  sleep 10  # IAM propagation
  echo "Created role: ${ROLE_ARN}"
fi

aws iam put-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-name "stripe-events-retry-policy" \
  --policy-document "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[
      {\"Effect\":\"Allow\",\"Action\":[\"logs:CreateLogGroup\",\"logs:CreateLogStream\",\"logs:PutLogEvents\"],\"Resource\":\"*\"},
      {\"Effect\":\"Allow\",\"Action\":[\"sqs:ReceiveMessage\",\"sqs:DeleteMessage\",\"sqs:GetQueueAttributes\"],\"Resource\":\"${DLQ_ARN}\"},
      {\"Effect\":\"Allow\",\"Action\":\"sqs:SendMessage\",\"Resource\":\"${PF_ARN}\"},
      {\"Effect\":\"Allow\",\"Action\":[\"scheduler:CreateSchedule\",\"scheduler:DeleteSchedule\"],
        \"Resource\":\"arn:aws:scheduler:${REGION}:${ACCOUNT}:schedule/default/stripe-retry-*\"},
      {\"Effect\":\"Allow\",\"Action\":\"iam:PassRole\",\"Resource\":\"${SCHEDULER_ROLE_ARN}\"},
      {\"Effect\":\"Allow\",\"Action\":\"secretsmanager:GetSecretValue\",\"Resource\":\"${STRIPE_KEYS_ARN}\"},
      {\"Effect\":\"Allow\",\"Action\":[\"dynamodb:GetItem\",\"dynamodb:PutItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\"],
        \"Resource\":\"${RETRY_STATE_ARN}\"},
      {\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\",\"dynamodb:UpdateItem\"],
        \"Resource\":[\"${CONTACT_ARN}\",\"${ORDERS_ARN}\",\"${SUBSCRIPTIONS_ARN}\",\"${TOUCHPOINTS_ARN}\"]}
    ]
  }"

# Grant scheduler role permission to invoke this Lambda (we need the Lambda ARN for this, do it after Lambda exists)

# ── 4. Lambda function (idempotent) ──────────────────────────────────────────
echo "Deploying Lambda ${FUNCTION_NAME}..."
LAMBDA_ARN_FULL="arn:aws:lambda:${REGION}:${ACCOUNT}:function:${FUNCTION_NAME}"

EXISTING=$(aws lambda get-function --function-name "${FUNCTION_NAME}" \
  --region "${REGION}" --query 'Configuration.FunctionArn' --output text 2>/dev/null || echo "")

ENV_VARS="Variables={STRIPE_MODE=test,DLQ_URL=${DLQ_URL},PERMANENT_FAILURES_URL=${PF_URL},RETRY_STATE_TABLE=RetryState,SCHEDULER_ROLE_ARN=${SCHEDULER_ROLE_ARN},LAMBDA_ARN=${LAMBDA_ARN_FULL}}"

if [ -z "${EXISTING}" ]; then
  aws lambda create-function \
    --function-name "${FUNCTION_NAME}" \
    --runtime nodejs20.x \
    --role "${ROLE_ARN}" \
    --handler handler.handler \
    --zip-file "fileb://${LAMBDA_DIR}/dist/handler.zip" \
    --environment "${ENV_VARS}" \
    --timeout 30 \
    --region "${REGION}"
  echo "Created Lambda"
else
  aws lambda update-function-code \
    --function-name "${FUNCTION_NAME}" \
    --zip-file "fileb://${LAMBDA_DIR}/dist/handler.zip" \
    --region "${REGION}"
  aws lambda wait function-updated --function-name "${FUNCTION_NAME}" --region "${REGION}"
  aws lambda update-function-configuration \
    --function-name "${FUNCTION_NAME}" \
    --environment "${ENV_VARS}" \
    --region "${REGION}"
  echo "Updated Lambda"
fi

aws lambda wait function-updated --function-name "${FUNCTION_NAME}" --region "${REGION}"

# ── 5. Scheduler role policy — grant invoke on this Lambda ───────────────────
aws iam put-role-policy \
  --role-name "${SCHEDULER_ROLE_NAME}" \
  --policy-name "invoke-retry-lambda" \
  --policy-document "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[{
      \"Effect\":\"Allow\",
      \"Action\":\"lambda:InvokeFunction\",
      \"Resource\":\"${LAMBDA_ARN_FULL}\"
    }]
  }"

# ── 6. SQS event-source mapping (idempotent, batch size 1) ──────────────────
echo "Ensuring SQS event-source mapping..."
MAPPING_UUID=$(aws lambda list-event-source-mappings \
  --function-name "${FUNCTION_NAME}" \
  --event-source-arn "${DLQ_ARN}" \
  --region "${REGION}" \
  --query 'EventSourceMappings[0].UUID' --output text 2>/dev/null || echo "")

if [ -z "${MAPPING_UUID}" ] || [ "${MAPPING_UUID}" = "None" ]; then
  aws lambda create-event-source-mapping \
    --function-name "${FUNCTION_NAME}" \
    --event-source-arn "${DLQ_ARN}" \
    --batch-size 1 \
    --region "${REGION}"
  echo "Created SQS event-source mapping"
else
  echo "SQS mapping already exists: ${MAPPING_UUID}"
fi

echo "Done. Verifying..."
aws lambda list-event-source-mappings \
  --function-name "${FUNCTION_NAME}" \
  --region "${REGION}" \
  --query 'EventSourceMappings[].{UUID:UUID,State:State}' \
  --output table
