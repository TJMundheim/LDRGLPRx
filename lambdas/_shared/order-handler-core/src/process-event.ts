import { getStripeClient } from '@my4mlife/stripe-client';
import { resolveContactId } from '@my4mlife/contact-id';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

function makeDdb() {
  return DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));
}

export async function processEvent(e: { id: string; type: string; livemode: boolean }): Promise<void> {
  const stripe = await getStripeClient({ livemode: e.livemode });

  // e.id is the Stripe EVENT id (evt_...). Retrieve the event to get the
  // canonical object id (cs_... checkout session).
  const evt = await stripe.events.retrieve(e.id);
  const sessionId = (evt.data.object as { id?: string }).id;
  if (!sessionId) throw new Error(`order-handler: event ${e.id} has no data.object.id`);

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'customer'],
  });

  const ddb = makeDdb();
  const now = new Date().toISOString();
  const mode = e.livemode ? 'live' : 'test';

  const email =
    (typeof session.customer === 'object' && session.customer !== null
      ? (session.customer as { email?: string }).email
      : undefined) ??
    session.customer_details?.email ??
    '';

  const metadataContactId = (session.metadata as Record<string, string> | null)?.['contactId'] ?? null;
  const contactId = resolveContactId({ metadataContactId, email });
  if (!contactId) {
    // Anonymous purchase with no contact context — refuse rather than
    // collapse into a corrupt {email:''} Contact row. DLQ will surface
    // upstream data issues.
    throw new Error(`order-handler: cannot resolve contactId for session ${session.id} (no metadata.contactId, no email)`);
  }

  const amountUSD = (session.amount_total ?? 0) / 100;

  // 1. Orders insert FIRST — keyed by session ID, idempotent via condition.
  // We use the success of this insert as the "this is a new order" signal so
  // that LTV is only incremented once even if the event is retried.
  let isNewOrder = true;
  try {
    await ddb.send(
      new PutCommand({
        TableName: 'Orders',
        Item: {
          orderId: session.id,
          contactId,
          email,
          amountUSD,
          currency: session.currency,
          paymentStatus: session.payment_status,
          mode,
          createdAt: now,
        },
        ConditionExpression: 'attribute_not_exists(orderId)',
      })
    );
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      isNewOrder = false;
    } else {
      throw err;
    }
  }

  // 2. Contact upsert — only increment LTV if this is a new order.
  const updateExpr = [
    'SET lastPurchaseAt = :now',
    'updatedAt = :now',
    'hasUsedFirstPurchaseDiscount = :true',
  ];
  const values: Record<string, unknown> = { ':now': now, ':true': true };
  if (isNewOrder) {
    updateExpr.push('lifetimeValueUSD = if_not_exists(lifetimeValueUSD, :zero) + :amount');
    values[':zero'] = 0;
    values[':amount'] = amountUSD;
  }
  await ddb.send(
    new UpdateCommand({
      TableName: 'Contact',
      Key: { contactId },
      UpdateExpression: updateExpr.join(', '),
      ExpressionAttributeValues: values,
    })
  );

  // 3. Touchpoints insert — composite PK contactId + sk. Idempotent via
  // attribute_not_exists(sk) so a retry of the same event is a no-op.
  try {
    await ddb.send(
      new PutCommand({
        TableName: 'Touchpoints',
        Item: {
          contactId,
          sk: `stripe#${e.id}`,
          stripeEventId: e.id,
          eventType: e.type,
          sessionId: session.id,
          email,
          mode,
          ts: now,
        },
        ConditionExpression: 'attribute_not_exists(sk)',
      })
    );
  } catch (err: unknown) {
    if ((err as { name?: string }).name !== 'ConditionalCheckFailedException') throw err;
  }
}
