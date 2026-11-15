// Deactivate (not delete) a Promotion Code by WORD. Reversible: re-activate in the Stripe dashboard.
// Never touches the Coupon itself (other codes may share it).
export const matchActive = (rows, word) => rows.filter((p) => p.active && p.code.toUpperCase() === String(word).toUpperCase());

export const reportLines = (rows, fmt) => rows.map((p) =>
  `${p.code} ${p.id} coupon=${p.coupon?.id} "${p.coupon?.name ?? ''}" redeemed=${p.times_redeemed} expires=${fmt(p.expires_at)}`);

export async function runDeactivate({ stripe, tag, apply, word, fmt, log = console.log, err = console.error }) {
  const rows = matchActive((await stripe.promotionCodes.list({ code: word, active: true, limit: 100 })).data, word);
  if (!rows.length) { err(`${tag} No active promotion code "${word}" found (any coupon).`); return 1; }
  const lines = reportLines(rows, fmt);
  for (const [i, p] of rows.entries()) {
    log(`${tag} ${apply ? 'deactivating' : 'would deactivate'}: ${lines[i]}`);
    if (apply) { const u = await stripe.promotionCodes.update(p.id, { active: false }); log(`${tag} DONE: ${u.code} ${u.id} active=${u.active}`); }
  }
  return 0;
}
