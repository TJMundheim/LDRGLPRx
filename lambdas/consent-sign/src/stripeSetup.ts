// Server-side Stripe seam for the card step of the e-sign page.
//
// Mode: CONSENT_STRIPE_MODE, defaulting to 'live'. deploy.sh must never set it
// to 'test' — that value exists only for a deliberate E2E invocation.
import { getStripeClient, getStripePublishableKey } from '@my4mlife/stripe-client';

export const stripeMode = (): 'live' | 'test' =>
  process.env.CONSENT_STRIPE_MODE === 'test' ? 'test' : 'live';

export interface SetupSession {
  clientSecret: string;
  setupIntentId: string;
  customerId: string;
  publishableKey: string;
}

export interface SavedCard {
  stripeCustomerId: string;
  paymentMethodId: string;
  setupIntentId: string;
  last4?: string;
  brand?: string;
}

/**
 * Create (or reuse) a Stripe Customer for this patient and open an off-session
 * SetupIntent against it. Never logs anything about the card or the secret.
 */
export async function createSetupSession(opts: {
  contactId: string; encounterId: string; email: string; name?: string;
  existingCustomerId?: string;
}): Promise<SetupSession> {
  const mode = stripeMode();
  const stripe = await getStripeClient({ modeOverride: mode });
  const publishableKey = await getStripePublishableKey(mode);

  let customerId = opts.existingCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      ...(opts.email ? { email: opts.email } : {}),
      ...(opts.name ? { name: opts.name } : {}),
      metadata: { contactId: opts.contactId },
    });
    customerId = customer.id;
  }

  const si = await stripe.setupIntents.create({
    payment_method_types: ['card'],
    usage: 'off_session',
    customer: customerId,
    metadata: { contactId: opts.contactId, encounterId: opts.encounterId },
  });

  if (!si.client_secret) throw new Error('stripe did not return a client secret');
  return { clientSecret: si.client_secret, setupIntentId: si.id, customerId, publishableKey };
}

/**
 * Verify a SetupIntent the browser claims succeeded. Returns null when it is
 * not succeeded, has no payment method, or belongs to a different patient —
 * the id arrives from the client, so it is never trusted on its own.
 */
export async function confirmSavedCard(
  setupIntentId: string, contactId: string,
): Promise<SavedCard | null> {
  const stripe = await getStripeClient({ modeOverride: stripeMode() });
  const si = await stripe.setupIntents.retrieve(setupIntentId, { expand: ['payment_method'] });

  if (si.status !== 'succeeded') return null;
  if ((si.metadata ?? {})['contactId'] !== contactId) return null;

  const pm = si.payment_method as null | string | { id: string; card?: { last4?: string; brand?: string } };
  if (!pm) return null;
  const paymentMethodId = typeof pm === 'string' ? pm : pm.id;
  const customer = typeof si.customer === 'string' ? si.customer : si.customer?.id;
  if (!paymentMethodId || !customer) return null;

  const card = typeof pm === 'string' ? undefined : pm.card;
  return {
    stripeCustomerId: customer,
    paymentMethodId,
    setupIntentId: si.id,
    last4: card?.last4,
    brand: card?.brand,
  };
}
