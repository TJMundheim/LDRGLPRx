#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-2"
ACCOUNT="879696522760"

LIVE_BUS="arn:aws:events:${REGION}:${ACCOUNT}:event-bus/aws.partner/stripe.com/ed_61UlDYUbuzFxSo14816UiEhJ4YSQtFOqpjj7xSOFM1sm"
TEST_BUS="arn:aws:events:${REGION}:${ACCOUNT}:event-bus/aws.partner/stripe.com/ed_test_61UlDVeF8h2kljecs16UiEhJ4YSQQn8vyXT2GnXBwGc4"

ORDER_ARN="arn:aws:lambda:${REGION}:${ACCOUNT}:function:my4mlife-order-handler"
SUB_ARN="arn:aws:lambda:${REGION}:${ACCOUNT}:function:my4mlife-subscription-handler"
REFUND_ARN="arn:aws:lambda:${REGION}:${ACCOUNT}:function:my4mlife-refund-dispute-handler"

DLQ_ARN="arn:aws:sqs:${REGION}:${ACCOUNT}:my4mlife-stripe-events-dlq"

add_permission() {
  local fn="$1" sid="$2" rule_arn="$3"
  aws lambda add-permission \
    --function-name "$fn" \
    --statement-id "$sid" \
    --action "lambda:InvokeFunction" \
    --principal "events.amazonaws.com" \
    --source-arn "$rule_arn" \
    --region "$REGION" \
    > /dev/null 2>&1 || echo "  Permission $sid already exists — skipping"
}

wire_rule() {
  local rule_name="$1" bus_arn="$2" pattern="$3" lambda_arn="$4"

  echo "--- Rule: $rule_name on $(echo "$bus_arn" | awk -F/ '{print $NF}' | cut -c1-8)..."

  local rule_arn
  rule_arn=$(aws events put-rule \
    --name "$rule_name" \
    --event-bus-name "$bus_arn" \
    --event-pattern "$pattern" \
    --state ENABLED \
    --region "$REGION" \
    --query 'RuleArn' --output text)
  echo "  Rule ARN: $rule_arn"

  aws events put-targets \
    --rule "$rule_name" \
    --event-bus-name "$bus_arn" \
    --region "$REGION" \
    --targets "[{
      \"Id\": \"1\",
      \"Arn\": \"${lambda_arn}\",
      \"DeadLetterConfig\": { \"Arn\": \"${DLQ_ARN}\" },
      \"RetryPolicy\": { \"MaximumRetryAttempts\": 2, \"MaximumEventAgeInSeconds\": 3600 }
    }]" > /dev/null
  echo "  Target set."

  local fn_name
  fn_name=$(echo "$lambda_arn" | awk -F: '{print $NF}')
  add_permission "$fn_name" "eb-${rule_name}" "$rule_arn"
}

# order-handler
ORDER_PATTERN='{"detail-type":["checkout.session.completed"]}'
wire_rule "order-handler-live" "$LIVE_BUS" "$ORDER_PATTERN" "$ORDER_ARN"
wire_rule "order-handler-test" "$TEST_BUS" "$ORDER_PATTERN" "$ORDER_ARN"

# subscription-handler
SUB_PATTERN='{"detail-type":["customer.subscription.created","customer.subscription.updated","customer.subscription.deleted"]}'
wire_rule "subscription-handler-live" "$LIVE_BUS" "$SUB_PATTERN" "$SUB_ARN"
wire_rule "subscription-handler-test" "$TEST_BUS" "$SUB_PATTERN" "$SUB_ARN"

# refund-dispute-handler
REFUND_PATTERN='{"detail-type":["charge.refunded","charge.dispute.created","charge.dispute.updated","charge.dispute.funds_withdrawn","charge.dispute.funds_reinstated"]}'
wire_rule "refund-dispute-handler-live" "$LIVE_BUS" "$REFUND_PATTERN" "$REFUND_ARN"
wire_rule "refund-dispute-handler-test" "$TEST_BUS" "$REFUND_PATTERN" "$REFUND_ARN"

echo ""
echo "Done. 6 rules wired."
