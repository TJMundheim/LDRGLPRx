import { pushPatchEntry } from './push-patch';
import { laneEntry, type Lane } from './lanes';
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
  /** Partner promotion code id (auto-applied from ?ref=); replaces the promo-code box. Absent for no-discount partners. */
  promotionCodeId?: string;
  partnerRef?: string;
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
  discounts?: Array<{ promotion_code: string }>;
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
      ...(i.partnerRef ? { partnerRef: i.partnerRef } : {}),
      isDemo: String(i.mode === 'test'),
    },
    phone_number_collection: i.phone ? undefined : { enabled: true },
    shipping_address_collection: { allowed_countries: ['US'] },
    // Stripe rejects this until its promo-consent terms are accepted in the dashboard (settings/checkout).
    ...(process.env['STRIPE_PROMO_CONSENT'] === 'on' ? { consent_collection: { promotions: 'auto' as const } } : {}),
    // Stripe rejects `discounts` together with `allow_promotion_codes`: a partner code replaces the box.
    ...(i.promotionCodeId
      ? { discounts: [{ promotion_code: i.promotionCodeId }] }
      : i.partnerRef
        ? {} // no-discount partner: attribution only, no code box
        : process.env['STRIPE_PROMO_CODES'] === 'on' ? { allow_promotion_codes: true as const } : {}),
  };
}

export interface LaneSessionInput extends Omit<PushPatchSessionInput, 'skuId'> {
  skuId: string;
  lane?: Lane; // default 'push-patch'
  autoShip?: boolean; // glp1: 28-day recurring price (subscription mode)
}
export type LaneSessionParams = Omit<PushPatchSessionParams, 'mode'> & {
  mode: 'payment' | 'subscription';
  subscription_data?: { metadata: Record<string, string> };
};

// Lane-aware builder. push-patch -> exactly buildPushPatchSessionParams. glp1 -> no wear, `lane` metadata,
// no partner/promo handling; null when GLP-1 prices are not live yet (callers return 503).
export function buildLaneSessionParams(i: LaneSessionInput): LaneSessionParams | null {
  if ((i.lane ?? 'push-patch') === 'push-patch') return buildPushPatchSessionParams(i);
  const autoShip = i.autoShip === true;
  const entry = laneEntry('glp1', i.skuId, i.mode, autoShip);
  if (!entry) return null;
  const sku = encodeURIComponent(i.skuId);
  // A $2 test price is one-time, so it forces payment mode.
  const mode = i.testPrice ? 'payment' : entry.mode;
  const metadata: Record<string, string> = {
    contactId: i.contactId,
    intakeId: i.intakeId,
    skuIds: i.skuId,
    lane: 'glp1',
    autoShip: String(autoShip),
    ...i.screenMeta,
    ...(i.testPrice ? { test_price: 'true' } : {}),
    ...(i.firstName ? { firstName: i.firstName } : {}),
    ...(i.phone ? { phone: i.phone } : {}),
    isDemo: String(i.mode === 'test'),
  };
  return {
    mode,
    line_items: [i.testPrice ? { price_data: i.testPrice, quantity: 1 } : { price: entry.priceId, quantity: 1 }],
    success_url: `${entry.successUrl}?session_id={CHECKOUT_SESSION_ID}&sku=${sku}`,
    cancel_url: `${entry.cancelUrl}?sku=${sku}`,
    customer_email: i.email || undefined,
    payment_intent_data: i.email && mode === 'payment' ? { receipt_email: i.email } : undefined,
    metadata,
    ...(mode === 'subscription' ? { subscription_data: { metadata } } : {}),
    phone_number_collection: i.phone ? undefined : { enabled: true },
    shipping_address_collection: { allowed_countries: ['US'] },
  };
}
