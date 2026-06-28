#!/usr/bin/env bash
# deploy.sh — my4mlife-charge-on-approval
#
# Deploys the charge-on-approval Lambda (AppSync DIRECT LAMBDA RESOLVER).
# NO API Gateway route — AppSync invokes the function directly.
# Idempotent: safe to run multiple times.

set -euo pipefail

FUNCTION_NAME="my4mlife-charge-on-approval"
ROLE_NAME="my4mlife-charge-on-approval-role"
REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"

PATIENT_RECORDS_TABLE="PatientRecords"
TOUCHPOINTS_TABLE="Touchpoints"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAMBDA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---------------------------------------------------------------------------
# 1. Build
# ---------------------------------------------------------------------------
echo "→ Installing dependencies…"
pnpm -C "$LAMBDA_DIR" install --frozen-lockfile

echo "→ Building…"
pnpm -C "$LAMBDA_DIR" build

echo "→ Packaging…"
(cd "$LAMBDA_DIR/dist" && zip -q handler.zip handler.js)

# ---------------------------------------------------------------------------
# 2. IAM Role
# ---------------------------------------------------------------------------
TRUST_DOC='{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}'

INLINE_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:$REGION:$AWS_ACCOUNT_ID:log-group:/aws/lambda/$FUNCTION_NAME:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query",
        "dynamodb:UpdateItem",
        "dynamodb:PutItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$PATIENT_RECORDS_TABLE",
        "arn:aws:dynamodb:$REGION:$AWS_ACCOUNT_ID:table/$TOUCHPOINTS_TABLE"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:$REGION:$AWS_ACCOUNT_ID:secret:all-stripe-keys-*"
    }
  ]
}
EOF
)

echo "→ Ensuring IAM role $ROLE_NAME…"
if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "   Role already exists."
else
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_DOC" \
    --region "$REGION"
  echo "   Role created."
fi

echo "→ Attaching inline policy…"
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "${ROLE_NAME}-policy" \
  --policy-document "$INLINE_POLICY"

ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME"

# ---------------------------------------------------------------------------
# 3. Lambda create or update
# ---------------------------------------------------------------------------
ENV_VARS="Variables={PATIENT_RECORDS_TABLE=$PATIENT_RECORDS_TABLE,TOUCHPOINTS_TABLE=$TOUCHPOINTS_TABLE,STRIPE_MODE=test}"

ZIP_PATH="$LAMBDA_DIR/dist/handler.zip"

if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "→ Updating function code…"
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$ZIP_PATH" \
    --region "$REGION"

  aws lambda wait function-updated \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION"

  echo "→ Updating function configuration…"
  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --environment "$ENV_VARS" \
    --timeout 30 \
    --memory-size 256 \
    --region "$REGION"
else
  echo "→ Creating function (waiting for role propagation)…"
  sleep 8
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs20.x \
    --role "$ROLE_ARN" \
    --handler handler.handler \
    --zip-file "fileb://$ZIP_PATH" \
    --environment "$ENV_VARS" \
    --timeout 30 \
    --memory-size 256 \
    --region "$REGION"
fi

aws lambda wait function-active \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION"

echo "✓ $FUNCTION_NAME deployed (AppSync wires the resolver separately)."
