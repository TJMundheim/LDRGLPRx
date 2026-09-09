#!/usr/bin/env bash
# deploy-ses-receiving.sh — wire SES inbound email receiving on
# inbox.my4mlife.com into the (already-deployed) my4mlife-inbound-handler
# Lambda. Idempotent. Run from any directory.
#
# ORDERING: run lambdas/concierge-approve/infra/deploy.sh, then
# infra/deploy.sh (this lambda's), THEN this script last.
#
# IMPORTANT: this script does NOT touch the root my4mlife.com MX record
# (Google Workspace, `1 SMTP.GOOGLE.COM`) — it only adds records on the
# inbox.my4mlife.com subdomain.
set -euo pipefail

REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
HOSTED_ZONE_ID="Z045463539AAKM7D8P48V"
INBOUND_SUBDOMAIN="inbox.my4mlife.com"
RECIPIENT="inbox.my4mlife.com"
BUCKET_NAME="my4mlife-inbound-mail"
OBJECT_PREFIX="mail/"
LAMBDA_FUNCTION_NAME="my4mlife-inbound-handler"
RULE_SET_NAME="my4mlife-inbound"
RULE_NAME="concierge-inbox"

AWS="aws --region $REGION"
AWS_R53="aws --region us-east-1" # Route53 is a global service; region flag is harmless either way

log() { echo "==> $*"; }

FUNCTION_ARN="arn:aws:lambda:${REGION}:${AWS_ACCOUNT_ID}:function:${LAMBDA_FUNCTION_NAME}"

# ── 1a. Verify SES domain identity for inbox.my4mlife.com ──────────────────────
log "Verifying SES domain identity for $INBOUND_SUBDOMAIN..."
VERIFICATION_TOKEN="$($AWS ses verify-domain-identity --domain "$INBOUND_SUBDOMAIN" --query VerificationToken --output text)"
log "  Verification token: $VERIFICATION_TOKEN"

# ── 1b. Route53: MX + TXT for inbox.my4mlife.com ────────────────────────────────
log "Upserting Route53 records on $INBOUND_SUBDOMAIN (zone $HOSTED_ZONE_ID)..."
CHANGE_BATCH_FILE="$(mktemp)"
trap 'rm -f "$CHANGE_BATCH_FILE"' EXIT

cat > "$CHANGE_BATCH_FILE" <<EOF
{
  "Comment": "Wire SES inbound receiving for concierge email (inbox.my4mlife.com only — root MX untouched)",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$INBOUND_SUBDOMAIN",
        "Type": "MX",
        "TTL": 300,
        "ResourceRecords": [{"Value": "10 inbound-smtp.${REGION}.amazonaws.com"}]
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "_amazonses.${INBOUND_SUBDOMAIN}",
        "Type": "TXT",
        "TTL": 300,
        "ResourceRecords": [{"Value": "\"${VERIFICATION_TOKEN}\""}]
      }
    }
  ]
}
EOF

CHANGE_ID="$($AWS_R53 route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch "file://$CHANGE_BATCH_FILE" \
  --query 'ChangeInfo.Id' --output text)"
log "  Route53 change submitted: $CHANGE_ID (propagation can take minutes)."

# ── 2. S3 bucket for inbound mail ───────────────────────────────────────────────
log "Ensuring S3 bucket $BUCKET_NAME..."
if $AWS s3api head-bucket --bucket "$BUCKET_NAME" >/dev/null 2>&1; then
  log "  Bucket already exists."
else
  $AWS s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --create-bucket-configuration LocationConstraint="$REGION" >/dev/null
  log "  Bucket created."
fi

log "  Blocking public access..."
$AWS s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true >/dev/null

log "  Enabling default SSE-S3 encryption..."
$AWS s3api put-bucket-encryption \
  --bucket "$BUCKET_NAME" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' >/dev/null

log "  Setting 30-day expiration lifecycle rule..."
$AWS s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET_NAME" \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "expire-inbound-mail-30d",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "Expiration": {"Days": 30}
      }
    ]
  }' >/dev/null

