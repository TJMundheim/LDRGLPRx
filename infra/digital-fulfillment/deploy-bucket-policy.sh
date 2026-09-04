#!/usr/bin/env bash
# Applies the public-read policy for the free Protégé assets in the digital-fulfillment bucket.
# The welcome emails (audit-complete + protege-signup) link to these keys with plain,
# non-expiring S3 URLs, so every key linked from an email MUST be listed here.
# Re-run after adding/renaming a free asset key. Idempotent.
set -euo pipefail

BUCKET="${DIGITAL_FULFILLMENT_BUCKET:-my4mlife-digital-fulfillment}"
REGION="${AWS_REGION:-us-east-2}"
AWS="aws --region $REGION"

# Every key the welcome email links to. Old logbook key kept for emails already sent.
PUBLIC_KEYS=(
  "begin-with-the-end-in-mind.pdf"
  "the-logbook-month1.pdf"
  "cohort-workbook-month1.pdf"
)

RESOURCES=""
for k in "${PUBLIC_KEYS[@]}"; do RESOURCES+="\"arn:aws:s3:::$BUCKET/$k\","; done
RESOURCES="${RESOURCES%,}"

POLICY_FILE="$(mktemp)"
cat > "$POLICY_FILE" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadForFreeAssets",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [ $RESOURCES ]
    }
  ]
}
JSON

echo "Applying bucket policy to s3://$BUCKET ..."
$AWS s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$POLICY_FILE"
rm -f "$POLICY_FILE"

echo "Verifying public reads:"
for k in "${PUBLIC_KEYS[@]}"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -I "https://$BUCKET.s3.$REGION.amazonaws.com/$k")
  echo "  $code  $k"
  [ "$code" = "200" ] || { echo "FAIL: $k not publicly readable"; exit 1; }
done
echo "Done."
