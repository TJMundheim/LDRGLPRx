#!/usr/bin/env bash
# setup-ses.sh — Verify my4mlife.com domain in SES (us-east-2) and add DKIM records.
set -euo pipefail

REGION="us-east-2"
DOMAIN="my4mlife.com"
SENDER_EMAIL="drtj@my4mlife.com"

echo "=== SES domain identity: $DOMAIN ==="

# 1. Create domain identity (idempotent — ignore AlreadyExists)
aws sesv2 create-email-identity \
  --email-identity "$DOMAIN" \
  --region "$REGION" 2>&1 | grep -v AlreadyExists || true

# 2. Fetch DKIM tokens
TOKENS=$(aws sesv2 get-email-identity \
  --email-identity "$DOMAIN" \
  --region "$REGION" \
  --query 'DkimAttributes.Tokens' \
  --output json)

echo ""
echo "DKIM CNAME records to add (if not auto-added via Route53 below):"
for token in $(echo "$TOKENS" | jq -r '.[]'); do
  echo "  ${token}._domainkey.${DOMAIN}  CNAME  ${token}.dkim.amazonses.com"
done

# 3. Auto-upsert into Route53 if a hosted zone exists
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name "$DOMAIN" \
  --query "HostedZones[?Name=='${DOMAIN}.'].Id" \
  --output text | head -1 | sed 's|/hostedzone/||')

if [[ -n "$ZONE_ID" ]]; then
  echo ""
  echo "Found Route53 hosted zone $ZONE_ID — upserting DKIM CNAMEs..."

  CHANGES=$(python3 - <<PYEOF
import json, sys
tokens = json.loads("""$TOKENS""")
domain = "$DOMAIN"
changes = []
for t in tokens:
    changes.append({
        "Action": "UPSERT",
        "ResourceRecordSet": {
            "Name": f"{t}._domainkey.{domain}",
            "Type": "CNAME",
            "TTL": 300,
            "ResourceRecords": [{"Value": f"{t}.dkim.amazonses.com"}]
        }
    })
print(json.dumps({"Changes": changes}))
PYEOF
)

  aws route53 change-resource-record-sets \
    --hosted-zone-id "$ZONE_ID" \
    --change-batch "$CHANGES" \
    --region us-east-1 \
    --query 'ChangeInfo.Status' \
    --output text
  echo "DKIM CNAMEs upserted into Route53."
else
  echo "No Route53 hosted zone found for $DOMAIN — add the CNAME records above manually."
fi

# 4. Also register drtj@my4mlife.com as a recipient identity (sandbox mode)
echo ""
echo "=== Recipient identity: $SENDER_EMAIL (sandbox mode) ==="
aws sesv2 create-email-identity \
  --email-identity "$SENDER_EMAIL" \
  --region "$REGION" 2>&1 | grep -v AlreadyExists || true
echo "Verification email sent to $SENDER_EMAIL — user must click the link in that inbox."

# 5. Poll for domain verification (up to 5 minutes)
echo ""
echo "=== Polling for domain verification (timeout: 5 min) ==="
DEADLINE=$((SECONDS + 300))
while [[ $SECONDS -lt $DEADLINE ]]; do
  STATUS=$(aws sesv2 get-email-identity \
    --email-identity "$DOMAIN" \
    --region "$REGION" \
    --query 'VerifiedForSendingStatus' \
    --output text)
  DKIM_STATUS=$(aws sesv2 get-email-identity \
    --email-identity "$DOMAIN" \
    --region "$REGION" \
    --query 'DkimAttributes.Status' \
    --output text)
  echo "  VerifiedForSendingStatus=$STATUS  DkimStatus=$DKIM_STATUS"
  if [[ "$STATUS" == "True" ]]; then
    echo "Domain $DOMAIN is verified and ready to send!"
    break
  fi
  sleep 15
done

if [[ "$STATUS" != "True" ]]; then
  echo "Domain verification still pending after 5 min — DNS propagation may take longer."
  echo "Re-run this script later or check the SES console."
fi
