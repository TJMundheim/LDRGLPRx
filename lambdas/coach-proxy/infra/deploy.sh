#!/usr/bin/env sh
# deploy.sh — build + package coach-proxy Lambda.
# AWS commands below are COMMENTED — the IaC layer (infra/ at repo root) calls them.
# Fill in the variables when the Lambda and API Gateway are provisioned.
set -eu

FUNCTION_NAME="ldrglprx-coach-proxy"      # REQUIRED — set when Lambda is created
REGION="us-east-1"                         # REQUIRED — set to your AWS region
API_ID=""                                  # REQUIRED — set when API Gateway is created
ROUTE_KEY="POST /coach"                    # REQUIRED — adjust if route differs

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building coach-proxy..."
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile
pnpm build

echo "Packaging dist/handler.js..."
cd "$SCRIPT_DIR/dist"
zip -q handler.zip handler.js

echo "dist/handler.zip ready."

# ── AWS commands — leave commented; IaC layer calls these ──────────────────────
#
# aws lambda update-function-code \
#   --function-name "$FUNCTION_NAME" \
#   --zip-file fileb://dist/handler.zip \
#   --region "$REGION"
#
# aws apigatewayv2 create-route \
#   --api-id "$API_ID" \
#   --route-key "$ROUTE_KEY" \
#   --region "$REGION"
#
# aws lambda add-permission \
#   --function-name "$FUNCTION_NAME" \
#   --statement-id apigw-invoke \
#   --action lambda:InvokeFunction \
#   --principal apigateway.amazonaws.com \
#   --region "$REGION"
#
# Bedrock migration (no direct Anthropic SDK / ANTHROPIC_API_KEY — HIPAA rule):
# execution role needs bedrock:InvokeModel on the foundation-model + inference-profile
# ARNs (copy the inline policy shape from lambdas/inbound-handler/infra/deploy.sh),
# plus aws-marketplace:ViewSubscriptions/Subscribe for the Anthropic model listing:
#
# aws lambda update-function-configuration \
#   --function-name "$FUNCTION_NAME" \
#   --environment "Variables={BEDROCK_MODEL=us.anthropic.claude-haiku-4-5-20251001-v1:0}" \
#   --region "$REGION"
#
# ──────────────────────────────────────────────────────────────────────────────

echo "Done. Run the IaC deploy script at repo infra/ to push to AWS."
