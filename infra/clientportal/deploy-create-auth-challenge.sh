#!/usr/bin/env bash
# Hot-patch the existing CreateAuthChallenge Lambda (deployed by CDK)
# to use my4mlife-email-sender (Mailgun) instead of SES.
# Idempotent — safe to re-run.
set -euo pipefail

REGION="us-east-2"
FUNCTION_NAME="AuthStack-CreateAuthChallengeFn194629DD-g2tN35cKh8yA"
ROLE_NAME="AuthStack-CreateAuthChallengeFnServiceRoleFC96E196-ekv3zgcboKmV"
SENDER_FN="my4mlife-email-sender"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
SENDER_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${SENDER_FN}"

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/cdk/lambdas/auth/create-auth-challenge.ts"
BUILD="$ROOT/.build/create-auth-challenge"
mkdir -p "$BUILD"

echo "==> Build create-auth-challenge"
cd "$ROOT/cdk"
pnpm install --frozen-lockfile >/dev/null
pnpm exec esbuild "$SRC" \
  --bundle --platform=node --target=node20 --format=cjs \
  --outfile="$BUILD/index.js" --external:@aws-sdk/*
cd "$BUILD" && zip -q -FS index.zip index.js && cd "$ROOT"

echo "==> Grant lambda:InvokeFunction on $SENDER_FN to $ROLE_NAME"
aws iam put-role-policy --role-name "$ROLE_NAME" \
  --policy-name invoke-email-sender \
  --policy-document "$(cat <<EOF
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"lambda:InvokeFunction","Resource":"${SENDER_ARN}"}]}
EOF
)" >/dev/null

echo "==> Update function code + env"
aws lambda update-function-code --function-name "$FUNCTION_NAME" --region "$REGION" \
  --zip-file "fileb://$BUILD/index.zip" >/dev/null
aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"
aws lambda update-function-configuration --function-name "$FUNCTION_NAME" --region "$REGION" \
  --environment "Variables={EMAIL_SENDER_FN=${SENDER_FN}}" >/dev/null

echo "==> Done. CreateAuthChallenge now sends via Mailgun through $SENDER_FN."
