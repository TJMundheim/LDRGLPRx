// Ship-to: the Stripe checkout address, confirmed or corrected by the buyer on the thank-you page. US only.
export interface ShipTo { name: string; line1: string; line2: string; city: string; state: string; postalCode: string }
export type Shipping = { confirmed: true } | { confirmed: false; address: ShipTo };
export interface StripeShipping { name?: string | null; address?: Record<string, string | null | undefined> | null }

const STATES = new Set(('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY '
  + 'NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY').split(' '));

const text = (v: unknown, max: number, required: boolean): string | null => {
  const t = typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : null;
  return t === null || t.length > max || (required && !t) ? null : t;
};

/** Validate a buyer-typed address. Null on any bad field. State is upper-cased; ZIP+4 is normalized to 12345-6789. */
export function parseAddress(raw: unknown): ShipTo | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = text(r.name, 100, true), line1 = text(r.line1, 100, true), line2 = text(r.line2, 100, false);
  const city = text(r.city, 60, true), state = text(r.state, 2, true)?.toUpperCase();
  const zip = text(r.postalCode, 10, true)?.replace(/^(\d{5})-?(\d{4})$/, '$1-$2');
  if (name === null || line1 === null || line2 === null || city === null || !state || !STATES.has(state)) return null;
  if (!zip || !/^\d{5}(-\d{4})?$/.test(zip)) return null;
  return { name, line1, line2, city, state, postalCode: zip };
}

export function parseShipping(raw: unknown): Shipping | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.confirmed === true) return { confirmed: true };
  const address = r.confirmed === false ? parseAddress(r.address) : null;
  return address ? { confirmed: false, address } : null;
}

/** The address Stripe collected at checkout, or null if it holds no usable one. */
export function stripeShipTo(d: StripeShipping | null | undefined): ShipTo | null {
  const a = d?.address;
  if (!a) return null;
  const s = (v: string | null | undefined) => (v ?? '').trim();
  const out = { name: s(d?.name), line1: s(a['line1']), line2: s(a['line2']), city: s(a['city']), state: s(a['state']), postalCode: s(a['postal_code']) };
  return out.line1 && out.city && out.state && out.postalCode ? out : null;
}

export const resolveShipTo = (shipping: Shipping, d: StripeShipping | null | undefined): ShipTo | null =>
  shipping.confirmed ? stripeShipTo(d) : shipping.address;
