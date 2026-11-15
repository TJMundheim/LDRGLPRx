import { randomInt } from 'node:crypto';
import { getStripeClient } from '@my4mlife/stripe-client';

// No 0/O, 1/I/L: easy to read and type.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_ATTEMPTS = 3;
const TTL_DAYS = 90;

const makeCode = () => 'PULLUP-' + Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
const isDuplicate = (e: any) => e?.code === 'resource_already_exists' || /already exists/i.test(String(e?.message ?? ''));

/** Creates a single-use, 90-day Stripe promotion code on the Pull-Up coupon. Retries only on duplicate codes. */
export async function issueCode(round: 'start' | 'final', now: Date = new Date()): Promise<{ code: string; promoId: string }> {
  const stripe: any = await getStripeClient({ modeOverride: process.env.STRIPE_MODE === 'live' ? 'live' : 'test' });
  let last: unknown;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const code = makeCode();
    try {
      const promo = await stripe.promotionCodes.create({
        coupon: process.env.PULLUP_COUPON_ID, code, max_redemptions: 1,
        expires_at: Math.floor(now.getTime() / 1000) + TTL_DAYS * 86400,
        metadata: { source: 'pullup-challenge', round },
      });
      return { code, promoId: promo.id };
    } catch (err) {
      if (!isDuplicate(err)) throw err;
      last = err;
    }
  }
  throw last;
}
