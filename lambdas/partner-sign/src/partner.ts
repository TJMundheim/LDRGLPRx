// Live lookup of a partner's promotion code in Stripe (metadata is the source of truth).
import { getStripeClient } from '@my4mlife/stripe-client';

export interface Partner {
  code: string; business: string; email: string;
  clientDiscount: string; commission: string; connectOnboardingUrl?: string;
}

const mode = (): 'live' | 'test' => (process.env.PARTNER_STRIPE_MODE === 'test' ? 'test' : 'live');

/** The partner for `code`, or undefined unless it is a partner code whose email matches `email`. */
export async function lookupPartner(code: string, email: string): Promise<Partner | undefined> {
  const stripe = await getStripeClient({ modeOverride: mode() });
  const { data } = await stripe.promotionCodes.list({ code, limit: 1 });
  const m = data[0]?.metadata ?? {};
  if (m.partner !== 'true' || !m.email || m.email.toLowerCase() !== email.toLowerCase()) return undefined;
  return {
    code, business: m.business ?? '', email: m.email,
    clientDiscount: m.clientDiscount ?? '', commission: m.commission ?? '',
    connectOnboardingUrl: m.connectOnboardingUrl || undefined,
  };
}
