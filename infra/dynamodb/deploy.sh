#!/usr/bin/env bash
set -euo pipefail

# Provisions DynamoDB tables for My4MLife:
#   Contact, Touchpoints, Conversations, Orders (from contact pipeline)
#   RetryState (for Stripe event retry orchestration)
#   Events, EventRSVPs, EventReminders (for Zoom + future event management)
#   AgentRuns, ApprovalRequests (for autonomous agent orchestration)
# Per docs/plan/contact-schema-spec.md, event architecture, and agent spec. Idempotent.
#
# Usage:
#   ./infra/dynamodb/deploy.sh           # execute
#   ./infra/dynamodb/deploy.sh --plan    # dry-run summary, no AWS calls

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
  plan_table "RetryState" \
    "PK stripeEventId(S)" \
    "none" \
    "none"
  plan_table "Subscriptions" \
    "PK stripeSubscriptionId(S)" \
    "byContact(PK contactId, SK currentPeriodEnd)" \
    "none"
  plan_table "Events" \
    "PK eventId(S)" \
    "none" \
    "none"
  plan_table "EventRSVPs" \
    "PK eventId(S), SK contactId(S)" \
    "byContact(PK contactId, SK eventId)" \
    "none"
  plan_table "EventReminders" \
    "PK reminderId(S)" \
    "none" \
    "none"
  plan_table "AgentRuns" \
    "PK runId(S)" \
    "byAgent(PK agentName, SK startedAt)" \
    "none"
  plan_table "ApprovalRequests" \
    "PK approvalId(S)" \
    "byStatus(PK status, SK requestedAt)" \
    "none"
  echo "----------------------------------------"
  echo "Plan complete. 11 tables would be created."
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

# ── RetryState ───────────────────────────────────────────────────────────────
RETRYSTATE_JSON=$(cat <<'EOF'
{
  "TableName": "RetryState",
  "BillingMode": "PAY_PER_REQUEST",
  "AttributeDefinitions": [
    {"AttributeName": "stripeEventId", "AttributeType": "S"}
  ],
  "KeySchema": [
    {"AttributeName": "stripeEventId", "KeyType": "HASH"}
  ]
}
EOF
)
create_table "RetryState" "$RETRYSTATE_JSON"

