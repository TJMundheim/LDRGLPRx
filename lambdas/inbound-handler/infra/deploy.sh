#!/usr/bin/env sh
set -eu
FUNCTION_NAME="my4mlife-inbound-handler"
REGION="us-east-2"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile
pnpm build
cd "$SCRIPT_DIR/dist"
zip -q handler.zip handler.js
echo "dist/handler.zip ready."
