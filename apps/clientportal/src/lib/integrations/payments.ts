/**
 * Payments integration — stub. Not implemented.
 *
 * Expected vendor: Stripe Checkout (hosted) for cohort subscription billing.
 * TODO: implement once pricing + Stripe account finalized.
 */

export interface CheckoutSessionRequest {
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export interface SubscriptionStatus {
  active: boolean;
  tier: 'cohort' | 'alumni' | null;
  currentPeriodEnd?: string;
}

/** Creates a Stripe-style checkout session and returns its redirect URL. */
export async function createCheckoutSession(_req: CheckoutSessionRequest): Promise<CheckoutSession> {
  throw new Error('Not implemented: payments provider pending');
}

/** Returns the current subscription status for a user. */
export async function getSubscriptionStatus(_userId: string): Promise<SubscriptionStatus> {
  throw new Error('Not implemented: payments provider pending');
}
