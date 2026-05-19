#!/usr/bin/env sh
# deploy.sh — build + package lead-capture Lambda.
# AWS provisioning happens in the repo-level infra/ scripts.
set -eu

FUNCTION_NAME="my4mlife-lead-capture"
REGION="us-east-2"

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building lead-capture..."
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile
pnpm build

echo "Packaging dist/handler.js..."
cd "$SCRIPT_DIR/dist"
zip -q handler.zip handler.js

echo "dist/handler.zip ready."

# aws lambda update-function-code \
#   --function-name "$FUNCTION_NAME" \
#   --zip-file fileb://dist/handler.zip \
#   --region "$REGION"

echo "Done."
