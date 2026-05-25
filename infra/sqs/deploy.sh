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
