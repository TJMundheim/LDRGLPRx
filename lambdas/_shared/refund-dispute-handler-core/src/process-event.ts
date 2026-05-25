import { getStripeClient } from '@my4mlife/stripe-client';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));
const CONTACT_TABLE = process.env['CONTACT_TABLE'] ?? 'Contact';
const ORDERS_TABLE = process.env['ORDERS_TABLE'] ?? 'Orders';
const TOUCHPOINTS_TABLE = process.env['TOUCHPOINTS_TABLE'] ?? 'Touchpoints';

type DisputeStatus = 'needs_response' | 'under_review' | 'charge_refunded' | 'won' | 'lost' | 'warning_needs_response' | 'warning_under_review' | 'warning_closed';

// Ban guard: ONLY lost disputes trigger a ban. Never on created/under_review/won.
function shouldBan(status: string): status is 'lost' {
  return status === 'lost';
}

async function cancelSubscriptions(stripe: Awaited<ReturnType<typeof getStripeClient>>, customerId: string): Promise<void> {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'active' });
  const trialing = await stripe.subscriptions.list({ customer: customerId, status: 'trialing' });
  const all = [...subs.data, ...trialing.data];
  for (const sub of all) {
    try {
      await stripe.subscriptions.cancel(sub.id);
    } catch (err) {
      console.error(`Failed to cancel subscription ${sub.id}:`, err);
      // Do not re-throw — ban write must still proceed
    }
  }
}

async function writeTouchpoint(stripeEventId: string, type: string, mode: 'live' | 'test'): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: TOUCHPOINTS_TABLE,
    Item: { stripeEventId, type, mode, createdAt: new Date().toISOString() },
    ConditionExpression: 'attribute_not_exists(stripeEventId)',
  })).catch(e => { if (e.name !== 'ConditionalCheckFailedException') throw e; });
}

export async function processEvent(e: { id: string; type: string; livemode: boolean }): Promise<void> {
  const stripe = await getStripeClient({ livemode: e.livemode });
  const mode = e.livemode ? 'live' : 'test';

  await writeTouchpoint(e.id, e.type, mode);

  if (e.type === 'charge.refunded') {
    const charge = await stripe.charges.retrieve(e.id);
    if (charge.refunded) {
      await ddb.send(new UpdateCommand({
        TableName: ORDERS_TABLE,
        Key: { orderId: e.id },
        UpdateExpression: 'SET #status = :refunded, updatedAt = :now',
        ConditionExpression: 'attribute_exists(orderId)',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':refunded': 'refunded', ':now': new Date().toISOString() },
      })).catch(e => { if (e.name !== 'ConditionalCheckFailedException') throw e; });
    }
    return;
  }

  // Dispute events: charge.dispute.created | charge.dispute.updated | charge.dispute.closed
  const dispute = await stripe.disputes.retrieve(e.id);
  const charge = await stripe.charges.retrieve(dispute.charge as string);
  const customerId = typeof charge.customer === 'string' ? charge.customer : (charge.customer as { id: string } | null)?.id;

  if (shouldBan(dispute.status as DisputeStatus)) {
    // Cancel all active subscriptions first (failures logged, never block ban)
    if (customerId) {
      await cancelSubscriptions(stripe, customerId);
    }

    // Write ban — idempotent via condition on current value
    await ddb.send(new UpdateCommand({
      TableName: CONTACT_TABLE,
      Key: { email: charge.metadata?.contactEmail ?? customerId },
      UpdateExpression: 'SET lifecycleStage = :banned, isBanned = :true, updatedAt = :now',
      ConditionExpression: 'attribute_not_exists(lifecycleStage) OR lifecycleStage <> :banned',
      ExpressionAttributeValues: {
        ':banned': 'banned',
        ':true': true,
        ':now': new Date().toISOString(),
      },
    })).catch(e => { if (e.name !== 'ConditionalCheckFailedException') throw e; });
  }
  // Won/needs_response/under_review: no-op — ban is NEVER reversed by this handler
}
