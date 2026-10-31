// `statements --month YYYY-MM [--send]`: one email per partner. Partners never see client identities:
// only date, blend, order-id suffix and commission. Preview by default; --send uses my4mlife-email-sender.
import { createRequire } from 'node:module';
import { loadPartners, loadMonthSessions, monthRows, partnerCents, loadBlendNames } from './push-patch-partner-month.mjs';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const usd = (c) => `$${(c / 100).toFixed(2)}`;
const label = (month) => new Date(`${month}-15T12:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function renderStatement(partner, rows, month) {
  const biz = partner.metadata?.business ?? partner.code, total = usd(partnerCents(rows)), m = label(month);
  const lines = rows.map((r) => `${r.date}  ${r.blend}  order ...${r.orderRef}  ${usd(r.cents)}`);
  const text = [`Push Patch partner statement - ${m}`, `${biz} (code ${partner.code})`, '', ...(lines.length ? lines : ['No paid orders this month.']), '', `Total commission: ${total}`, 'Payment by the 15th via Stripe.', '', 'Dr. TJ'].join('\n');
  const tr = rows.map((r) => `<tr><td>${esc(r.date)}</td><td>${esc(r.blend)}</td><td>...${esc(r.orderRef)}</td><td align="right">${usd(r.cents)}</td></tr>`).join('');
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;max-width:560px"><h2 style="font-size:18px">Push Patch partner statement - ${esc(m)}</h2><p>${esc(biz)} (code ${esc(partner.code)})</p><table cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th align="left">Date</th><th align="left">Blend</th><th align="left">Order</th><th align="right">Commission</th></tr>${tr || '<tr><td colspan="4">No paid orders this month.</td></tr>'}</table><p><b>Total commission: ${total}</b></p><p>Payment by the 15th via Stripe.</p><p>Dr. TJ</p></div>`;
  return { to: partner.metadata?.email, subject: `Push Patch partner statement - ${m} - ${biz}`, html, text, totalCents: partnerCents(rows) };
}

async function sendEmail(s) {
  const { LambdaClient, InvokeCommand } = createRequire(new URL('../../lambdas/coordinator-brief/package.json', import.meta.url))('@aws-sdk/client-lambda');
  const payload = { kind: 'info', from: 'drtj', to: s.to, subject: s.subject, html: s.html, text: s.text };
  const res = await new LambdaClient({ region: 'us-east-2' }).send(new InvokeCommand({ FunctionName: 'my4mlife-email-sender', Payload: Buffer.from(JSON.stringify(payload)) }));
  const body = JSON.parse(Buffer.from(res.Payload ?? []).toString() || '{}');
  if (res.FunctionError) throw new Error(`email-sender error for ${s.to}: ${JSON.stringify(body).slice(0, 200)}`);
  return body.id ?? '?';
}

export async function runStatements({ stripe, tag, flagVal, has, die, root }) {
  const month = flagVal('--month');
  if (!month) die('Usage: statements --month YYYY-MM [--send] [--mode live|test]');
  const [partners, sessions] = await Promise.all([loadPartners(stripe), loadMonthSessions(stripe, month)]);
  const names = loadBlendNames(root);
  console.log(`${tag} partner statements for ${month} (${has('--send') ? 'SENDING' : 'preview only; add --send to email'})`);
  if (!partners.length) console.log('(no partner codes yet)');
  for (const p of partners) {
    const s = renderStatement(p, monthRows(p, sessions, names), month);
    console.log(`\n--- ${p.code} -> ${s.to ?? '(no email on file)'} | ${s.subject}\n${s.text}`);
    if (!has('--send')) continue;
    if (!s.to) { console.log(`SKIPPED ${p.code}: no metadata.email`); continue; }
    if (!s.totalCents) { console.log(`SKIPPED ${p.code}: no orders this month`); continue; }
    console.log(`SENT ${p.code} to ${s.to} id=${await sendEmail(s)}`);
  }
}
