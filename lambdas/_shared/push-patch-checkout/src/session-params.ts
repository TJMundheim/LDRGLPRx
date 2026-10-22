import { pushPatchEntry } from './push-patch';
import type { TestPriceData } from './test-price';

export interface PushPatchSessionInput {
  skuId: string;
  mode: 'test' | 'live';
  contactId: string;
  intakeId: string;
  screenMeta: Record<string, string>;
  email?: string;
  firstName?: string;
  phone?: string;
  testPrice?: TestPriceData | null;
}

export interface PushPatchSessionParams {
  mode: 'payment';
  line_items: Array<{ price: string; quantity: 1 } | { price_data: TestPriceData; quantity: 1 }>;
  success_url: string;
  cancel_url: string;
  customer_email?: string;
  payment_intent_data?: { receipt_email: string };
  metadata: Record<string, string>;
  phone_number_collection?: { enabled: true };
  shipping_address_collection: { allowed_countries: ['US'] };
  consent_collection?: { promotions: 'auto' };
  allow_promotion_codes?: true;
}

// Stripe Checkout params for a Push Patch order. Returns null when the sku has no price for the mode.
export function buildPushPatchSessionParams(i: PushPatchSessionInput): PushPatchSessionParams | null {
  const entry = pushPatchEntry(i.skuId, i.mode);
  if (!entry) return null;
  const sku = encodeURIComponent(i.skuId);
  return {
    mode: entry.mode,
    line_items: [i.testPrice ? { price_data: i.testPrice, quantity: 1 } : { price: entry.priceId, quantity: 1 }],
    success_url: `${entry.successUrl}?session_id={CHECKOUT_SESSION_ID}&sku=${sku}`,
    cancel_url: `${entry.cancelUrl}?sku=${sku}`,
    customer_email: i.email || undefined,
    payment_intent_data: i.email ? { receipt_email: i.email } : undefined,
    metadata: {
      contactId: i.contactId,
      intakeId: i.intakeId,
      skuIds: i.skuId,
      wear: '12h',
      ...i.screenMeta,
      ...(i.testPrice ? { test_price: 'true' } : {}),
      ...(i.firstName ? { firstName: i.firstName } : {}),
      ...(i.phone ? { phone: i.phone } : {}),
      isDemo: String(i.mode === 'test'),
    },
    phone_number_collection: i.phone ? undefined : { enabled: true },
    shipping_address_collection: { allowed_countries: ['US'] },
    // Stripe rejects this until its promo-consent terms are accepted in the dashboard (settings/checkout).
    ...(process.env['STRIPE_PROMO_CONSENT'] === 'on' ? { consent_collection: { promotions: 'auto' as const } } : {}),
    // Promotion-code box on Checkout; stays off until the code names exist.
    ...(process.env['STRIPE_PROMO_CODES'] === 'on' ? { allow_promotion_codes: true as const } : {}),
  };
}