log "  Applying SES-receiving bucket policy..."
BUCKET_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSESPuts",
      "Effect": "Allow",
      "Principal": {"Service": "ses.amazonaws.com"},
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*",
      "Condition": {
        "StringEquals": {"aws:Referer": "${AWS_ACCOUNT_ID}"}
      }
    }
  ]
}
EOF
)
$AWS s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy "$BUCKET_POLICY" >/dev/null

# ── 3. Lambda invoke permission for SES ─────────────────────────────────────────
log "Granting SES invoke permission on $LAMBDA_FUNCTION_NAME..."
$AWS lambda add-permission \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --statement-id ses-invoke \
  --action lambda:InvokeFunction \
  --principal ses.amazonaws.com \
  --source-account "$AWS_ACCOUNT_ID" >/dev/null 2>&1 || log "  Permission ses-invoke already present (ignored)."

# ── 4. Receipt rule set + rule ───────────────────────────────────────────────────
log "Ensuring receipt rule set $RULE_SET_NAME..."
if $AWS ses describe-receipt-rule-set --rule-set-name "$RULE_SET_NAME" >/dev/null 2>&1; then
  log "  Rule set already exists."
else
  $AWS ses create-receipt-rule-set --rule-set-name "$RULE_SET_NAME" >/dev/null
  log "  Rule set created."
fi

RULE_JSON=$(cat <<EOF
{
  "Name": "${RULE_NAME}",
  "Enabled": true,
  "TlsPolicy": "Optional",
  "ScanEnabled": true,
  "Recipients": ["${RECIPIENT}"],
  "Actions": [
    {
      "S3Action": {
        "BucketName": "${BUCKET_NAME}",
        "ObjectKeyPrefix": "${OBJECT_PREFIX}"
      }
    },
    {
      "LambdaAction": {
        "FunctionArn": "${FUNCTION_ARN}",
        "InvocationType": "Event"
      }
    }
  ]
}
EOF
)

log "Ensuring receipt rule $RULE_NAME in $RULE_SET_NAME..."
if $AWS ses describe-receipt-rule --rule-set-name "$RULE_SET_NAME" --rule-name "$RULE_NAME" >/dev/null 2>&1; then
  $AWS ses update-receipt-rule --rule-set-name "$RULE_SET_NAME" --rule "$RULE_JSON" >/dev/null
  log "  Rule updated."
else
  $AWS ses create-receipt-rule --rule-set-name "$RULE_SET_NAME" --rule "$RULE_JSON" >/dev/null
  log "  Rule created."
fi

log "Activating rule set $RULE_SET_NAME..."
$AWS ses set-active-receipt-rule-set --rule-set-name "$RULE_SET_NAME" >/dev/null

# ── 5. Final checklist ───────────────────────────────────────────────────────────
cat <<EOF

==> Done wiring SES inbound receiving.

Checklist:
  1. MX + TXT propagation on ${INBOUND_SUBDOMAIN} can take a few minutes to
     a few hours. Check with:
       dig MX ${INBOUND_SUBDOMAIN}
       dig TXT _amazonses.${INBOUND_SUBDOMAIN}
     Domain identity verification status:
       aws --region ${REGION} ses get-identity-verification-attributes --identities ${INBOUND_SUBDOMAIN}

  2. Google Admin routing step still required (TJ) — see
     docs/ops/google-routing-concierge.md. Until that rule is saved, mail to
     support@/info@my4mlife.com will NOT be copied to concierge@${INBOUND_SUBDOMAIN},
     so nothing reaches this pipeline yet.

  3. SES is in sandbox — you cannot use "aws ses send-email" to test sending,
     but RECEIVING is not sandbox-gated. To test end-to-end once (1) and (2)
     above are done: send an email to concierge@${INBOUND_SUBDOMAIN} from any
     mailbox and confirm a draft notification lands in drtj@my4mlife.com.

EOF
