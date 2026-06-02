#!/bin/bash
set -euo pipefail

REGION="us-east-2"
TOPIC_NAME="my4mlife-stripe-alerts"
EMAIL="drtj@essentialmanage.com"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Creating SNS topic: $TOPIC_NAME"
TOPIC_RESPONSE=$(aws sns create-topic --name "$TOPIC_NAME" --region "$REGION")
TOPIC_ARN=$(echo "$TOPIC_RESPONSE" | jq -r '.TopicArn')

echo "Topic ARN: $TOPIC_ARN"
echo "$TOPIC_ARN" > "$SCRIPT_DIR/topic-arn.txt"

echo "Checking existing subscriptions for $EMAIL"
EXISTING=$(aws sns list-subscriptions-by-topic \
  --topic-arn "$TOPIC_ARN" \
  --region "$REGION" \
  | jq -r ".Subscriptions[] | select(.Endpoint == \"$EMAIL\") | .SubscriptionArn")

if [ -z "$EXISTING" ]; then
  echo "Subscribing $EMAIL to topic"
  SUBSCRIBE_RESPONSE=$(aws sns subscribe \
    --topic-arn "$TOPIC_ARN" \
    --protocol email \
    --notification-endpoint "$EMAIL" \
    --region "$REGION")

  SUBSCRIPTION_ARN=$(echo "$SUBSCRIBE_RESPONSE" | jq -r '.SubscriptionArn')
  echo "Subscription created: $SUBSCRIPTION_ARN"

  STATUS="PendingConfirmation"
  echo "Subscription status: $STATUS"
  echo "TJ ACTION REQUIRED: Check email at $EMAIL for AWS confirmation link and click to activate subscription"
else
  echo "Subscription already exists for $EMAIL: $EXISTING"
  # Query subscription status
  SUB_DETAILS=$(aws sns list-subscriptions-by-topic \
    --topic-arn "$TOPIC_ARN" \
    --region "$REGION" \
    | jq -r ".Subscriptions[] | select(.Endpoint == \"$EMAIL\")")

  STATUS=$(echo "$SUB_DETAILS" | jq -r '.SubscriptionArn')
  if [ "$STATUS" == "PendingConfirmation" ]; then
    echo "Subscription status: PendingConfirmation (awaiting email confirmation)"
  else
    echo "Subscription status: Confirmed"
  fi
fi

echo "Deploy complete. Topic ARN saved to $SCRIPT_DIR/topic-arn.txt"
