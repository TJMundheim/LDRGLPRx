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

/** Mirrors buildRefillAuth in lambdas/_shared/push-patch-decision-core/src/refill-auth.ts (1 year, on-demand, active). */
export function buildAuth({ refills, sku, authorizedBy, providerId, partnerRef, now = new Date() }) {
  const exp = new Date(now); exp.setUTCFullYear(exp.getUTCFullYear() + 1);
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
export function grantProblem(enc) {
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
  if (o.flags.days !== undefined && !(Number(o.flags.days) > 0)) throw new Error('--days must be positive');
  return o;
}
