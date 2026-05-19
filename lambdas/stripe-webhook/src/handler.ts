import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import Stripe from 'stripe';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';
const ORDERS_TABLE = process.env.ORDERS_TABLE ?? 'Orders';
const TOUCHPOINTS_TABLE = process.env.TOUCHPOINTS_TABLE ?? 'Touchpoints';
const CONSULT_SKUS = new Set(['comprehensive-consult']);

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const sns = new SNSClient({ region: REGION });

function reply(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

async function sendMailgun(to: string, subject: string, text: string): Promise<string | null> {
  const { MAILGUN_DOMAIN, MAILGUN_API_KEY, MAILGUN_FROM } = process.env;
  if (!MAILGUN_DOMAIN || !MAILGUN_API_KEY || !MAILGUN_FROM) return null;
  const form = new URLSearchParams({ from: MAILGUN_FROM, to, subject, text });
  const res = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64') },
    body: form,
  });
  if (!res.ok) throw new Error(`mailgun ${res.status}`);
  const j = (await res.json()) as { id?: string };
  return j.id ?? null;
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !apiKey) return reply(500, { error: 'stripe env not configured' });

  const stripe = new Stripe(apiKey, { apiVersion: '2025-09-30.acacia' });
  const sig = event.headers['stripe-signature'] ?? event.headers['Stripe-Signature'];
  if (!sig || !event.body) return reply(400, { error: 'missing signature or body' });

  let stripeEvent: Stripe.Event;
  try { stripeEvent = stripe.webhooks.constructEvent(event.body, sig, secret); }
  catch { return reply(400, { error: 'signature verification failed' }); }

  const ts = new Date().toISOString();

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    const contactId = session.metadata?.contactId;
    if (!contactId) return reply(400, { error: 'missing contactId in session metadata' });

    await ddb.send(new PutCommand({
      TableName: ORDERS_TABLE,
      Item: {
        orderId: session.id, contactId,
        stripeCustomerId: String(session.customer ?? ''),
        stripePaymentIntentId: String(session.payment_intent ?? ''),
        stripeSubscriptionId: session.subscription ? String(session.subscription) : undefined,
        subtotal: session.amount_subtotal ?? 0,
        discount: (session.total_details?.amount_discount ?? 0),
        total: session.amount_total ?? 0,
        currency: session.currency ?? 'usd',
        status: 'paid', paidAt: ts, metadata: session.metadata ?? {},
      },
      ConditionExpression: 'attribute_not_exists(orderId)',
    })).catch((e) => { if (e.name !== 'ConditionalCheckFailedException') throw e; });

    const hasSubscription = !!session.subscription;
    await ddb.send(new UpdateCommand({
      TableName: CONTACT_TABLE, Key: { contactId },
      UpdateExpression: 'SET lifecycleStage = :stage, stripeCustomerId = :cust, hasActiveSubscription = :sub, hasPurchasedConsult = if_not_exists(hasPurchasedConsult, :false) OR :consultFlag, updatedAt = :ts',
      ExpressionAttributeValues: { ':stage': 'consult-paid', ':cust': String(session.customer ?? ''), ':sub': hasSubscription, ':false': false, ':consultFlag': true, ':ts': ts },
    }));

    await ddb.send(new PutCommand({
      TableName: TOUCHPOINTS_TABLE,
      Item: { contactId, sk: `${ts}#payment#${stripeEvent.id}`, eventType: 'payment', ts, payload: { sessionId: session.id, total: session.amount_total, currency: session.currency }, channelMessageId: stripeEvent.id },
      ConditionExpression: 'attribute_not_exists(sk)',
    })).catch((e) => { if (e.name !== 'ConditionalCheckFailedException') throw e; });

    const skuIds = (session.metadata?.skuIds ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const hasConsult = skuIds.some((s) => CONSULT_SKUS.has(s));
    const bookingUrl = process.env.ONBOARDING_BOOKING_URL;
    if (hasConsult && bookingUrl) {
      const sentinelSk = `${ts}#consult-confirmation#${stripeEvent.id}`;
      try {
        await ddb.send(new PutCommand({
          TableName: TOUCHPOINTS_TABLE,
          Item: { contactId, sk: sentinelSk, eventType: 'consult-confirmation', ts, payload: { stripeEventId: stripeEvent.id } },
          ConditionExpression: 'attribute_not_exists(sk)',
        }));
      } catch (e: any) {
        if (e.name === 'ConditionalCheckFailedException') return reply(200, { received: true });
        throw e;
      }
      const email = session.customer_details?.email ?? session.metadata?.email;
      const phone = session.customer_details?.phone ?? session.metadata?.phone;
      const subject = 'Your consult is paid — pick a time.';
      const body = `Your My4MLife consult is confirmed. Book your time here: ${bookingUrl}`;
      if (email) {
        const mgId = await sendMailgun(email, subject, body);
        await ddb.send(new PutCommand({ TableName: TOUCHPOINTS_TABLE, Item: { contactId, sk: `${ts}#email-out#${stripeEvent.id}`, eventType: 'email-out', ts, payload: { to: email, subject, bookingUrl }, channelMessageId: mgId ?? undefined } }));
      }
      if (phone) {
        const out = await sns.send(new PublishCommand({ PhoneNumber: phone, Message: body }));
        await ddb.send(new PutCommand({ TableName: TOUCHPOINTS_TABLE, Item: { contactId, sk: `${ts}#sms-out#${stripeEvent.id}`, eventType: 'sms-out', ts, payload: { to: phone, bookingUrl }, channelMessageId: out.MessageId } }));
      }
    }
  }

  // TODO: charge.refunded, customer.subscription.deleted, charge.dispute.created (chargeback ban)
  return reply(200, { received: true });
};
