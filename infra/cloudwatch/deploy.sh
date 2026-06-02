#!/bin/bash
set -euo pipefail

REGION="us-east-2"

# Read SNS topic ARN and SQS queue ARNs
SNS_TOPIC_ARN=$(cat "$(dirname "$0")/../sns/topic-arn.txt")
PF_ARN=$(cat "$(dirname "$0")/../sqs/arns.txt" | grep "^PF_ARN=" | cut -d'=' -f2)

# P8.2: permanent-failures depth alarm (PRIMARY, pages)
aws cloudwatch put-metric-alarm \
  --alarm-name "my4mlife-stripe-permanent-failures-depth" \
  --alarm-description "Permanent failure in Stripe event processing — human intervention required" \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --statistic Average \
  --period 60 \
  --evaluation-periods 1 \
  --datapoints-to-alarm 1 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "$SNS_TOPIC_ARN" \
  --dimensions Name=QueueName,Value=my4mlife-stripe-events-permanent-failures \
  --treat-missing-data notBreaching \
  --region "$REGION"

echo "✓ P8.2 alarm created: my4mlife-stripe-permanent-failures-depth"

# P8.3: DLQ depth alarm (SECONDARY, warning)
aws cloudwatch put-metric-alarm \
  --alarm-name "my4mlife-stripe-dlq-depth-warning" \
  --alarm-description "[WARNING] Stripe DLQ depth non-zero for 30+ minutes — retry system may be slow" \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --statistic Average \
  --period 60 \
  --evaluation-periods 30 \
  --datapoints-to-alarm 30 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "$SNS_TOPIC_ARN" \
  --dimensions Name=QueueName,Value=my4mlife-stripe-events-dlq \
  --treat-missing-data notBreaching \
  --region "$REGION"

echo "✓ P8.3 alarm created: my4mlife-stripe-dlq-depth-warning"
