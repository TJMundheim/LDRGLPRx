#!/bin/bash
# Private, expiring $2 test-price token for live Push Patch end-to-end tests.
# Stored as SSM SecureString /my4mlife/push-patch/test-token = {"token","expiresAt"}; read by create-checkout-session.
#   --create [--days N]   new random token, expires in N days (default 3), overwrites; prints ONLY the test URL
#   --revoke              deletes the parameter (checkout falls back to normal prices immediately after cache TTL, <=60s)
set -euo pipefail

PARAM="/my4mlife/push-patch/test-token"
REGION="us-east-2"
BASE_URL="https://my4mlife.com/go/push-patch"

usage() {
  cat <<USAGE
Usage:
  $(basename "$0") --create [--days N]   Create/overwrite the test token (default 3 days); prints the test URL
  $(basename "$0") --revoke              Delete the test token
USAGE
}

case "${1:-}" in
  --create)
    DAYS=3
    if [[ "${2:-}" == "--days" ]]; then DAYS="${3:-}"; fi
    [[ "$DAYS" =~ ^[0-9]+$ && "$DAYS" -ge 1 ]] || { echo "--days must be a positive integer" >&2; exit 1; }
    TOKEN="$(openssl rand -base64 36 | tr '+/' '-_' | tr -d '=\n' | cut -c1-24)"
    EXPIRES="$(python3 -c "import datetime,sys;print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=int(sys.argv[1]))).strftime('%Y-%m-%dT%H:%M:%SZ'))" "$DAYS")"
    aws ssm put-parameter --region "$REGION" --name "$PARAM" --type SecureString --overwrite \
      --value "{\"token\":\"${TOKEN}\",\"expiresAt\":\"${EXPIRES}\"}" >/dev/null
    echo "${BASE_URL}?t=${TOKEN}"
    ;;
  --revoke)
    aws ssm delete-parameter --region "$REGION" --name "$PARAM" >/dev/null 2>&1 || true
    ;;
  *)
    usage
    ;;
esac
