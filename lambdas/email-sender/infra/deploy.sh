#!/usr/bin/env bash
# deploy.sh — build, package, and deploy the email-sender Lambda.
# Idempotent: creates IAM role + function on first run, updates on subsequent runs.
set -euo pipefail

FUNCTION_NAME="my4mlife-email-sender"
ROLE_NAME="my4mlife-email-sender-role"
REGION="us-east-2"
USER_POOL_ID="us-east-2_kIpKnr17R"
RUNTIME="nodejs24.x"
HANDLER="handler.handler"
TIMEOUT=15
MEMORY=256
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
SECRET_ARNS="arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:mailgun-api-key-* arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:mailgun-email-addresses-*"

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

aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name secrets-read \
  --policy-document "$(cat <<EOF
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"secretsmanager:GetSecretValue","Resource":[$(echo "$SECRET_ARNS" | awk '{for(i=1;i<=NF;i++)printf "%s\"%s\"",(i>1?",":""),$i}')]}]}
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
POOL_ARN="arn:aws:cognito-idp:${REGION}:${ACCOUNT_ID}:userpool/${USER_POOL_ID}"

echo "==> Grant Cognito invoke permission"
aws lambda remove-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id cognito-custom-message >/dev/null 2>&1 || true
aws lambda add-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id cognito-custom-message \
  --action lambda:InvokeFunction \
  --principal cognito-idp.amazonaws.com \
  --source-arn "$POOL_ARN" >/dev/null

echo "==> Merge CustomMessage into User Pool LambdaConfig"
MERGED_CONFIG=$(aws cognito-idp describe-user-pool --user-pool-id "$USER_POOL_ID" --region "$REGION" \
  --query 'UserPool.LambdaConfig' --output json \
  | FN_ARN="$FN_ARN" python3 -c 'import json,os,sys; c=json.load(sys.stdin) or {}; c["CustomMessage"]=os.environ["FN_ARN"]; print(json.dumps(c))')
aws cognito-idp update-user-pool --user-pool-id "$USER_POOL_ID" --region "$REGION" \
  --lambda-config "$MERGED_CONFIG" >/dev/null

echo "==> Deployed + wired: $FUNCTION_NAME ($RUNTIME) → User Pool $USER_POOL_ID"
