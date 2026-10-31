// Monthly partner views shared by statements / connect / payouts: America/Chicago month bounds,
// payable-session rules, per-partner order rows (no client identity ever leaves a row).
import { readFileSync } from 'node:fs';
const TZ = 'America/Chicago';
const promoId = (d) => (typeof d.promotion_code === 'string' ? d.promotion_code : d.promotion_code?.id);

function chicagoMidnight(y, m) { // first of month 00:00 CT -> unix seconds (DST-safe)
  const want = `${y}-${String(m).padStart(2, '0')}-01 00:00:00`;
  for (const off of [5, 6]) {
    const t = Date.UTC(y, m - 1, 1) + off * 3600e3;
    if (new Date(t).toLocaleString('sv-SE', { timeZone: TZ, hourCycle: 'h23' }) === want) return t / 1000;
  }
  throw new Error(`Could not resolve ${want} ${TZ}`);
}
export function monthBounds(month) {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month ?? '');
  if (!m) throw new Error('--month must be YYYY-MM');
  const y = Number(m[1]), n = Number(m[2]);
  return { gte: chicagoMidnight(y, n), lte: (n === 12 ? chicagoMidnight(y + 1, 1) : chicagoMidnight(y, n + 1)) - 1 };
}

/** Paid and not fully refunded (partial refunds still pay, matching summarizePayouts). */
export function isPayable(s) {
  if (s.status !== 'complete' || s.payment_status !== 'paid') return false;
  const ch = s.payment_intent?.latest_charge;
  const refunded = ch && typeof ch === 'object' ? ch.amount_refunded ?? 0 : 0;
  return !(ch?.refunded || (s.amount_total > 0 && refunded >= s.amount_total));
}

export const parseBlends = (src) => Object.fromEntries([...src.matchAll(/skuId:\s*'([^']+)',\s*name:\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
export const loadBlendNames = (root) => parseBlends(readFileSync(`${root}/website/src/data/pushPatch.ts`, 'utf8'));

export function monthRows(partner, sessions, names) {
  const per = Number(partner.metadata?.commission ?? 100) * 100;
  return sessions
    .filter((s) => isPayable(s) && (s.discounts ?? []).some((d) => promoId(d) === partner.id))
    .sort((a, b) => a.created - b.created)
    .map((s) => ({
      date: new Date(s.created * 1000).toLocaleDateString('sv-SE', { timeZone: TZ }),
      blend: names[s.metadata?.skuIds] ?? 'Push Patch',
      orderRef: String(s.id).slice(-6),
      cents: per,
    }));
}
export const partnerCents = (rows) => rows.reduce((a, r) => a + r.cents, 0);

export async function loadPartners(stripe, onlyCode) {
  const out = [];
  for await (const p of stripe.promotionCodes.list({ limit: 100, ...(onlyCode ? { code: onlyCode } : {}) })) if (p.metadata?.partner === 'true') out.push(p);
  return out;
}
export async function loadMonthSessions(stripe, month) {
  const out = [];
  for await (const s of stripe.checkout.sessions.list({ created: monthBounds(month), limit: 100, expand: ['data.payment_intent.latest_charge'] })) out.push(s);
  return out;
}
