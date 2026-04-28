#!/usr/bin/env bash
set -euo pipefail

# ── Required configuration ────────────────────────────────────────────────────
DOMAIN="my4mlife.com"              # REQUIRED — fill in when domain registered (e.g. ldrglprx.com)
BUCKET="website-my4mlifecom"              # REQUIRED — fill in when S3 bucket created (e.g. ldrglprx-website)
DISTRIBUTION_ID="E3J19LI34BC2VR"     # REQUIRED — fill in when CloudFront distribution created
# ─────────────────────────────────────────────────────────────────────────────

# Validate required vars
MISSING=""
[[ -z "$DOMAIN" ]]           && MISSING="${MISSING}\n  DOMAIN"
[[ -z "$BUCKET" ]]           && MISSING="${MISSING}\n  BUCKET"
[[ -z "$DISTRIBUTION_ID" ]] && MISSING="${MISSING}\n  DISTRIBUTION_ID"

if [[ -n "$MISSING" ]]; then
  echo ""
  echo "ERROR: The following required variables are not set in website/deploy.sh:"
  echo -e "$MISSING"
  echo ""
  echo "Open website/deploy.sh and fill in the values at the top of the file."
  echo "These are created when you register the domain and provision the CDN stack."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"

echo "==> Building website (domain: $DOMAIN)..."
cd "$SCRIPT_DIR"
pnpm build

echo "==> Syncing assets (long cache)..."
aws s3 sync "$DIST_DIR" "s3://$BUCKET" \
  --exclude "*.html" \
  --cache-control "public, max-age=31536000, immutable" \
  --delete

echo "==> Syncing HTML files (no-cache)..."
aws s3 sync "$DIST_DIR" "s3://$BUCKET" \
  --exclude "*" \
  --include "*.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --delete

echo "==> Invalidating CloudFront distribution $DISTRIBUTION_ID..."
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*"

echo "==> Deploy complete — https://$DOMAIN"
