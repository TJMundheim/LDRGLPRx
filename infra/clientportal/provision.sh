#!/usr/bin/env bash
set -euo pipefail

# Provisions S3 + CloudFront + ACM + Route 53 for app.my4mlife.com (PWA).
# Idempotent.

DOMAIN="app.my4mlife.com"
BUCKET="application-my4mlife"
HOSTED_ZONE_ID="Z045463539AAKM7D8P48V"
REGION="us-east-1"
PROFILE="default"
AWS="aws --profile $PROFILE --region $REGION"
STATE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.state.env"
FN_NAME="my4mlife-app-index-rewrite"

log() { echo "==> $*"; }
save() { echo "$1=$2" >> "$STATE_FILE"; }
[[ -f "$STATE_FILE" ]] || : > "$STATE_FILE"

# ── 1. S3 bucket ──────────────────────────────────────────────────────────────
log "Ensuring S3 bucket $BUCKET..."
if ! $AWS s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  $AWS s3api create-bucket --bucket "$BUCKET"
  $AWS s3api put-public-access-block --bucket "$BUCKET" \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
fi

# ── 2. ACM certificate ───────────────────────────────────────────────────────
log "Ensuring ACM certificate..."
CERT_ARN=$($AWS acm list-certificates --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn | [0]" --output text)
if [[ "$CERT_ARN" == "None" || -z "$CERT_ARN" ]]; then
  CERT_ARN=$($AWS acm request-certificate \
    --domain-name "$DOMAIN" \
    --validation-method DNS \
    --query CertificateArn --output text)
  log "Requested cert $CERT_ARN"
  sleep 5
fi
save CERT_ARN "$CERT_ARN"

log "Writing DNS validation records to Route 53..."
$AWS acm describe-certificate --certificate-arn "$CERT_ARN" \
  --query "Certificate.DomainValidationOptions[].ResourceRecord" --output json > /tmp/app-validations.json
python3 <<'PY'
import json
recs = json.load(open('/tmp/app-validations.json'))
seen = set(); changes = []
for r in recs:
  if not r or r['Name'] in seen: continue
  seen.add(r['Name'])
  changes.append({'Action':'UPSERT','ResourceRecordSet':{'Name':r['Name'],'Type':r['Type'],'TTL':300,'ResourceRecords':[{'Value':r['Value']}]}})
json.dump({'Changes': changes}, open('/tmp/app-acm-validation.json','w'))
PY
$AWS route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch file:///tmp/app-acm-validation.json >/dev/null

log "Waiting for cert ISSUED..."
$AWS acm wait certificate-validated --certificate-arn "$CERT_ARN"
log "Cert issued."

# ── 3. CloudFront OAC ────────────────────────────────────────────────────────
log "Ensuring CloudFront OAC..."
OAC_ID=$($AWS cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$BUCKET-oac'].Id | [0]" --output text)
if [[ "$OAC_ID" == "None" || -z "$OAC_ID" ]]; then
  OAC_ID=$($AWS cloudfront create-origin-access-control \
    --origin-access-control-config "Name=$BUCKET-oac,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
    --query "OriginAccessControl.Id" --output text)
fi
save OAC_ID "$OAC_ID"

# ── 4. CloudFront Function: SPA-aware index rewrite ──────────────────────────
log "Ensuring CloudFront Function $FN_NAME..."
cat > /tmp/app-index-rewrite.js <<'EOF'
function handler(event) {
  var req = event.request;
  var uri = req.uri;
  if (uri.endsWith('/')) {
    req.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    req.uri = uri + '/index.html';
  }
  return req;
}
EOF
if $AWS cloudfront describe-function --name "$FN_NAME" >/dev/null 2>&1; then
  ETAG=$($AWS cloudfront describe-function --name "$FN_NAME" --query "ETag" --output text)
  $AWS cloudfront update-function --name "$FN_NAME" \
    --function-config "Comment=app index rewrite,Runtime=cloudfront-js-2.0" \
    --function-code fileb:///tmp/app-index-rewrite.js --if-match "$ETAG" >/dev/null
else
  $AWS cloudfront create-function --name "$FN_NAME" \
    --function-config "Comment=app index rewrite,Runtime=cloudfront-js-2.0" \
    --function-code fileb:///tmp/app-index-rewrite.js >/dev/null
fi
ETAG=$($AWS cloudfront describe-function --name "$FN_NAME" --query "ETag" --output text)
$AWS cloudfront publish-function --name "$FN_NAME" --if-match "$ETAG" >/dev/null
FN_ARN=$($AWS cloudfront describe-function --name "$FN_NAME" --query "FunctionSummary.FunctionMetadata.FunctionARN" --output text)

# ── 5. CloudFront distribution ───────────────────────────────────────────────
log "Ensuring CloudFront distribution..."
DIST_ID=$($AWS cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, '$DOMAIN')].Id | [0]" --output text)

if [[ "$DIST_ID" == "None" || -z "$DIST_ID" ]]; then
  CALLER_REF="my4mlife-app-$(date +%s)"
  cat > /tmp/app-cf-config.json <<EOF
{
  "CallerReference": "$CALLER_REF",
  "Aliases": {"Quantity": 1, "Items": ["$DOMAIN"]},
  "DefaultRootObject": "index.html",
  "Origins": {"Quantity": 1, "Items": [{
    "Id": "s3-$BUCKET",
    "DomainName": "$BUCKET.s3.$REGION.amazonaws.com",
    "OriginAccessControlId": "$OAC_ID",
    "S3OriginConfig": {"OriginAccessIdentity": ""},
    "CustomHeaders": {"Quantity": 0},
    "ConnectionAttempts": 3,
    "ConnectionTimeout": 10,
    "OriginShield": {"Enabled": false}
  }]},
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-$BUCKET",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {"Quantity": 2, "Items": ["GET","HEAD"], "CachedMethods": {"Quantity": 2, "Items": ["GET","HEAD"]}},
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "FunctionAssociations": {"Quantity": 1, "Items": [{"FunctionARN": "$FN_ARN", "EventType": "viewer-request"}]},
    "LambdaFunctionAssociations": {"Quantity": 0},
    "FieldLevelEncryptionId": "",
    "SmoothStreaming": false
  },
  "CustomErrorResponses": {"Quantity": 2, "Items": [
    {"ErrorCode": 403, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 10},
    {"ErrorCode": 404, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 10}
  ]},
  "Comment": "app.my4mlife.com PWA",
  "Enabled": true,
  "ViewerCertificate": {
    "ACMCertificateArn": "$CERT_ARN",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021",
    "Certificate": "$CERT_ARN",
    "CertificateSource": "acm"
  },
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2and3",
  "IsIPV6Enabled": true,
  "Restrictions": {"GeoRestriction": {"RestrictionType": "none", "Quantity": 0}},
  "WebACLId": "",
  "Staging": false
}
EOF
  DIST_ID=$($AWS cloudfront create-distribution --distribution-config file:///tmp/app-cf-config.json \
    --query "Distribution.Id" --output text)
