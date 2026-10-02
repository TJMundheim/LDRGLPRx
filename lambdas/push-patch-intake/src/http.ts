import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { getStripeClient } from '@my4mlife/stripe-client';
import type { PaidSession } from './record';

const ORIGINS = new Set([
  'https://my4mlife.com', 'https://www.my4mlife.com', 'https://app.my4mlife.com',
  'http://localhost:4321', 'http://localhost:5173',
]);

export function reply(status: number, body: unknown, origin?: string): APIGatewayProxyResultV2 {
  return {
    statusCode: status,
    headers: {
      'Access-Control-Allow-Origin': origin && ORIGINS.has(origin) ? origin : 'https://my4mlife.com',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      Vary: 'Origin',
      'Content-Type': 'application/json',
    },
    body: status === 204 ? '' : JSON.stringify(body),
  };
}

/** The Stripe session if it is paid, for a push-patch-* SKU, and has a buyer email; otherwise null. */
export async function paidSession(sessionId: string): Promise<{ session: PaidSession; sku: string } | null> {
  try {
    const stripe = await getStripeClient();
    const session = (await stripe.checkout.sessions.retrieve(sessionId)) as unknown as PaidSession;
    const sku = (session.metadata?.['skuIds'] ?? '').split(',')[0]?.trim() ?? '';
    const email = session.customer_details?.email;
    return session.payment_status === 'paid' && sku.startsWith('push-patch-') && email ? { session, sku } : null;
  } catch {
    return null;
  }
}
