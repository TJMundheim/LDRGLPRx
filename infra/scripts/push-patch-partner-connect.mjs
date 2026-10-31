// Stripe Connect (Express) for partner payouts: `connect-onboard <CODE>` and `payouts --month --pay`.
// Dry run unless --apply. Exit 3 with a clear message when Connect is not enabled on the platform.
import { loadPartners, loadMonthSessions, monthRows, partnerCents, loadBlendNames } from './push-patch-partner-month.mjs';

export const isConnectDisabled = (e) => /signed up for Connect|not enabled for Connect|Connect is not enabled/i.test(e?.message ?? '');
export const CONNECT_OFF = 'Stripe Connect is not enabled on this account yet — TJ: Stripe Dashboard → Connect → Get started';
const guard = async (fn) => { try { return await fn(); } catch (e) { if (isConnectDisabled(e)) { console.error(CONNECT_OFF); process.exit(3); } throw e; } };
const LINK = (type) => ({ refresh_url: 'https://my4mlife.com/partners?onboard=refresh', return_url: 'https://my4mlife.com/partners?onboard=done', type });

export function transferParams(partner, destination, amount, month) {
  return {
    params: { amount, currency: 'usd', destination, description: `Push Patch partner commissions ${month} (${partner.code})`, metadata: { code: partner.code, month } },
    opts: { idempotencyKey: `${partner.code}-${month}` },
  };
}

export async function runOnboard({ stripe, tag, apply, argv, die }) {
  const code = (argv[1] ?? '').toUpperCase();
  if (!code || code.startsWith('--')) die('Usage: connect-onboard <CODE> [--mode live|test] [--apply]');
  const p = (await loadPartners(stripe, code))[0];
  if (!p) {
    if (apply) die(`${tag} REFUSED: no partner code ${code}.`);
    console.log(`${tag} NOTE: no partner code ${code} in this mode; --apply would refuse. Create it first with "partner".`);
    return;
  }
  const existing = p.metadata?.connectAccountId;
  const acct = { type: 'express', country: 'US', email: p.metadata?.email, capabilities: { transfers: { requested: true } }, business_profile: { name: p.metadata?.business }, metadata: { code, promotionCodeId: p.id } };
  if (!apply) { console.log(`${tag} WOULD ${existing ? `reuse account ${existing}` : `create Express account:\n${JSON.stringify(acct, null, 2)}`}\nthen create an account_onboarding link and save connectAccountId + connectOnboardingUrl on ${p.id}`); return; }
  const id = existing ?? (await guard(() => stripe.accounts.create(acct))).id;
  const link = await guard(() => stripe.accountLinks.create({ account: id, ...LINK('account_onboarding') }));
  await stripe.promotionCodes.update(p.id, { metadata: { connectAccountId: id, connectOnboardingUrl: link.url } });
  console.log(`${tag} ${code}: account ${id}\nOnboarding URL (short-lived): ${link.url}`);
}

async function alreadyPaid(stripe, destination, code, month) {
  for await (const t of stripe.transfers.list({ destination, limit: 100 })) if (t.metadata?.code === code && t.metadata?.month === month) return t;
}

export async function runPay({ stripe, tag, apply, flagVal, die, root, usd }) {
  const month = flagVal('--month');
  if (!month) die('Usage: payouts --month YYYY-MM --pay [--apply] [--mode live|test]');
  const [partners, sessions] = await Promise.all([loadPartners(stripe), loadMonthSessions(stripe, month)]);
  const names = loadBlendNames(root), skipped = [];
  console.log(`${tag} partner transfers for ${month}`);
  for (const p of partners) {
    const amount = partnerCents(monthRows(p, sessions, names)), dest = p.metadata?.connectAccountId;
    if (!amount) continue;
    if (!dest) { skipped.push(`${p.code} (${usd(amount)} owed, no Connect account)`); continue; }
    if (await alreadyPaid(stripe, dest, p.code, month)) { console.log(`${p.code}: already transferred for ${month}, skipping`); continue; }
    const { params, opts } = transferParams(p, dest, amount, month);
    if (!apply) { console.log(`WOULD transfer ${usd(amount)} to ${dest} for ${p.code}`); continue; }
    const t = await guard(() => stripe.transfers.create(params, opts));
    console.log(`TRANSFERRED ${usd(amount)} to ${dest} for ${p.code}: ${t.id}`);
  }
  console.log(skipped.length ? `Not paid (onboard first): ${skipped.join('; ')}` : 'All owed partners have Connect accounts.');
}
