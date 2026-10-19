// Maps Stripe Checkout's promotional-email consent (session.consent.promotions) to the Contact
// marketingConsent shape. Absent/null means the buyer was never asked, so nothing is recorded.
export function marketingConsentFrom(
  consent: { promotions?: string | null } | null | undefined
): { status: 'opted_in' | 'opted_out'; source: 'stripe-checkout' } | undefined {
  const p = consent?.promotions;
  if (p === 'opt_in') return { status: 'opted_in', source: 'stripe-checkout' };
  if (p === 'opt_out') return { status: 'opted_out', source: 'stripe-checkout' };
  return undefined;
}
