// Pull-Up Challenge coupon (50% off once, Push Patch products): find or create, then record its id in SSM.
export const PULLUP_KEY = 'pullup-50';
export const ssmName = (mode) => `/my4mlife/pullup/coupon-id-${mode}`;
export const buildParams = (products) => ({ name: 'Pull-Up Challenge 50% off', percent_off: 50, duration: 'once', applies_to: { products }, metadata: { key: PULLUP_KEY } });

export async function runPullupCoupon({ stripe, ssm, makeSsmCommand, mode, tag, apply, products, describe, log = console.log }) {
  let coupon;
  for await (const c of stripe.coupons.list({ limit: 100, expand: ['data.applies_to'] })) if (c.metadata?.key === PULLUP_KEY) { coupon = c; break; }
  const params = buildParams(products);
  if (coupon) log(`${tag} coupon EXISTS: ${describe(coupon)} - skipping creation`);
  else if (!apply) log(`${tag} would create coupon:\n${JSON.stringify(params, null, 2)}`);
  else { coupon = await stripe.coupons.create(params); log(`${tag} CREATED coupon: ${describe(coupon)}`); }
  const name = ssmName(mode);
  if (!apply) { log(`${tag} would write SSM ${name} = ${coupon ? coupon.id : '<new coupon id>'}`); return; }
  await ssm.send(makeSsmCommand({ Name: name, Value: coupon.id, Type: 'String', Overwrite: true }));
  log(`${tag} wrote SSM ${name} = ${coupon.id}`);
}
