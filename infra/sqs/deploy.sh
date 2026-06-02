#!/usr/bin/env bash
set -euo pipefail

# Provisions SQS queues for Stripe event handling:
#   my4mlife-stripe-events-dlq (dead-letter queue)
#   my4mlife-stripe-events-permanent-failures (permanent failure archive)
# Both with 14-day retention. Idempotent.
#
# Usage:
#   ./infra/sqs/deploy.sh

REGION="us-east-2"
PROFILE="default"
AWS="aws --profile $PROFILE --region $REGION"

log() { echo "==> $*" >&2; }
error() { echo "ERROR: $*" >&2; exit 1; }
get_queue_url() {
  local queue_name="$1"
  $AWS sqs get-queue-url --queue-name "$queue_name" --output text --query 'QueueUrl' 2>/dev/null || true
}
get_queue_arn() {
  local queue_url="$1"
  $AWS sqs get-queue-attributes --queue-url "$queue_url" --attribute-names QueueArn --output text --query 'Attributes.QueueArn'
}

# Create or update queue, ensuring attributes are set
ensure_queue() {
  local queue_name="$1"
  local retention_seconds="$2"  # 1209600 = 14 days

  log "Ensuring queue: $queue_name"

  # Check if queue exists
  local queue_url=$(get_queue_url "$queue_name")

  if [[ -z "$queue_url" ]]; then
    log "Creating queue $queue_name..."
    queue_url=$($AWS sqs create-queue \
      --queue-name "$queue_name" \
      --attributes "MessageRetentionPeriod=$retention_seconds" \
      --output text --query 'QueueUrl')
    log "Queue created: $queue_url"
  else
    log "Queue $queue_name exists at: $queue_url"
  fi

  # Ensure attributes are set correctly
  $AWS sqs set-queue-attributes \
    --queue-url "$queue_url" \
    --attributes "MessageRetentionPeriod=$retention_seconds" \
    >/dev/null 2>&1

  echo "$queue_url"
}

# Provision both queues
DLQ_URL=$(ensure_queue "my4mlife-stripe-events-dlq" "1209600")
PF_URL=$(ensure_queue "my4mlife-stripe-events-permanent-failures" "1209600")

log "Retrieving ARNs..."

# Get ARNs for both queues
DLQ_ARN=$(get_queue_arn "$DLQ_URL")
PF_ARN=$(get_queue_arn "$PF_URL")

# ── DLQ resource policy ─────────────────────────────────────────────────────
# EventBridge requires an explicit SQS resource policy granting
# events.amazonaws.com sqs:SendMessage. Without this, EventBridge silently
# drops failed events instead of writing them to the DLQ, and the
# CloudWatch DLQ-depth alarm never fires.
# Scoped via SourceArn condition to rules on the Stripe partner buses only.
log "Applying DLQ resource policy (EventBridge → DLQ SendMessage)..."
ACCOUNT_ID=$($AWS sts get-caller-identity --query Account --output text)
DLQ_POLICY=$(cat <<EOF
{"Version":"2012-10-17","Statement":[{"Sid":"AllowEventBridgeStripeRulesToSendToDLQ","Effect":"Allow","Principal":{"Service":"events.amazonaws.com"},"Action":"sqs:SendMessage","Resource":"${DLQ_ARN}","Condition":{"ArnLike":{"aws:SourceArn":"arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/aws.partner/stripe.com/*"}}}]}
EOF
)
# Write the SetQueueAttributes payload to disk so AWS CLI handles quoting.
cat > /tmp/dlq-attrs.json <<EOF
{"Policy": $(echo "$DLQ_POLICY" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read().strip()))')}
EOF
$AWS sqs set-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attributes file:///tmp/dlq-attrs.json \
  >/dev/null
rm -f /tmp/dlq-attrs.json
log "DLQ policy applied."

# Save ARNs to file for downstream scripts to source
mkdir -p "$(dirname "$0")"
cat > "$(dirname "$0")/arns.txt" <<EOF
DLQ_ARN=$DLQ_ARN
PF_ARN=$PF_ARN
EOF

log "SQS queues provisioned successfully."
log "DLQ URL:  $DLQ_URL"
log "DLQ ARN:  $DLQ_ARN"
log "PF URL:   $PF_URL"
log "PF ARN:   $PF_ARN"
log "ARNs saved to: $(dirname "$0")/arns.txt"
