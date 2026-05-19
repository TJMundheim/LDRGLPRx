#!/usr/bin/env bash
set -euo pipefail

# Provisions DynamoDB tables for the My4MLife Contact pipeline:
#   Contact / Touchpoints / Conversations / Orders
# Per docs/plan/contact-schema-spec.md. Idempotent.
#
# Usage:
#   ./provision-contact-tables.sh           # execute
#   ./provision-contact-tables.sh --plan    # dry-run summary, no AWS calls

REGION="us-east-2"
PROFILE="default"
AWS="aws --profile $PROFILE --region $REGION"

PLAN=0
if [[ "${1:-}" == "--plan" ]]; then
  PLAN=1
fi

log() { echo "==> $*"; }

# Plan-only summary -----------------------------------------------------------
plan_table() {
  local name="$1" keys="$2" gsis="$3" streams="$4"
  echo "----------------------------------------"
  echo "Table: $name"
  echo "  Region:              $REGION"
  echo "  Billing:             PAY_PER_REQUEST (on-demand)"
  echo "  Deletion protection: ENABLED"
  echo "  Keys:                $keys"
  echo "  GSIs:                $gsis"
  echo "  Streams:             $streams"
}

if [[ $PLAN -eq 1 ]]; then
  echo "DRY RUN — no AWS calls will be made."
  echo "Region: $REGION  |  Billing: PAY_PER_REQUEST  |  Deletion protection: ON"
  plan_table "Contact" \
    "PK contactId(S)" \
    "byEmail(PK email), byStripeCustomer(PK stripeCustomerId), byLifecycle(PK lifecycleStage, SK updatedAt)" \
    "NEW_AND_OLD_IMAGES"
  plan_table "Touchpoints" \
    "PK contactId(S), SK sk(S)" \
    "byEventType(PK eventType, SK ts)" \
    "none"
  plan_table "Conversations" \
    "PK contactId(S), SK sk(S)" \
    "none" \
    "none"
  plan_table "Orders" \
    "PK orderId(S)" \
    "byContact(PK contactId, SK paidAt)" \
    "none"
  echo "----------------------------------------"
  echo "Plan complete. 4 tables would be created."
  exit 0
fi

# Real provisioning -----------------------------------------------------------
exists() {
  $AWS dynamodb describe-table --table-name "$1" >/dev/null 2>&1
}

create_table() {
  local name="$1" cli_json="$2"
  if exists "$name"; then
    log "Table $name already exists — skipping."
    return 0
  fi
  log "Creating table $name..."
  echo "$cli_json" > "/tmp/ddb-$name.json"
  $AWS dynamodb create-table --cli-input-json "file:///tmp/ddb-$name.json" >/dev/null
  $AWS dynamodb wait table-exists --table-name "$name"
  $AWS dynamodb update-table --table-name "$name" \
    --deletion-protection-enabled >/dev/null
  log "Table $name ready."
}

# ── Contact ──────────────────────────────────────────────────────────────────
CONTACT_JSON=$(cat <<'EOF'
{
  "TableName": "Contact",
  "BillingMode": "PAY_PER_REQUEST",
  "AttributeDefinitions": [
    {"AttributeName": "contactId",        "AttributeType": "S"},
    {"AttributeName": "email",            "AttributeType": "S"},
    {"AttributeName": "stripeCustomerId", "AttributeType": "S"},
    {"AttributeName": "lifecycleStage",   "AttributeType": "S"},
    {"AttributeName": "updatedAt",        "AttributeType": "S"}
  ],
  "KeySchema": [
    {"AttributeName": "contactId", "KeyType": "HASH"}
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "byEmail",
      "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "ALL"}
    },
    {
      "IndexName": "byStripeCustomer",
      "KeySchema": [{"AttributeName": "stripeCustomerId", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "ALL"}
    },
    {
      "IndexName": "byLifecycle",
      "KeySchema": [
        {"AttributeName": "lifecycleStage", "KeyType": "HASH"},
        {"AttributeName": "updatedAt",      "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ],
  "StreamSpecification": {
    "StreamEnabled": true,
    "StreamViewType": "NEW_AND_OLD_IMAGES"
  }
}
EOF
)
create_table "Contact" "$CONTACT_JSON"

# ── Touchpoints ──────────────────────────────────────────────────────────────
TOUCHPOINTS_JSON=$(cat <<'EOF'
{
  "TableName": "Touchpoints",
  "BillingMode": "PAY_PER_REQUEST",
  "AttributeDefinitions": [
    {"AttributeName": "contactId", "AttributeType": "S"},
    {"AttributeName": "sk",        "AttributeType": "S"},
    {"AttributeName": "eventType", "AttributeType": "S"},
    {"AttributeName": "ts",        "AttributeType": "S"}
  ],
  "KeySchema": [
    {"AttributeName": "contactId", "KeyType": "HASH"},
    {"AttributeName": "sk",        "KeyType": "RANGE"}
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "byEventType",
      "KeySchema": [
        {"AttributeName": "eventType", "KeyType": "HASH"},
        {"AttributeName": "ts",        "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]
}
EOF
)
create_table "Touchpoints" "$TOUCHPOINTS_JSON"

# ── Conversations ────────────────────────────────────────────────────────────
CONVERSATIONS_JSON=$(cat <<'EOF'
{
  "TableName": "Conversations",
  "BillingMode": "PAY_PER_REQUEST",
  "AttributeDefinitions": [
    {"AttributeName": "contactId", "AttributeType": "S"},
    {"AttributeName": "sk",        "AttributeType": "S"}
  ],
  "KeySchema": [
    {"AttributeName": "contactId", "KeyType": "HASH"},
    {"AttributeName": "sk",        "KeyType": "RANGE"}
  ]
}
EOF
)
create_table "Conversations" "$CONVERSATIONS_JSON"

# ── Orders ───────────────────────────────────────────────────────────────────
ORDERS_JSON=$(cat <<'EOF'
{
  "TableName": "Orders",
  "BillingMode": "PAY_PER_REQUEST",
  "AttributeDefinitions": [
    {"AttributeName": "orderId",   "AttributeType": "S"},
    {"AttributeName": "contactId", "AttributeType": "S"},
    {"AttributeName": "paidAt",    "AttributeType": "S"}
  ],
  "KeySchema": [
    {"AttributeName": "orderId", "KeyType": "HASH"}
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "byContact",
      "KeySchema": [
        {"AttributeName": "contactId", "KeyType": "HASH"},
        {"AttributeName": "paidAt",    "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]
}
EOF
)
create_table "Orders" "$ORDERS_JSON"

log "All tables provisioned in $REGION."
