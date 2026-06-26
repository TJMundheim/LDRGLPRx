#!/usr/bin/env bash
set -euo pipefail

# Provisions the PatientRecords DynamoDB table for My4MLife ultralight EMR.
#   PK: contactId (S)  SK: sk (S)
#   Billing:  PAY_PER_REQUEST
#   SSE:      KMS (AWS-owned key)
#   PITR:     ON
#   Tags:     phi=true
# Idempotent — never deletes or recreates the table.
#
# Usage:
#   ./infra/dynamodb/patient-records/deploy.sh

REGION="us-east-2"
PROFILE="default"
AWS="aws --profile $PROFILE --region $REGION"

TABLE="PatientRecords"

log() { echo "==> $*"; }

# ── Idempotency guard ─────────────────────────────────────────────────────────
if $AWS dynamodb describe-table --table-name "$TABLE" >/dev/null 2>&1; then
  log "Table $TABLE already exists — skipping creation."
else
  log "Creating table $TABLE..."
  $AWS dynamodb create-table \
    --table-name "$TABLE" \
    --billing-mode PAY_PER_REQUEST \
    --attribute-definitions \
      AttributeName=contactId,AttributeType=S \
      AttributeName=sk,AttributeType=S \
    --key-schema \
      AttributeName=contactId,KeyType=HASH \
      AttributeName=sk,KeyType=RANGE \
    --sse-specification Enabled=true,SSEType=KMS \
    --tags Key=phi,Value=true \
    >/dev/null

  log "Waiting for $TABLE to become ACTIVE..."
  $AWS dynamodb wait table-exists --table-name "$TABLE"
  log "Table $TABLE created and ACTIVE."
fi

# ── Ensure PITR is ON (runs whether table pre-existed or was just created) ────
log "Ensuring point-in-time recovery is enabled on $TABLE..."
$AWS dynamodb update-continuous-backups \
  --table-name "$TABLE" \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  >/dev/null
log "PITR confirmed ON for $TABLE."

log "Done. $TABLE is ready in $REGION."
