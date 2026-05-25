import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getStripeClient } from '@my4mlife/stripe-client';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));

const CONTACT = 'Contact';
const SUBSCRIPTIONS = 'Subscriptions';
const TOUCHPOINTS = 'Touchpoints';

export async function processEvent(e: {
  id: string;
  type: string;
  livemode: boolean;
}): Promise<void> {
  const stripe = await getStripeClient({ livemode: e.livemode });
  const sub = await stripe.subscriptions.retrieve(e.id);

  const isActive = sub.status === 'active' || sub.status === 'trialing';
  const now = new Date().toISOString();
  const contactId: string = (sub.metadata as Record<string, string>)['contactId'] ?? sub.customer as string;
  const currentPeriodEnd = new Date((sub.current_period_end as number) * 1000).toISOString();

  // ── Contact update ───────────────────────────────────────────────────────
  // subscriptionStartedAt: set only on first transition using if_not_exists
  await ddb.send(new UpdateCommand({
    TableName: CONTACT,
    Key: { contactId },
    UpdateExpression: [
      'SET hasActiveSubscription = :hasActiveSub',
      'updatedAt = :now',
      'currentPeriodEnd = :cpEnd',
      'subscriptionStartedAt = if_not_exists(subscriptionStartedAt, :startedAt)',
    ].join(', '),
    ExpressionAttributeValues: {
      ':hasActiveSub': isActive,
      ':now': now,
      ':cpEnd': currentPeriodEnd,
      ':startedAt': isActive ? now : null,
    },
  }));

  // ── Subscription row ─────────────────────────────────────────────────────
  await ddb.send(new PutCommand({
    TableName: SUBSCRIPTIONS,
    Item: {
      stripeSubscriptionId: sub.id,
      contactId,
      status: sub.status,
      currentPeriodEnd,
      updatedAt: now,
    },
  }));

  // ── Touchpoint (idempotent guard by Stripe event ID) ─────────────────────
  try {
    await ddb.send(new PutCommand({
      TableName: TOUCHPOINTS,
      Item: {
        contactId,
        sk: `stripe#${e.id}`,
        stripeEventId: e.id,
        eventType: e.type,
        subscriptionId: sub.id,
        status: sub.status,
        mode: e.livemode ? 'live' : 'test',
        ts: now,
      },
      ConditionExpression: 'attribute_not_exists(stripeEventId)',
    }));
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') return;
    throw err;
  }
}
