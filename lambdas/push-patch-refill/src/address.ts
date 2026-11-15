// Shipping-address answer on the reorder page: US states list and server-side validation. Never logged.
export const STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');

// Same shape as the parent encounter's shipTo (see push-patch-intake ship.ts), so resolveShip() reads it directly.
export interface ShipTo { name: string; line1: string; line2: string; city: string; state: string; postalCode: string }
export const ADDR_FIELDS = ['a_name', 'a_line1', 'a_line2', 'a_city', 'a_state', 'a_zip'] as const;

// eslint-disable-next-line no-control-regex
const clean = (v: string | null, max: number): string => (v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max + 1);

export function parseAddress(p: URLSearchParams): { ok: true; shipTo: ShipTo } | { ok: false } {
  const name = clean(p.get('a_name'), 100), line1 = clean(p.get('a_line1'), 100), line2 = clean(p.get('a_line2'), 100);
  const city = clean(p.get('a_city'), 60), state = clean(p.get('a_state'), 2).toUpperCase(), zip = clean(p.get('a_zip'), 10);
  const m = /^(\d{5})(?:-?(\d{4}))?$/.exec(zip);
  if (!name || !line1 || !city || !m || !STATES.includes(state)) return { ok: false };
  if (name.length > 100 || line1.length > 100 || line2.length > 100 || city.length > 60) return { ok: false };
  return { ok: true, shipTo: { name, line1, line2, city, state, postalCode: m[2] ? `${m[1]}-${m[2]}` : m[1]! } };
}
