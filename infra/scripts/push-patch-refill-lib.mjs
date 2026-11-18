// Pure helpers for push-patch-refill.mjs (tested in push-patch-refill.test.mjs).
import { createHmac } from 'node:crypto';

// Links live on our own domain (website/src/pages/reorder.astro forwards to the API); sender-domain match keeps mail filters calm.
export const API_BASE = 'https://www.my4mlife.com/reorder';

/** Same algorithm as lambdas/push-patch-refill/src/sig.ts: HMAC-SHA256 hex over `contactId|encounterId|exp`. */
export const signLink = (c, e, exp, key) => createHmac('sha256', key).update(`${c}|${e}|${exp}`).digest('hex');

export function buildLinkUrl({ contactId, encounterId, days = 14, key, now = Date.now(), base = API_BASE }) {
  if (!(days > 0)) throw new Error('--days must be positive');
  const exp = Math.floor(now / 1000) + Math.round(days * 86400);
  const q = new URLSearchParams({ c: contactId, e: encounterId, exp: String(exp), sig: signLink(contactId, encounterId, exp, key) });
  return { url: `${base}?${q}`, exp };
}

// Mirrors lambdas/_shared/push-patch-decision-core/src/rx-products.ts (manual-pharmacy Rx refill products); a test cross-checks it.
export const RX_PRODUCTS = { 'gut-brain-rx': { name: 'Gut-Brain Rx', intervalDays: 30, fulfillment: 'manual' } };
const rxOf = (id) => { const p = Object.hasOwn(RX_PRODUCTS, id) ? RX_PRODUCTS[id] : undefined; if (!p) throw new Error(`unknown product ${id}`); return p; };

/** Mirrors buildRefillAuth in lambdas/_shared/push-patch-decision-core/src/refill-auth.ts (1 year, on-demand, active). */
export function buildAuth({ refills, sku, authorizedBy, providerId, partnerRef, product, expires, now = new Date() }) {
  const exp = new Date(now); exp.setUTCFullYear(exp.getUTCFullYear() + 1);
  if (expires) { const e = new Date(`${expires}T23:59:59.000Z`); exp.setTime(e.getTime()); }
  if (product !== undefined) {
    const rx = rxOf(product);
    return { refillsAuthorized: refills, refillsUsed: 0, sku: product, product, fulfillment: rx.fulfillment, intervalDays: rx.intervalDays, expiresAt: exp.toISOString(), authorizedBy,
      ...(providerId && { signedByProviderId: providerId }), authorizedAt: now.toISOString(), ...(partnerRef && { partnerRef }), mode: 'on-demand', status: 'active' };
  }
  return { refillsAuthorized: refills, refillsUsed: 0, sku, intervalWeeks: 6, expiresAt: exp.toISOString(), authorizedBy,
    ...(providerId && { signedByProviderId: providerId }), authorizedAt: now.toISOString(), ...(partnerRef && { partnerRef }), mode: 'on-demand', status: 'active' };
}

/** Mirrors partnerRefFromSession (the CLI swaps promotion_code ids for the retrieved objects first). */
export function partnerRefFromSession(session) {
  const ref = session?.metadata?.partnerRef;
  if (ref) return String(ref);
  for (const d of session?.discounts ?? []) {
    const pc = d?.promotion_code;
    if (pc && typeof pc === 'object' && pc.metadata?.partner === 'true' && pc.code) return String(pc.code).toUpperCase();
  }
  return undefined;
}

/** Same eligibility rules as grantRefills: push-patch lane, script-written, not refunded. Returns an error string or null. */
export function grantProblem(enc, product) {
  if (product !== undefined) { // manual-pharmacy Rx product: any non-push-patch lane; shipTo is collected on the reorder page
    try { rxOf(product); } catch (e) { return e.message; }
    if (!enc || enc.lane === 'push-patch') return 'encounter not found or is a push-patch encounter (not an eligible encounter for a manual product)';
    if (enc.state !== 'fulfilled' && enc.state !== 'script-written') return `encounter state is ${enc.state}, not fulfilled or script-written`;
    if (enc.refundStatus) return `encounter refund status is ${enc.refundStatus}`;
    return null;
  }
  if (!enc || enc.lane !== 'push-patch') return 'not a push-patch encounter';
  if (enc.state !== 'script-written') return `encounter state is ${enc.state}, not script-written`;
  if (enc.refundStatus) return `encounter refund status is ${enc.refundStatus}`;
  if (!enc.shipTo?.line1) return 'encounter has no shipTo address (refills ship to the address on this encounter)';
  return null;
}

export function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const o = { cmd, flags: {}, apply: false, mode: 'test' };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--apply') o.apply = true;
    else if (a.startsWith('--')) {
      const v = rest[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      o.flags[a.slice(2)] = v;
    } else throw new Error(`unexpected argument ${a}`);
  }
  o.mode = o.flags.mode ?? 'test';
  if (!['test', 'live'].includes(o.mode)) throw new Error('--mode must be test or live');
  const need = { grant: ['contact', 'encounter', 'refills', 'authorized-by'], link: ['contact', 'encounter'], find: ['email'] }[cmd];
  if (!need) throw new Error('usage: grant|link|find (see header of push-patch-refill.mjs)');
  for (const n of need) if (!o.flags[n]) throw new Error(`--${n} is required`);
  if (cmd === 'grant') {
    const r = Number(o.flags.refills);
    if (!Number.isInteger(r) || r < 1 || r > 52) throw new Error('--refills must be an integer 1-52');
    o.flags.refills = r;
  }
  if (cmd !== 'grant' && o.flags.product !== undefined) throw new Error('--product only applies to grant');
  if (cmd === 'grant' && o.flags.product !== undefined) rxOf(o.flags.product);
  if (o.flags.expires !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(o.flags.expires)) throw new Error('--expires must be YYYY-MM-DD');
  if (o.flags.days !== undefined && !(Number(o.flags.days) > 0)) throw new Error('--days must be positive');
  return o;
}
