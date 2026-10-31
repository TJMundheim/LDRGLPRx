// HTML for the partner e-sign pages. No frameworks, inline CSS (same look as consent-sign).
import { esc } from './agreement';

const CSS = `*{box-sizing:border-box}body{margin:0;background:#f6f7fa;color:#0f172a;font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:720px;margin:0 auto;padding:20px 16px 56px}
header{padding:8px 0 18px}.brand{font-size:22px;font-weight:700;letter-spacing:-.01em}.brand span{color:#7d6010}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:16px 0}
h1{font-size:22px;margin:0 0 6px}h2{font-size:18px;margin:14px 0 8px}h3{font-size:16px;margin:12px 0 4px}
p{margin:8px 0}ul,ol{margin:8px 0 8px 18px;padding:0}li{margin:4px 0}
.doc{max-height:420px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;padding:14px;background:#fbfcfe;font-size:14px}
.doc h1{font-size:19px}
.field{display:block;margin:10px 0}.field label{display:block;font-size:13px;color:#475569;margin-bottom:4px}
input[type=text]{width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:16px;background:#fff}
.check{display:flex;gap:10px;align-items:flex-start;margin:14px 0;font-size:15px}
.check input{margin-top:4px;width:20px;height:20px;flex:0 0 auto}
.legend{font-size:12px;color:#64748b;margin-top:4px}
.err{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:10px;margin:12px 0}
a.btn,button{display:block;width:100%;padding:14px;border:0;border-radius:10px;background:#7d6010;color:#fff;font-size:17px;font-weight:600;text-align:center;text-decoration:none;cursor:pointer}
@media(min-width:640px){a.btn,button{display:inline-block;width:auto;padding:14px 32px}}`;

export const page = (title: string, body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>${CSS}</style></head><body><div class="wrap">
<header><div class="brand">My<span>4M</span>Life</div></header>
${body}</div></body></html>`;

export const renderError = (title: string, msg: string) =>
  page(title, `<div class="card"><h1>${esc(title)}</h1><p>${esc(msg)}</p></div>`);

const field = (label: string, name: string, value: string, extra = '', hint = '') =>
  `<div class="field"><label>${label}</label><input type="text" name="${name}" value="${esc(value)}" ${extra}>${hint}</div>`;

export function renderForm(o: { docHtml: string; business: string; query: string; error?: string; legalName?: string; title?: string }): string {
  return page('Sign your partner agreement', `
<h1>Partner agreement</h1>
<p>Please read the agreement below, then sign at the bottom. &mdash; Dr. TJ</p>
<div class="card"><div class="doc">${o.docHtml}</div></div>
${o.error ? `<div class="err">${esc(o.error)}</div>` : ''}
<form method="post" action="?${esc(o.query)}"><div class="card">
${field('Your full legal name', 'legalName', o.legalName ?? '', 'autocomplete="name"')}
${field('Your title', 'title', o.title ?? '', 'autocomplete="organization-title"')}
${field('Business name', 'business', o.business, 'autocomplete="organization"')}
${field('Typed signature', 'typedSignature', '', 'autocomplete="off"', '<div class="legend">Type your full legal name again. It must match.</div>')}
<label class="check"><input type="checkbox" name="agree" value="on">
<span>I agree to sign electronically and that my typed name is my signature.</span></label>
<button type="submit">Sign the agreement</button></div></form>`);
}

const payout = (url?: string) => url
  ? `<p><a class="btn" href="${esc(url)}">Next: set up your payouts</a></p><p class="legend">Secure setup on Stripe: tax form (W-9) and bank details.</p>`
  : `<p>Next: set up your payouts. We'll email your secure payout setup link (Stripe) within one business day.</p>`;

export const renderSigned = (title: string, when: string, connectUrl?: string) =>
  page(title, `<div class="card"><h1>${esc(title)}</h1><p>Signed on ${esc(when)}. A copy was emailed to you.</p>${payout(connectUrl)}</div>`);
