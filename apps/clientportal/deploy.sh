#!/usr/bin/env bash
set -euo pipefail
DOMAIN="app.my4mlife.com"
BUCKET="application-my4mlife"
DISTRIBUTION_ID="E2RJ7NRPD4MN2X"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"

echo "==> Building PWA..."
cd "$SCRIPT_DIR"
pnpm build

echo "==> Syncing hashed assets (long cache)..."
aws s3 sync "$DIST_DIR" "s3://$BUCKET" \
  --exclude "*.html" --exclude "sw.js" --exclude "registerSW.js" \
  --exclude "manifest.webmanifest" --exclude "workbox-*.js" \
  --cache-control "public, max-age=31536000, immutable" --delete

echo "==> Syncing HTML / SW / manifest (no-cache)..."
aws s3 sync "$DIST_DIR" "s3://$BUCKET" \
  --exclude "*" --include "*.html" --include "sw.js" --include "registerSW.js" \
  --include "manifest.webmanifest" --include "workbox-*.js" \
  --cache-control "no-cache, no-store, must-revalidate" --delete

echo "==> Invalidating CloudFront..."
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"

echo "==> Deploy complete — https://$DOMAIN"
