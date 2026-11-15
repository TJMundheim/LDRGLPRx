// Partner attribution: ?ref=CODE -> active Stripe promotion code flagged metadata.partner === 'true'.
// Never throws: any problem means "no partner discount" and checkout proceeds as normal.
const REF = /^[A-Z0-9-]{2,30}$/;

export interface PartnerPromo { promotionCodeId?: string; partnerRef: string }
type PromoLister = { promotionCodes: { list: (p: { code: string; active: true; limit: 1 }) => Promise<{ data: Array<{ id: string; code?: string; metadata?: Record<string, string> | null }> }> } };

/** Trim + uppercase + validate; undefined when absent or malformed. */
export function normalizeRef(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const ref = raw.trim().toUpperCase();
  return REF.test(ref) ? ref : undefined;
}

export async function lookupPartnerPromo(getStripe: () => Promise<unknown>, raw: unknown): Promise<PartnerPromo | undefined> {
  const ref = normalizeRef(raw);
  if (!ref) return undefined;
  try {
    const stripe = (await getStripe()) as PromoLister;
    const hit = (await stripe.promotionCodes.list({ code: ref, active: true, limit: 1 })).data[0];
    if (!hit || hit.metadata?.['partner'] !== 'true') return undefined;
    // clientDiscount '0' = no client discount: attribution only (the code is never applied at checkout).
    return hit.metadata['clientDiscount'] === '0' ? { partnerRef: ref } : { promotionCodeId: hit.id, partnerRef: ref };
  } catch (e) {
    console.error('[push-patch-intake] partner ref lookup failed', { error: (e as { name?: string })?.name ?? 'Error' });
    return undefined;
  }
}
