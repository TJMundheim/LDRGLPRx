import type { SQSHandler } from 'aws-lambda';
import { SQSClient, DeleteMessageCommand, SendMessageCommand } from '@aws-sdk/client-sqs';
import { SchedulerClient, CreateScheduleCommand } from '@aws-sdk/client-scheduler';
import { DynamoDBClient, DeleteItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { getStripeClient } from '@my4mlife/stripe-client';
import { processEvent as orderProcess } from '@my4mlife/order-handler-core';
import { processEvent as refundProcess } from '@my4mlife/refund-dispute-handler-core';
import { processEvent as subscriptionProcess } from '@my4mlife/subscription-handler-core';

// Attempt N fires after BACKOFF_LADDER[N] seconds from failure (1m, 5m, 30m, 2h, 12h)
export const BACKOFF_LADDER = [60, 300, 1800, 7200, 43200] as const;

type CoreFn = (e: { id: string; type: string; livemode: boolean }) => Promise<void>;

function resolveCore(type: string): CoreFn {
  if (type.startsWith('checkout.session.')) return orderProcess;
  if (type === 'charge.refunded' || type.startsWith('charge.dispute.')) return refundProcess;
  if (type.startsWith('customer.subscription.')) return subscriptionProcess;
  throw new Error(`No core registered for event type: ${type}`);
}

const sqs = new SQSClient({ region: 'us-east-2' });
const scheduler = new SchedulerClient({ region: 'us-east-2' });
const ddb = new DynamoDBClient({ region: 'us-east-2' });

const DLQ_URL = process.env['DLQ_URL']!;
const PF_URL = process.env['PERMANENT_FAILURES_URL']!;
const TABLE = process.env['RETRY_STATE_TABLE'] ?? 'RetryState';
const SCHEDULER_ROLE = process.env['SCHEDULER_ROLE_ARN']!;
const LAMBDA_ARN = process.env['LAMBDA_ARN']!;

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const { id, type, livemode, attemptCount } = JSON.parse(record.body) as {
      id: string; type: string; livemode: boolean; attemptCount: number;
    };

    await getStripeClient({ livemode }); // re-pull Stripe state (warms client)
    const core = resolveCore(type);
    let failed = false;
    let coreError: Error | undefined;

    try {
      await core({ id, type, livemode });
    } catch (err) {
      failed = true;
      coreError = err as Error;
    }

    if (!failed) {
      // Success: clear RetryState + delete from DLQ
      await ddb.send(new DeleteItemCommand({ TableName: TABLE, Key: { stripeEventId: { S: id } } }));
    } else if (attemptCount < 5) {
      const delaySec = BACKOFF_LADDER[attemptCount] ?? BACKOFF_LADDER[BACKOFF_LADDER.length - 1];
      const fireAt = new Date(Date.now() + delaySec * 1000).toISOString();
      const scheduleName = `stripe-retry-${id}-${attemptCount + 1}`;

      // One-shot schedule via at(<UTC>). rate() is recurring and was firing
      // duplicate retries inside the EndDate window — drop EndDate entirely
      // and let AWS Scheduler auto-delete the schedule after it fires once
      // (ActionAfterCompletion=DELETE).
      const fireAtUtc = fireAt.replace(/\.\d{3}Z$/, ''); // at() requires no millis, no Z
      await scheduler.send(new CreateScheduleCommand({
        Name: scheduleName,
        ScheduleExpression: `at(${fireAtUtc})`,
        ScheduleExpressionTimezone: 'UTC',
        FlexibleTimeWindow: { Mode: 'OFF' },
        ActionAfterCompletion: 'DELETE',
        Target: {
          Arn: LAMBDA_ARN,
          RoleArn: SCHEDULER_ROLE,
          Input: JSON.stringify({ id, type, livemode, attemptCount: attemptCount + 1 }),
        },
      }));

      await ddb.send(new PutItemCommand({
        TableName: TABLE,
        Item: {
          stripeEventId: { S: id },
          attemptCount: { N: String(attemptCount + 1) },
          lastError: { S: coreError?.message ?? 'unknown' },
          nextScheduledAt: { S: fireAt },
        },
      }));
    } else {
      // >= 5 attempts — permanent failure
      console.error('[stripe-events-retry] PERMANENT_FAILURE', { id, type, livemode, attemptCount, error: coreError?.message });
      await sqs.send(new SendMessageCommand({
        QueueUrl: PF_URL,
        MessageBody: JSON.stringify({ id, type, livemode, attemptCount, error: coreError?.message }),
      }));
    }

    // Always delete from DLQ (no re-throw — prevent poison loop)
    await sqs.send(new DeleteMessageCommand({ QueueUrl: DLQ_URL, ReceiptHandle: record.receiptHandle }));
  }
};
