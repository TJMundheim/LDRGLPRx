#!/usr/bin/env bash
# deploy-ses-rule.sh — route tracking@inbox.my4mlife.com to the push-patch-tracking Lambda.
# Adds receipt rule `push-patch-tracking` to the live rule set my4mlife-inbound, FIRST in order,
# so it matches before `concierge-inbox` (which owns the whole inbox.my4mlife.com domain).
# Actions: S3 (same bucket as concierge-inbox, prefix push-patch-tracking/) -> Lambda (Event) -> Stop.
# The Stop action ends rule-set processing, so the concierge never sees these emails.
# Idempotent. Run AFTER lambdas/push-patch-tracking/infra/deploy.sh. Does not touch DNS or the
# concierge rule.
set -euo pipefail

REGION="us-east-2"
AWS_ACCOUNT_ID="879696522760"
RULE_SET_NAME="my4mlife-inbound"
RULE_NAME="push-patch-tracking"
CONCIERGE_RULE="concierge-inbox"
RECIPIENT="tracking@inbox.my4mlife.com"
OBJECT_PREFIX="push-patch-tracking/"
LAMBDA_FUNCTION_NAME="my4mlife-push-patch-tracking"

AWS="aws --region $REGION"
log() { echo "==> $*"; }

FUNCTION_ARN="arn:aws:lambda:${REGION}:${AWS_ACCOUNT_ID}:function:${LAMBDA_FUNCTION_NAME}"

# ── 1. Read the bucket from the existing concierge rule (nothing hard-coded) ───
log "Reading S3 bucket from rule $CONCIERGE_RULE..."
BUCKET_NAME="$($AWS ses describe-receipt-rule --rule-set-name "$RULE_SET_NAME" --rule-name "$CONCIERGE_RULE" \
  --query 'Rule.Actions[?S3Action].S3Action.BucketName | [0]' --output text)"
if [ -z "$BUCKET_NAME" ] || [ "$BUCKET_NAME" = "None" ]; then
  echo "ERROR: could not find an S3 action on $CONCIERGE_RULE in $RULE_SET_NAME" >&2
  exit 1
fi
log "  Bucket: $BUCKET_NAME"

# The bucket policy from deploy-ses-receiving.sh allows SES puts on the whole bucket (/*),
# and its 30-day lifecycle covers every prefix, so no bucket changes are needed here.

# ── 2. Lambda invoke permission for SES ────────────────────────────────────────
if ! $AWS lambda get-function --function-name "$LAMBDA_FUNCTION_NAME" >/dev/null 2>&1; then
  echo "ERROR: $LAMBDA_FUNCTION_NAME not found. Run infra/deploy.sh first." >&2; exit 1
fi
log "Granting SES invoke permission on $LAMBDA_FUNCTION_NAME..."
if $AWS lambda get-policy --function-name "$LAMBDA_FUNCTION_NAME" --query Policy --output text 2>/dev/null | grep -q '"Sid":"ses-invoke"'; then
  log "  Permission ses-invoke already present."
else
  $AWS lambda add-permission \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --statement-id ses-invoke \
    --action lambda:InvokeFunction \
    --principal ses.amazonaws.com \
    --source-account "$AWS_ACCOUNT_ID" >/dev/null   # same condition as my4mlife-inbound-handler's ses-invoke
fi

# ── 3. Receipt rule ────────────────────────────────────────────────────────────
RULE_JSON=$(cat <<JSON
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
    },
    {
      "StopAction": {
        "Scope": "RuleSet"
      }
    }
  ]
}
JSON
)

log "Ensuring receipt rule $RULE_NAME in $RULE_SET_NAME..."
if $AWS ses describe-receipt-rule --rule-set-name "$RULE_SET_NAME" --rule-name "$RULE_NAME" >/dev/null 2>&1; then
  $AWS ses update-receipt-rule --rule-set-name "$RULE_SET_NAME" --rule "$RULE_JSON" >/dev/null
  log "  Rule updated."
else
  # No --after: SES places a new rule at the start of the rule set.
  $AWS ses create-receipt-rule --rule-set-name "$RULE_SET_NAME" --rule "$RULE_JSON" >/dev/null
  log "  Rule created."
fi

# ── 4. Force order: this rule first (omitting --after = move to the top) ───────
log "Moving $RULE_NAME to the top of $RULE_SET_NAME..."
$AWS ses set-receipt-rule-position --rule-set-name "$RULE_SET_NAME" --rule-name "$RULE_NAME" >/dev/null

ORDER="$($AWS ses describe-receipt-rule-set --rule-set-name "$RULE_SET_NAME" --query 'Rules[].Name' --output text)"
log "Rule order now: $ORDER"
FIRST="$(echo "$ORDER" | awk '{print $1}')"
if [ "$FIRST" != "$RULE_NAME" ]; then
  echo "ERROR: $RULE_NAME is not first in $RULE_SET_NAME (got: $ORDER). $CONCIERGE_RULE would see tracking mail." >&2
  exit 1
fi

ACTIVE="$($AWS ses describe-active-receipt-rule-set --query 'Metadata.Name' --output text)"
if [ "$ACTIVE" != "$RULE_SET_NAME" ]; then
  echo "WARNING: active rule set is '$ACTIVE', not $RULE_SET_NAME. Not changing it." >&2
fi

cat <<EOF

==> Done. ${RECIPIENT} -> s3://${BUCKET_NAME}/${OBJECT_PREFIX} -> ${LAMBDA_FUNCTION_NAME}, then stop.

Remaining step (TJ): Google Admin routing rule, see docs/ops/google-routing-novo-tracking.md.
Test now without Google: send any email to ${RECIPIENT} from an outside mailbox and check the
${LAMBDA_FUNCTION_NAME} log group and the ${OBJECT_PREFIX} prefix in ${BUCKET_NAME}.
EOF
