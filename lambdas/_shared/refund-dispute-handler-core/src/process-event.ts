import { getStripeClient } from '@my4mlife/stripe-client';
import { resolveContactId } from '@my4mlife/contact-id';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Stripe } from 'stripe';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));
const CONTACT_TABLE = process.env['CONTACT_TABLE'] ?? 'Contact';
const ORDERS_TABLE = process.env['ORDERS_TABLE'] ?? 'Orders';
const TOUCHPOINTS_TABLE = process.env['TOUCHPOINTS_TABLE'] ?? 'Touchpoints';

type DisputeStatus = 'needs_response' | 'under_review' | 'charge_refunded' | 'won' | 'lost' | 'warning_needs_response' | 'warning_under_review' | 'warning_closed';

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
    }
  }
}

function contactIdFromCharge(charge: Pick<Stripe.Charge, 'metadata' | 'billing_details' | 'receipt_email'>): string | null {
  const metadataContactId = (charge.metadata as Record<string, string> | null)?.['contactId'] ?? null;
  const email = (charge.metadata as Record<string, string> | null)?.['contactEmail']
    ?? charge.billing_details?.email
    ?? charge.receipt_email
    ?? null;
  return resolveContactId({ metadataContactId, email });
}

async function writeTouchpoint(contactId: string, stripeEventId: string, eventType: string, mode: 'live' | 'test'): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: TOUCHPOINTS_TABLE,
    Item: {
      contactId,
      sk: `stripe#${stripeEventId}`,
      stripeEventId,
      eventType,
      mode,
      ts: new Date().toISOString(),
    },
    ConditionExpression: 'attribute_not_exists(sk)',
  })).catch(e => { if (e.name !== 'ConditionalCheckFailedException') throw e; });
}

export async function processEvent(e: { id: string; type: string; livemode: boolean }): Promise<void> {
  const stripe = await getStripeClient({ livemode: e.livemode });
  const mode = e.livemode ? 'live' : 'test';

  const evt = await stripe.events.retrieve(e.id);
  const objectId = (evt.data.object as { id?: string }).id;
  if (!objectId) throw new Error(`refund-dispute: event ${e.id} has no data.object.id`);

  if (e.type === 'charge.refunded') {
    const charge = await stripe.charges.retrieve(objectId);
    const contactId = contactIdFromCharge(charge);
    if (!contactId) throw new Error(`refund-dispute: cannot resolve contactId for charge ${charge.id}`);

    if (charge.refunded) {
      await ddb.send(new UpdateCommand({
        TableName: ORDERS_TABLE,
        Key: { orderId: charge.id },
        UpdateExpression: 'SET #status = :refunded, updatedAt = :now',
        ConditionExpression: 'attribute_exists(orderId)',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':refunded': 'refunded', ':now': new Date().toISOString() },
      })).catch(e => { if (e.name !== 'ConditionalCheckFailedException') throw e; });
    }
    await writeTouchpoint(contactId, e.id, e.type, mode);
    return;
  }

  // Dispute events: charge.dispute.created | charge.dispute.updated
  const dispute = await stripe.disputes.retrieve(objectId);
  const charge = await stripe.charges.retrieve(dispute.charge as string);
  const customerId = typeof charge.customer === 'string' ? charge.customer : (charge.customer as { id: string } | null)?.id;
  const contactId = contactIdFromCharge(charge);
  if (!contactId) throw new Error(`refund-dispute: cannot resolve contactId for dispute ${dispute.id}`);

  if (shouldBan(dispute.status as DisputeStatus)) {
    if (customerId) {
      await cancelSubscriptions(stripe, customerId);
    }
    await ddb.send(new UpdateCommand({
      TableName: CONTACT_TABLE,
      Key: { contactId },
      UpdateExpression: 'SET lifecycleStage = :banned, isBanned = :true, updatedAt = :now',
      ConditionExpression: 'attribute_not_exists(lifecycleStage) OR lifecycleStage <> :banned',
      ExpressionAttributeValues: {
        ':banned': 'banned',
        ':true': true,
        ':now': new Date().toISOString(),
      },
    })).catch(e => { if (e.name !== 'ConditionalCheckFailedException') throw e; });
  }

  await writeTouchpoint(contactId, e.id, e.type, mode);
}
