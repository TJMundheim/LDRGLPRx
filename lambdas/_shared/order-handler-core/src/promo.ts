// Promotion-code attribution for paid sessions. Stripe puts `discounts` and
// `total_details.amount_discount` on the session without any expand.
type Stripeish = { promotionCodes?: { retrieve: (id: string) => Promise<{ code?: string }> } };
type PromoSession = {
  discounts?: Array<{ coupon?: unknown; promotion_code?: string | { id?: string; code?: string } | null }> | null;
  total_details?: { amount_discount?: number | null } | null;
};
export type Promo = { promoCode: string; discountUSD: number };

/** Code text (uppercase) + dollars off, or undefined when no promotion code was used. Retrieve failure falls back to the id. */
export async function resolvePromo(stripe: unknown, session: PromoSession): Promise<Promo | undefined> {
  const pc = session.discounts?.[0]?.promotion_code;
  if (!pc) return undefined;
  const discountUSD = (session.total_details?.amount_discount ?? 0) / 100;
  const id = typeof pc === 'string' ? pc : (pc.id ?? '');
  let code = typeof pc === 'string' ? undefined : pc.code;
  if (!code && typeof pc === 'string') {
    try {
      const r = await (stripe as Stripeish).promotionCodes!.retrieve(pc);
      code = r.code;
    } catch (err) {
      console.error('[order-handler] promotion code lookup failed; using id', { error: (err as { name?: string })?.name ?? 'Error' });
    }
  }
  if (!code && !id) return undefined;
  return { promoCode: code ? code.toUpperCase() : id, discountUSD };
}

/** HTML line for internal order emails; empty when no promo. */
export const promoLine = (p: Promo | undefined): string =>
  p ? `Promo code: ${p.promoCode.replace(/[<>&"']/g, '')} (&minus;$${p.discountUSD.toFixed(2)})` : '';
