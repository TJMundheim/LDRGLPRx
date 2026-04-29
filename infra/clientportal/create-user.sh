#!/usr/bin/env bash
# Create a passwordless Cognito user + DynamoDB UserProfile row.
# Usage:
#   ./infra/clientportal/create-user.sh --email <email> --name <name> [--admin]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR/seed"

if [ ! -d node_modules ]; then
  echo "[create-user.sh] Installing dependencies..."
  pnpm install --frozen-lockfile
fi

pnpm tsx create-user.ts "$@"
