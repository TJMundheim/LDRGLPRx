#!/usr/bin/env bash
set -euo pipefail

# Provisions S3 + CloudFront + ACM + Route 53 for my4mlife.com.
# Idempotent: safe to re-run; will reuse existing resources.

DOMAIN="my4mlife.com"
ALT_DOMAIN="www.my4mlife.com"
BUCKET="website-my4mlifecom"
HOSTED_ZONE_ID="Z045463539AAKM7D8P48V"
REGION="us-east-1"
PROFILE="default"
AWS="aws --profile $PROFILE --region $REGION"
STATE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.state.env"

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

# ── 2. ACM certificate (us-east-1 required for CloudFront) ────────────────────
log "Ensuring ACM certificate..."
CERT_ARN=$($AWS acm list-certificates --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn | [0]" --output text)
if [[ "$CERT_ARN" == "None" || -z "$CERT_ARN" ]]; then
  CERT_ARN=$($AWS acm request-certificate \
    --domain-name "$DOMAIN" \
    --subject-alternative-names "$ALT_DOMAIN" \
    --validation-method DNS \
    --query CertificateArn --output text)
  log "Requested cert $CERT_ARN — waiting for validation records..."
  sleep 5
fi
save CERT_ARN "$CERT_ARN"

# Create DNS validation records
log "Writing DNS validation records to Route 53..."
VALIDATIONS=$($AWS acm describe-certificate --certificate-arn "$CERT_ARN" \
  --query "Certificate.DomainValidationOptions[].ResourceRecord" --output json)
echo "$VALIDATIONS" | python3 -c "
import json, sys, subprocess, os
recs = json.load(sys.stdin)
seen = set()
changes = []
for r in recs:
  if not r or r['Name'] in seen: continue
  seen.add(r['Name'])
  changes.append({'Action':'UPSERT','ResourceRecordSet':{'Name':r['Name'],'Type':r['Type'],'TTL':300,'ResourceRecords':[{'Value':r['Value']}]}})
batch = {'Changes': changes}
with open('/tmp/acm-validation.json','w') as f: json.dump(batch,f)
"
$AWS route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch file:///tmp/acm-validation.json >/dev/null

log "Waiting for cert ISSUED (this can take a few minutes)..."
$AWS acm wait certificate-validated --certificate-arn "$CERT_ARN"
log "Cert issued."

# ── 3. CloudFront Origin Access Control ──────────────────────────────────────
log "Ensuring CloudFront OAC..."
OAC_ID=$($AWS cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$BUCKET-oac'].Id | [0]" --output text)
if [[ "$OAC_ID" == "None" || -z "$OAC_ID" ]]; then
  OAC_ID=$($AWS cloudfront create-origin-access-control \
    --origin-access-control-config "Name=$BUCKET-oac,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
    --query "OriginAccessControl.Id" --output text)
fi
save OAC_ID "$OAC_ID"

# ── 4. CloudFront distribution ───────────────────────────────────────────────
log "Ensuring CloudFront distribution..."
DIST_ID=$($AWS cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, '$DOMAIN')].Id | [0]" --output text)

if [[ "$DIST_ID" == "None" || -z "$DIST_ID" ]]; then
  CALLER_REF="my4mlife-$(date +%s)"
  cat > /tmp/cf-config.json <<EOF
{
  "CallerReference": "$CALLER_REF",
  "Aliases": {"Quantity": 2, "Items": ["$DOMAIN", "$ALT_DOMAIN"]},
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
    "FunctionAssociations": {"Quantity": 0},
    "LambdaFunctionAssociations": {"Quantity": 0},
    "FieldLevelEncryptionId": "",
    "SmoothStreaming": false
  },
  "CustomErrorResponses": {"Quantity": 2, "Items": [
    {"ErrorCode": 403, "ResponsePagePath": "/404.html", "ResponseCode": "404", "ErrorCachingMinTTL": 10},
    {"ErrorCode": 404, "ResponsePagePath": "/404.html", "ResponseCode": "404", "ErrorCachingMinTTL": 10}
  ]},
  "Comment": "my4mlife.com website",
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
  DIST_ID=$($AWS cloudfront create-distribution --distribution-config file:///tmp/cf-config.json \
    --query "Distribution.Id" --output text)
fi
save DIST_ID "$DIST_ID"

DIST_DOMAIN=$($AWS cloudfront get-distribution --id "$DIST_ID" --query "Distribution.DomainName" --output text)
save DIST_DOMAIN "$DIST_DOMAIN"
log "Distribution: $DIST_ID ($DIST_DOMAIN)"

# ── 5. S3 bucket policy granting CloudFront OAC access ───────────────────────
log "Setting bucket policy for OAC..."
ACCOUNT_ID=$($AWS sts get-caller-identity --query Account --output text)
cat > /tmp/bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontOAC",
    "Effect": "Allow",
    "Principal": {"Service": "cloudfront.amazonaws.com"},
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET/*",
    "Condition": {"StringEquals": {"AWS:SourceArn": "arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DIST_ID"}}
  }]
}
EOF
$AWS s3api put-bucket-policy --bucket "$BUCKET" --policy file:///tmp/bucket-policy.json

# ── 6. Route 53 A/AAAA aliases to CloudFront ─────────────────────────────────
log "Creating Route 53 alias records..."
cat > /tmp/r53-alias.json <<EOF
{
  "Changes": [
    {"Action":"UPSERT","ResourceRecordSet":{"Name":"$DOMAIN.","Type":"A","AliasTarget":{"HostedZoneId":"Z2FDTNDATAQYW2","DNSName":"$DIST_DOMAIN.","EvaluateTargetHealth":false}}},
    {"Action":"UPSERT","ResourceRecordSet":{"Name":"$DOMAIN.","Type":"AAAA","AliasTarget":{"HostedZoneId":"Z2FDTNDATAQYW2","DNSName":"$DIST_DOMAIN.","EvaluateTargetHealth":false}}},
    {"Action":"UPSERT","ResourceRecordSet":{"Name":"$ALT_DOMAIN.","Type":"A","AliasTarget":{"HostedZoneId":"Z2FDTNDATAQYW2","DNSName":"$DIST_DOMAIN.","EvaluateTargetHealth":false}}},
    {"Action":"UPSERT","ResourceRecordSet":{"Name":"$ALT_DOMAIN.","Type":"AAAA","AliasTarget":{"HostedZoneId":"Z2FDTNDATAQYW2","DNSName":"$DIST_DOMAIN.","EvaluateTargetHealth":false}}}
  ]
}
EOF
$AWS route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch file:///tmp/r53-alias.json >/dev/null

# ── 7. Wire deploy.sh ────────────────────────────────────────────────────────
DEPLOY_SH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/website/deploy.sh"
log "Updating $DEPLOY_SH..."
sed -i '' "s|^DOMAIN=\"\"|DOMAIN=\"$DOMAIN\"|" "$DEPLOY_SH"
sed -i '' "s|^BUCKET=\"\"|BUCKET=\"$BUCKET\"|" "$DEPLOY_SH"
sed -i '' "s|^DISTRIBUTION_ID=\"\"|DISTRIBUTION_ID=\"$DIST_ID\"|" "$DEPLOY_SH"

log "Waiting for CloudFront distribution to deploy (~5-15 min)..."
$AWS cloudfront wait distribution-deployed --id "$DIST_ID"

log "Provision complete."
log "  Bucket:        $BUCKET"
log "  Distribution:  $DIST_ID ($DIST_DOMAIN)"
log "  Cert:          $CERT_ARN"
log "  Site:          https://$DOMAIN"
log ""
log "Next: cd website && ./deploy.sh"
