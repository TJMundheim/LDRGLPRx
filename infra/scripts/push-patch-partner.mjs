// Partner-program subcommands for push-patch-promo.mjs: partner-coupon, partner, payouts (+ statements, connect-onboard, payouts --pay in sibling modules).
// Pure helpers are exported for tests; run(ctx) does the Stripe work (dry run unless ctx.apply).
export const COUPONS = [
  { key: 'push-patch-partner-50', name: 'Push Patch partner $50 off', cents: 5000 },
  { key: 'push-patch-partner-100', name: 'Push Patch partner $100 off', cents: 10000 },
];
import { isPayable, creditsPartner } from './push-patch-partner-month.mjs';
const CODE = /^[A-Z0-9-]{2,30}$/;
export const parseRef = (s) => { const c = String(s ?? '').trim().toUpperCase(); return CODE.test(c) ? c : undefined; };

const promoId = (d) => (typeof d.promotion_code === 'string' ? d.promotion_code : d.promotion_code?.id);

/** One row per partner code: paid sessions only, fully refunded charges excluded. */
export function summarizePayouts(partnerCodes, sessions) {
  const rows = new Map(partnerCodes.map((p) => [p.id, { business: p.metadata?.business ?? '-', code: p.code, orders: 0, gross: 0, commission: 0, per: Number(p.metadata?.commission ?? 100) * 100 }]));
  for (const s of sessions) {
    if (!isPayable(s)) continue;
    const r = (s.discounts ?? []).map((d) => rows.get(promoId(d))).find(Boolean)
      ?? partnerCodes.filter((p) => creditsPartner(p, s)).map((p) => rows.get(p.id)).find(Boolean);
    if (!r) continue;
    r.orders++; r.gross += s.amount_total ?? 0; r.commission += r.per;
  }
  return [...rows.values()].map(({ per, ...r }) => r);
}

/** Promotion-code params for a partner. clientDiscount '0' = no client offer: the code sits on the $50 coupon but can never meet its minimum_amount. */
export function partnerCodeParams({ code, business, email, clientDiscount, commission, couponId, link, note }) {
  if (!['0', '50', '100'].includes(clientDiscount)) throw new Error('--client-discount must be 0, 50 or 100');
  const none = clientDiscount === '0';
  const comm = commission ?? (none ? undefined : clientDiscount === '50' ? '150' : '100'); // TJ 2026-10-31: partner keeps the difference: $50 off earns $150
  if (none && !/^[1-9]\d*$/.test(String(comm ?? ''))) throw new Error('--commission (positive whole dollars) is required with --client-discount 0');
  if (!/^\d+$/.test(String(comm))) throw new Error('--commission must be whole dollars');
  const metadata = { partner: 'true', business, email, commission: String(comm), clientDiscount, ...(none ? { link: link ?? `https://www.my4mlife.com/go/push-patch?ref=${code}` } : {}), ...(note ? { note } : {}) };
  return { coupon: couponId, code, ...(none ? { restrictions: { minimum_amount: 99999999, minimum_amount_currency: 'usd' } } : {}), metadata };
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
    if (!code || !business || !email || !['0', '50', '100'].includes(disc)) die('Usage: partner <CODE> --name "<Business>" --email <e> --client-discount 0|50|100 [--commission 100] [--link URL] [--note "..."]  (0 requires --commission)');
    const build = (couponId) => partnerCodeParams({ code, business, email, clientDiscount: disc, commission: flagVal('--commission'), couponId, link: flagVal('--link'), note: flagVal('--note') });
    try { build('x'); } catch (e) { die(e.message); }
    const ckey = `push-patch-partner-${disc === '0' ? '50' : disc}`;
    const coupon = await findCoupon(ckey);
    if (!coupon) die(`${tag} coupon ${ckey} not found; run "partner-coupon --apply" first.`);
    const dupes = (await stripe.promotionCodes.list({ code, limit: 10 })).data;
    if (dupes.length) die(`${tag} REFUSED: code ${code} already exists (${dupes.map((d) => `${d.id} active=${d.active}`).join(', ')}).`);
    const params = build(coupon.id), commission = params.metadata.commission;
    if (!apply) console.log(`${tag} WOULD create partner code ${code}:\n${JSON.stringify(params, null, 2)}`);
    else { const p = await stripe.promotionCodes.create(params); console.log(`${tag} CREATED ${p.code} (${p.id}) active=${p.active} client ${disc === '0' ? 'pays full price' : `$${disc} off`}, partner earns $${commission}`); }
  } else {
    const partners = [];
    for await (const p of stripe.promotionCodes.list({ limit: 100 })) if (p.metadata?.partner === 'true') partners.push(p);
    const created = {};
    if (has('--since')) created.gte = chicagoTime(flagVal('--since'), '00:00:00', '--since');
    if (has('--until')) created.lte = chicagoTime(flagVal('--until'), '23:59:59', '--until');
    const ids = new Set(partners.map((p) => p.id));
    const refs = new Set(partners.filter((p) => p.metadata?.clientDiscount === '0').map((p) => p.code));
    const hits = [];
    if (partners.length) {
      for await (const s of stripe.checkout.sessions.list({ ...(Object.keys(created).length ? { created } : {}), limit: 100, expand: ['data.payment_intent.latest_charge'] })) {
        if ((s.discounts ?? []).some((d) => ids.has(promoId(d))) || (s.metadata?.partnerRef && refs.has(s.metadata.partnerRef))) hits.push(s);
      }
    }
    console.log(`${tag} partner payouts${has('--since') ? ` since ${flagVal('--since')}` : ''}${has('--until') ? ` until ${flagVal('--until')}` : ''} (paid, fully refunded excluded)`);
    console.log(['BUSINESS', 'CODE', 'ORDERS', 'GROSS', 'COMMISSION OWED'].join('\t'));
    const rows = summarizePayouts(partners, hits);
    for (const r of rows) console.log([r.business, r.code, r.orders, usd(r.gross), usd(r.commission)].join('\t'));
    console.log(rows.length ? `TOTAL commission owed: ${usd(rows.reduce((a, r) => a + r.commission, 0))}` : '(no partner codes yet)');
  }
}
