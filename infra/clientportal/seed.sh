#!/usr/bin/env bash
# Seed script runner for AppSync AppConfig + Program + WeeklyContent + TierCatalog.
# Usage:
#   ./infra/clientportal/seed.sh              # live run (requires APPSYNC_URL + AWS creds)
#   ./infra/clientportal/seed.sh --dry-run    # print planned mutations and exit 0
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR/seed"

# Install deps if node_modules is absent
if [ ! -d node_modules ]; then
  echo "[seed.sh] Installing dependencies..."
  pnpm install --frozen-lockfile
fi

pnpm tsx seed.ts "$@"
