import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getStripeClient } from '@my4mlife/stripe-client';
import { resolveContactId } from '@my4mlife/contact-id';

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

  // e.id is the Stripe EVENT id (evt_...). Resolve the actual subscription id
  // from the event payload, then retrieve.
  const evt = await stripe.events.retrieve(e.id);
  const subscriptionId = (evt.data.object as { id?: string }).id;
  if (!subscriptionId) throw new Error(`subscription-handler: event ${e.id} has no data.object.id`);

  const sub = await stripe.subscriptions.retrieve(subscriptionId);

  const isActive = sub.status === 'active' || sub.status === 'trialing';
  const now = new Date().toISOString();

  // Resolve contactId: metadata wins; fall back to deriving from the customer's email.
  const metadataContactId = (sub.metadata as Record<string, string> | null)?.['contactId'] ?? null;
  let customerEmail: string | null = null;
  if (!metadataContactId && typeof sub.customer === 'string') {
    try {
      const cust = await stripe.customers.retrieve(sub.customer);
      if (!(cust as { deleted?: boolean }).deleted) {
        customerEmail = (cust as { email?: string | null }).email ?? null;
      }
    } catch { /* fall through — resolveContactId will throw below */ }
  }
  const contactId = resolveContactId({ metadataContactId, email: customerEmail });
  if (!contactId) {
    throw new Error(`subscription-handler: cannot resolve contactId for subscription ${sub.id}`);
  }

  // current_period_end may live at the item level on newer apiVersions.
  const cpEndSec = sub.items?.data?.[0]?.current_period_end
    ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  const currentPeriodEnd = typeof cpEndSec === 'number'
    ? new Date(cpEndSec * 1000).toISOString()
    : null;

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
      ConditionExpression: 'attribute_not_exists(sk)',
    }));
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') return;
    throw err;
  }
}