# ── Subscriptions ────────────────────────────────────────────────────────────
SUBSCRIPTIONS_JSON=$(cat <<'EOF'
{
  "TableName": "Subscriptions",
  "BillingMode": "PAY_PER_REQUEST",
  "AttributeDefinitions": [
    {"AttributeName": "stripeSubscriptionId", "AttributeType": "S"},
    {"AttributeName": "contactId",            "AttributeType": "S"},
    {"AttributeName": "currentPeriodEnd",     "AttributeType": "S"}
  ],
  "KeySchema": [
    {"AttributeName": "stripeSubscriptionId", "KeyType": "HASH"}
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "byContact",
      "KeySchema": [
        {"AttributeName": "contactId",        "KeyType": "HASH"},
        {"AttributeName": "currentPeriodEnd", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]
}
EOF
)
create_table "Subscriptions" "$SUBSCRIPTIONS_JSON"

# ── Events ───────────────────────────────────────────────────────────────────
# Schemaless event records: type (zoom-weekly, etc), title, startsAt (ISO),
# durationMin, zoomMeetingId, joinUrl, hostId, cohort,
# status (scheduled|live|completed|cancelled), createdAt, updatedAt.
EVENTS_JSON=$(cat <<'EOF'
{
  "TableName": "Events",
  "BillingMode": "PAY_PER_REQUEST",
  "AttributeDefinitions": [
    {"AttributeName": "eventId", "AttributeType": "S"}
  ],
  "KeySchema": [
    {"AttributeName": "eventId", "KeyType": "HASH"}
  ]
}
EOF
)
create_table "Events" "$EVENTS_JSON"

# ── EventRSVPs ───────────────────────────────────────────────────────────────
# PK eventId, SK contactId. GSI byContact for lookups by member.
# Attributes: rsvpedAt (ISO), status (yes|no|maybe), reminderEmailSentAt (ISO),
# reminderSmsSentAt (ISO), attended (boolean), joinTimeUtc (ISO), leaveTimeUtc (ISO),
# attendanceMinutes (number).
EVENTRSVPS_JSON=$(cat <<'EOF'
{
  "TableName": "EventRSVPs",
  "BillingMode": "PAY_PER_REQUEST",
  "AttributeDefinitions": [
    {"AttributeName": "eventId",   "AttributeType": "S"},
    {"AttributeName": "contactId", "AttributeType": "S"}
  ],
  "KeySchema": [
    {"AttributeName": "eventId",   "KeyType": "HASH"},
    {"AttributeName": "contactId", "KeyType": "RANGE"}
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "byContact",
      "KeySchema": [
        {"AttributeName": "contactId", "KeyType": "HASH"},
        {"AttributeName": "eventId",   "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]
}
EOF
)
create_table "EventRSVPs" "$EVENTRSVPS_JSON"

# ── EventReminders ───────────────────────────────────────────────────────────
# PK reminderId (format: ${eventId}#${contactId}#${kind}, kind in t24h|t1h|starting).
# Attributes: eventId, contactId, scheduledFor (ISO), kind (t24h|t1h|starting),
# channel (email|sms), sentAt (ISO), status (scheduled|sent|failed), error (string).
EVENTREMINDERS_JSON=$(cat <<'EOF'
{
  "TableName": "EventReminders",
  "BillingMode": "PAY_PER_REQUEST",
  "AttributeDefinitions": [
    {"AttributeName": "reminderId", "AttributeType": "S"}
  ],
  "KeySchema": [
    {"AttributeName": "reminderId", "KeyType": "HASH"}
  ]
}
EOF
)
create_table "EventReminders" "$EVENTREMINDERS_JSON"

# ── AgentRuns ────────────────────────────────────────────────────────────────
# PK runId (UUID). GSI byAgent (PK agentName, SK startedAt) for agent workload tracking.
# Attributes: agentName (ops|eng|marketing|support|sales), trigger (schedule|intent|webhook),
# intent (string, the input), startedAt (ISO), completedAt (ISO), status (running|succeeded|failed|awaiting-approval),
# summary (markdown), toolCalls (list of {tool, input, output, durationMs}), approvalIds (list),
# error (string).
AGENTRUNS_JSON=$(cat <<'EOF'
{
  "TableName": "AgentRuns",
  "BillingMode": "PAY_PER_REQUEST",
  "AttributeDefinitions": [
    {"AttributeName": "runId",      "AttributeType": "S"},
    {"AttributeName": "agentName",  "AttributeType": "S"},
    {"AttributeName": "startedAt",  "AttributeType": "S"}
  ],
  "KeySchema": [
    {"AttributeName": "runId", "KeyType": "HASH"}
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "byAgent",
      "KeySchema": [
        {"AttributeName": "agentName", "KeyType": "HASH"},
        {"AttributeName": "startedAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]
}
EOF
)
create_table "AgentRuns" "$AGENTRUNS_JSON"

# ── ApprovalRequests ──────────────────────────────────────────────────────────
# PK approvalId (UUID). GSI byStatus (PK status, SK requestedAt) for lifecycle queries.
# Attributes: agentName, runId, requestedAt (ISO), expiresAt (ISO),
# summary (markdown shown to TJ), preview (actual content being approved, e.g. email body),
# channel (email|sms), sentTo (TJ contact), status (pending|approved|denied|expired),
# respondedAt (ISO), respondedVia (email|sms|web).
APPROVALREQUESTS_JSON=$(cat <<'EOF'
{
  "TableName": "ApprovalRequests",
  "BillingMode": "PAY_PER_REQUEST",
  "AttributeDefinitions": [
    {"AttributeName": "approvalId",  "AttributeType": "S"},
    {"AttributeName": "status",      "AttributeType": "S"},
    {"AttributeName": "requestedAt", "AttributeType": "S"}
  ],
  "KeySchema": [
    {"AttributeName": "approvalId", "KeyType": "HASH"}
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "byStatus",
      "KeySchema": [
        {"AttributeName": "status",      "KeyType": "HASH"},
        {"AttributeName": "requestedAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]
}
EOF
)
create_table "ApprovalRequests" "$APPROVALREQUESTS_JSON"

log "All tables provisioned in $REGION."
