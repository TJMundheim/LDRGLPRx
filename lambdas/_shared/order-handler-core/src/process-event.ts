import { getStripeClient } from '@my4mlife/stripe-client';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const REGION = 'us-east-2';
const ACCOUNT = '879696522760';
const tableArn = (name: string) =>
  `arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/${name}`;

function makeDdb() {
  return DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
}

export async function processEvent(e: { id: string; type: string; livemode: boolean }): Promise<void> {
  const stripe = await getStripeClient({ livemode: e.livemode });
  const session = await stripe.checkout.sessions.retrieve(e.id, {
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

  const amountUSD = (session.amount_total ?? 0) / 100;

  // 1. Contact upsert — last-writer-wins on updatedAt, never overwrites isDemo
  await ddb.send(
    new UpdateCommand({
      TableName: 'Contact',
      Key: { email },
      UpdateExpression: [
        'SET lastPurchaseAt = :now',
        'updatedAt = :now',
        'hasUsedFirstPurchaseDiscount = :true',
        'lifetimeValueUSD = if_not_exists(lifetimeValueUSD, :zero) + :amount',
      ].join(', '),
      ExpressionAttributeValues: {
        ':now': now,
        ':true': true,
        ':zero': 0,
        ':amount': amountUSD,
      },
    })
  );

  // 2. Orders insert — keyed by session ID, idempotent
  try {
    await ddb.send(
      new PutCommand({
        TableName: 'Orders',
        Item: {
          orderId: session.id,
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
    if ((err as { name?: string }).name !== 'ConditionalCheckFailedException') throw err;
  }

  // 3. Touchpoints insert — keyed by Stripe event ID, idempotent
  try {
    await ddb.send(
      new PutCommand({
        TableName: 'Touchpoints',
        Item: {
          stripeEventId: e.id,
          type: e.type,
          sessionId: session.id,
          email,
          mode,
          createdAt: now,
        },
        ConditionExpression: 'attribute_not_exists(stripeEventId)',
      })
    );
  } catch (err: unknown) {
    if ((err as { name?: string }).name !== 'ConditionalCheckFailedException') throw err;
  }
}
