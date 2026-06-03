#!/usr/bin/env bash
set -euo pipefail

FUNCTION_NAME="my4mlife-order-handler"
REGION="us-east-2"
ACCOUNT="879696522760"
ROLE_NAME="${FUNCTION_NAME}-role"
RUNTIME="nodejs20.x"
HANDLER="handler.handler"

STRIPE_KEYS_ARN="arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret:all-stripe-keys-*"
CONTACT_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/Contact"
ORDERS_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/Orders"
TOUCHPOINTS_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/Touchpoints"
DIGITAL_BUCKET_ARN="arn:aws:s3:::my4mlife-digital-fulfillment/*"
EMAIL_SENDER_ARN="arn:aws:lambda:${REGION}:${ACCOUNT}:function:my4mlife-email-sender"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAMBDA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ── Build ──────────────────────────────────────────────────────────────────────
echo "Building bundle..."
cd "${LAMBDA_DIR}"
pnpm build
cd dist && zip -q "${LAMBDA_DIR}/dist/handler.zip" handler.js && cd "${LAMBDA_DIR}"

# ── IAM role (idempotent) ─────────────────────────────────────────────────────
TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

if ! aws iam get-role --role-name "${ROLE_NAME}" --region "${REGION}" &>/dev/null; then
  echo "Creating IAM role ${ROLE_NAME}..."
  aws iam create-role --role-name "${ROLE_NAME}" --assume-role-policy-document "${TRUST}" --region "${REGION}"
  sleep 5
fi

POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem", "dynamodb:UpdateItem"],
      "Resource": ["${CONTACT_ARN}", "${ORDERS_ARN}", "${TOUCHPOINTS_ARN}"]
    },
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "${STRIPE_KEYS_ARN}"
    },
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "${DIGITAL_BUCKET_ARN}"
    },
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "${EMAIL_SENDER_ARN}"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:${REGION}:${ACCOUNT}:log-group:/aws/lambda/${FUNCTION_NAME}:*"
    }
  ]
}
EOF
)

aws iam put-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-name "order-handler-inline" \
  --policy-document "${POLICY}" \
  --region "${REGION}"

ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/${ROLE_NAME}"

# ── Lambda (idempotent) ───────────────────────────────────────────────────────
ENV_VARS='{"Variables":{"STRIPE_MODE":"test"}}'

if aws lambda get-function --function-name "${FUNCTION_NAME}" --region "${REGION}" &>/dev/null; then
  echo "Updating Lambda function code..."
  aws lambda update-function-code \
    --function-name "${FUNCTION_NAME}" \
    --zip-file "fileb://${LAMBDA_DIR}/dist/handler.zip" \
    --region "${REGION}" \
   
  aws lambda wait function-updated --function-name "${FUNCTION_NAME}" --region "${REGION}"
  aws lambda update-function-configuration \
    --function-name "${FUNCTION_NAME}" \
    --environment "${ENV_VARS}" \
    --region "${REGION}" \
   
else
  echo "Creating Lambda function ${FUNCTION_NAME}..."
  aws lambda create-function \
    --function-name "${FUNCTION_NAME}" \
    --runtime "${RUNTIME}" \
    --role "${ROLE_ARN}" \
    --handler "${HANDLER}" \
    --zip-file "fileb://${LAMBDA_DIR}/dist/handler.zip" \
    --environment "${ENV_VARS}" \
    --region "${REGION}" \
   
fi

echo "Deploy complete: ${FUNCTION_NAME}"

# ── TODO: P4.4 — EventBridge rule (BLOCKED on P2 partner bus) ─────────────────
# Uncomment + fill PARTNER_BUS_ARN once P2.1 is complete and bus-arn.txt exists.
#
# PARTNER_BUS_ARN="$(cat "$(git rev-parse --show-toplevel)/infra/eventbridge/bus-arn.txt")"
# PARTNER_BUS_NAME="$(basename "${PARTNER_BUS_ARN}")"
# LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT}:function:${FUNCTION_NAME}"
#
# aws events put-rule \
#   --name "order-handler-checkout-completed" \
#   --event-bus-name "${PARTNER_BUS_ARN}" \
#   --event-pattern '{"detail-type":["checkout.session.completed"]}' \
#   --state ENABLED \
#   --region "${REGION}" \
#  
#
# DLQ_ARN="$(aws sqs get-queue-attributes \
#   --queue-url "$(aws sqs get-queue-url --queue-name my4mlife-stripe-events-dlq --region ${REGION} --output text)" \
#   --attribute-names QueueArn --region ${REGION} --query 'Attributes.QueueArn' --output text)"
#
# aws events put-targets \
#   --rule "order-handler-checkout-completed" \
#   --event-bus-name "${PARTNER_BUS_ARN}" \
#   --targets "[{\"Id\":\"order-handler\",\"Arn\":\"${LAMBDA_ARN}\",\"DeadLetterConfig\":{\"Arn\":\"${DLQ_ARN}\"},\"RetryPolicy\":{\"MaximumRetryAttempts\":2}}]" \
#   --region "${REGION}" \
#  
#
# aws lambda add-permission \
#   --function-name "${FUNCTION_NAME}" \
#   --statement-id "eventbridge-invoke" \
#   --action lambda:InvokeFunction \
#   --principal events.amazonaws.com \
#   --source-arn "arn:aws:events:${REGION}:${ACCOUNT}:rule/${PARTNER_BUS_NAME}/order-handler-checkout-completed" \
#   --region "${REGION}" 2>/dev/null || true
