// Partner-program subcommands for push-patch-promo.mjs: partner-coupon, partner, payouts (+ statements, connect-onboard, payouts --pay in sibling modules).
// Pure helpers are exported for tests; run(ctx) does the Stripe work (dry run unless ctx.apply).
export const COUPONS = [
  { key: 'push-patch-partner-50', name: 'Push Patch partner $50 off', cents: 5000 },
  { key: 'push-patch-partner-100', name: 'Push Patch partner $100 off', cents: 10000 },
];
import { isPayable } from './push-patch-partner-month.mjs';
const CODE = /^[A-Z0-9-]{2,30}$/;
export const parseRef = (s) => { const c = String(s ?? '').trim().toUpperCase(); return CODE.test(c) ? c : undefined; };

const promoId = (d) => (typeof d.promotion_code === 'string' ? d.promotion_code : d.promotion_code?.id);

/** One row per partner code: paid sessions only, fully refunded charges excluded. */
export function summarizePayouts(partnerCodes, sessions) {
  const rows = new Map(partnerCodes.map((p) => [p.id, { business: p.metadata?.business ?? '-', code: p.code, orders: 0, gross: 0, commission: 0, per: Number(p.metadata?.commission ?? 100) * 100 }]));
  for (const s of sessions) {
    if (!isPayable(s)) continue;
    const r = (s.discounts ?? []).map((d) => rows.get(promoId(d))).find(Boolean);
    if (!r) continue;
    r.orders++; r.gross += s.amount_total ?? 0; r.commission += r.per;
  }
  return [...rows.values()].map(({ per, ...r }) => r);
}

export async function run(c) {
  const { stripe, tag, apply, die, usd, flagVal, has, argv, cmd, chicagoTime, fmt } = c;
  if (cmd === 'statements') return (await import('./push-patch-partner-statements.mjs')).runStatements(c);
  if (cmd === 'connect-onboard') return (await import('./push-patch-partner-connect.mjs')).runOnboard(c);
  if (cmd === 'payouts' && has('--pay')) return (await import('./push-patch-partner-connect.mjs')).runPay(c);
  const findCoupon = async (key) => {
    for await (const x of stripe.coupons.list({ limit: 100, expand: ['data.applies_to'] })) if (x.metadata?.key === key) return x;
  };
  if (cmd === 'partner-coupon') {
    const products = await c.pushPatchProducts();
    for (const d of COUPONS) {
      const ex = await findCoupon(d.key);
      if (ex) { console.log(`${tag} coupon EXISTS: ${ex.id} "${ex.name}" ${usd(ex.amount_off)} ${ex.duration} - no action`); continue; }
      const params = { name: d.name, amount_off: d.cents, currency: 'usd', duration: 'once', metadata: { key: d.key }, applies_to: { products } };
      if (!apply) console.log(`${tag} WOULD create coupon:\n${JSON.stringify(params, null, 2)}`);
      else console.log(`${tag} CREATED coupon: ${(await stripe.coupons.create(params)).id} "${d.name}"`);
    }
  } else if (cmd === 'partner') {
    const code = parseRef(argv[1]?.startsWith('--') ? '' : argv[1]);
    const business = flagVal('--name'), email = flagVal('--email'), disc = flagVal('--client-discount');
    const commission = flagVal('--commission') ?? (disc === '50' ? '150' : '100'); // TJ 2026-10-31: partner keeps the difference — $50 off earns $150
    if (!code || !business || !email || !['50', '100'].includes(disc)) die('Usage: partner <CODE> --name "<Business>" --email <e> --client-discount 50|100 [--commission 100] [--note "..."]');
    if (!/^\d+$/.test(commission)) die('--commission must be whole dollars');
    const coupon = await findCoupon(`push-patch-partner-${disc}`);
    if (!coupon) die(`${tag} coupon push-patch-partner-${disc} not found; run "partner-coupon --apply" first.`);
    const dupes = (await stripe.promotionCodes.list({ code, limit: 10 })).data;
    if (dupes.length) die(`${tag} REFUSED: code ${code} already exists (${dupes.map((d) => `${d.id} active=${d.active}`).join(', ')}).`);
    const metadata = { partner: 'true', business, email, commission, clientDiscount: disc, ...(flagVal('--note') ? { note: flagVal('--note') } : {}) };
    const params = { coupon: coupon.id, code, metadata };
    if (!apply) console.log(`${tag} WOULD create partner code ${code}:\n${JSON.stringify(params, null, 2)}`);
    else { const p = await stripe.promotionCodes.create(params); console.log(`${tag} CREATED ${p.code} (${p.id}) active=${p.active} client $${disc} off, partner earns $${commission}`); }
  } else {
    const partners = [];
    for await (const p of stripe.promotionCodes.list({ limit: 100 })) if (p.metadata?.partner === 'true') partners.push(p);
    const created = {};
    if (has('--since')) created.gte = chicagoTime(flagVal('--since'), '00:00:00', '--since');
    if (has('--until')) created.lte = chicagoTime(flagVal('--until'), '23:59:59', '--until');
    const ids = new Set(partners.map((p) => p.id));
    const hits = [];
    if (partners.length) {
      for await (const s of stripe.checkout.sessions.list({ ...(Object.keys(created).length ? { created } : {}), limit: 100, expand: ['data.payment_intent.latest_charge'] })) {
        if ((s.discounts ?? []).some((d) => ids.has(promoId(d)))) hits.push(s);
      }
    }
    console.log(`${tag} partner payouts${has('--since') ? ` since ${flagVal('--since')}` : ''}${has('--until') ? ` until ${flagVal('--until')}` : ''} (paid, fully refunded excluded)`);
    console.log(['BUSINESS', 'CODE', 'ORDERS', 'GROSS', 'COMMISSION OWED'].join('\t'));
    const rows = summarizePayouts(partners, hits);
    for (const r of rows) console.log([r.business, r.code, r.orders, usd(r.gross), usd(r.commission)].join('\t'));
    console.log(rows.length ? `TOTAL commission owed: ${usd(rows.reduce((a, r) => a + r.commission, 0))}` : '(no partner codes yet)');
  }
}
