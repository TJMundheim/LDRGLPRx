#!/usr/bin/env bash
# api-throttling.sh — per-route throttling on the public HTTP API (v9svm8ds74).
#
# Stage default stays 10 rps / 50 burst. Routes below get tighter caps because
# each one triggers a costly or abusable side effect (Cognito user creation,
# email/SMS send, Stripe object creation). Idempotent — safe to re-run.
set -euo pipefail

API_ID="v9svm8ds74"
REGION="us-east-2"
AWS="aws --region $REGION"

# route-key|rate|burst — rate = sustained req/sec, burst = short spike allowance
LIMITS=(
  "POST /api/request-otp|1|3"
  "POST /api/audit-complete|1|3"
  "POST /api/protege-signup|1|3"
  "POST /api/send-app-link|1|3"
  "POST /api/contact-form|2|5"
  "POST /api/lead-capture|2|5"
  "POST /api/create-setup-intent|2|5"
  "POST /api/create-checkout-session|2|5"
  "POST /api/customer-portal-session|2|5"
  "POST /api/patient-record-intake|2|5"
)

ROUTE_SETTINGS="{"
FIRST=1
for entry in "${LIMITS[@]}"; do
  IFS='|' read -r key rate burst <<< "$entry"
  [ $FIRST -eq 0 ] && ROUTE_SETTINGS+=","
  FIRST=0
  ROUTE_SETTINGS+="\"$key\":{\"ThrottlingRateLimit\":$rate,\"ThrottlingBurstLimit\":$burst}"
done
ROUTE_SETTINGS+="}"

echo "==> Applying per-route throttles to $API_ID \$default stage..."
$AWS apigatewayv2 update-stage \
  --api-id "$API_ID" \
  --stage-name '$default' \
  --route-settings "$ROUTE_SETTINGS" \
  --query "RouteSettings" --output json

echo "==> Done."