fi
save DIST_ID "$DIST_ID"
DIST_DOMAIN=$($AWS cloudfront get-distribution --id "$DIST_ID" --query "Distribution.DomainName" --output text)
save DIST_DOMAIN "$DIST_DOMAIN"
log "Distribution: $DIST_ID ($DIST_DOMAIN)"

# ── 6. Bucket policy ─────────────────────────────────────────────────────────
log "Setting bucket policy..."
ACCOUNT_ID=$($AWS sts get-caller-identity --query Account --output text)
cat > /tmp/app-bucket-policy.json <<EOF
{"Version":"2012-10-17","Statement":[{
  "Sid":"AllowCloudFrontOAC","Effect":"Allow",
  "Principal":{"Service":"cloudfront.amazonaws.com"},
  "Action":"s3:GetObject","Resource":"arn:aws:s3:::$BUCKET/*",
  "Condition":{"StringEquals":{"AWS:SourceArn":"arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DIST_ID"}}
}]}
EOF
$AWS s3api put-bucket-policy --bucket "$BUCKET" --policy file:///tmp/app-bucket-policy.json

# ── 7. Route 53 alias ────────────────────────────────────────────────────────
log "Creating Route 53 alias..."
cat > /tmp/app-r53-alias.json <<EOF
{"Changes":[
  {"Action":"UPSERT","ResourceRecordSet":{"Name":"$DOMAIN.","Type":"A","AliasTarget":{"HostedZoneId":"Z2FDTNDATAQYW2","DNSName":"$DIST_DOMAIN.","EvaluateTargetHealth":false}}},
  {"Action":"UPSERT","ResourceRecordSet":{"Name":"$DOMAIN.","Type":"AAAA","AliasTarget":{"HostedZoneId":"Z2FDTNDATAQYW2","DNSName":"$DIST_DOMAIN.","EvaluateTargetHealth":false}}}
]}
EOF
$AWS route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch file:///tmp/app-r53-alias.json >/dev/null

# ── 8. Wire deploy.sh ────────────────────────────────────────────────────────
DEPLOY_SH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/apps/clientportal/deploy.sh"
log "Writing $DEPLOY_SH..."
cat > "$DEPLOY_SH" <<EOF
#!/usr/bin/env bash
set -euo pipefail
DOMAIN="$DOMAIN"
BUCKET="$BUCKET"
DISTRIBUTION_ID="$DIST_ID"
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="\$SCRIPT_DIR/dist"

echo "==> Building PWA..."
cd "\$SCRIPT_DIR"
pnpm build

echo "==> Syncing hashed assets (long cache)..."
aws s3 sync "\$DIST_DIR" "s3://\$BUCKET" \\
  --exclude "*.html" --exclude "sw.js" --exclude "registerSW.js" \\
  --exclude "manifest.webmanifest" --exclude "workbox-*.js" \\
  --cache-control "public, max-age=31536000, immutable" --delete

echo "==> Syncing HTML / SW / manifest (no-cache)..."
aws s3 sync "\$DIST_DIR" "s3://\$BUCKET" \\
  --exclude "*" --include "*.html" --include "sw.js" --include "registerSW.js" \\
  --include "manifest.webmanifest" --include "workbox-*.js" \\
  --cache-control "no-cache, no-store, must-revalidate" --delete

echo "==> Invalidating CloudFront..."
aws cloudfront create-invalidation --distribution-id "\$DISTRIBUTION_ID" --paths "/*"

echo "==> Deploy complete — https://\$DOMAIN"
EOF
chmod +x "$DEPLOY_SH"

log "Waiting for CloudFront distribution to deploy (~5-15 min)..."
$AWS cloudfront wait distribution-deployed --id "$DIST_ID"

log "Provision complete."
log "  Bucket:        $BUCKET"
log "  Distribution:  $DIST_ID ($DIST_DOMAIN)"
log "  Cert:          $CERT_ARN"
log "  Site:          https://$DOMAIN"
log ""
log "Next: cd apps/clientportal && ./deploy.sh"
