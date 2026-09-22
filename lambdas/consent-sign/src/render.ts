// HTML for the hosted consent e-sign page. No frameworks, inline CSS, light theme.
import { NPP_HTML, PATIENT_AUTH_HTML, LEGAL_EFFECTIVE } from './legal';

export const TAGLINE = "Don't lose your identity and your dignity while you still have a choice.";
const DISCLOSE_TO = "My4MLife's contracted licensed telemedicine practice(s)";
export const ESIGN_LINE =
  'By typing your name below you consent to sign electronically under the federal E-SIGN Act, and agree your typed name is the legal equivalent of your handwritten signature.';

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]);

const CSS = `*{box-sizing:border-box}body{margin:0;background:#f6f7fa;color:#0f172a;font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:720px;margin:0 auto;padding:20px 16px 56px}
header{padding:8px 0 18px}.brand{font-size:22px;font-weight:700;letter-spacing:-.01em}.brand span{color:#7d6010}
.tag{font-size:13px;color:#475569;margin-top:6px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:16px 0}
h1{font-size:22px;margin:0 0 6px}h2{font-size:18px;margin:0 0 10px}h4{font-size:14px;margin:14px 0 4px}
p{margin:8px 0}ul{margin:8px 0 8px 18px;padding:0}li{margin:4px 0}
.doc{max-height:320px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;padding:14px;background:#fbfcfe;font-size:14px}
.field{display:block;margin:10px 0}.field label{display:block;font-size:13px;color:#475569;margin-bottom:4px}
input[type=text],input[readonly]{width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:16px;background:#fff}
input[readonly]{background:#f1f5f9;color:#475569}
.check{display:flex;gap:10px;align-items:flex-start;margin:14px 0;font-size:15px}
.check input{margin-top:4px;width:20px;height:20px;flex:0 0 auto}
.legend{font-size:12px;color:#64748b;margin-top:4px}
.err{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:10px;margin:12px 0}
button{width:100%;padding:14px;border:0;border-radius:10px;background:#7d6010;color:#fff;font-size:17px;font-weight:600;cursor:pointer}
@media(min-width:640px){button{width:auto;padding:14px 32px}}`;

export const page = (title: string, body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>${CSS}</style></head><body><div class="wrap">
<header><div class="brand">My<span>4M</span>Life</div><div class="tag">${TAGLINE}</div></header>
${body}</div></body></html>`;

const identity = (name: string, email: string) =>
  `<div class="field"><label>Patient name</label><input readonly value="${esc(name)}"></div>
<div class="field"><label>Email</label><input readonly value="${esc(email)}"></div>`;

export function renderForm(opts: {
  name: string; email: string; query: string; error?: string; typedName?: string;
}): string {
  return page('Sign your privacy notice and authorization', `
<h1>Two documents to sign</h1>
<p>Before your telemedicine visit, please review and sign the two documents below. Effective ${esc(LEGAL_EFFECTIVE)}.</p>
${opts.error ? `<div class="err">${esc(opts.error)}</div>` : ''}
<form method="post" action="?${esc(opts.query)}">
<div class="card">${identity(opts.name, opts.email)}</div>
<div class="card"><h2>Document 1 — Notice of Privacy Practices</h2>
<div class="doc">${NPP_HTML}</div>
<label class="check"><input type="checkbox" name="nppAck" value="on">
<span>I acknowledge I have received and read the Notice of Privacy Practices.</span></label></div>
<div class="card"><h2>Document 2 — Authorization for Use and Disclosure of PHI</h2>
<p><strong>Section 1 — Patient:</strong> ${esc(opts.name)} &middot; ${esc(opts.email)}</p>
<p><strong>Section 2 — Disclose to:</strong> ${esc(DISCLOSE_TO)}</p>
<div class="doc">${PATIENT_AUTH_HTML}</div>
<label class="check"><input type="checkbox" name="phiAuth" value="on">
<span>I authorize My4MLife to use and disclose my protected health information to ${esc(DISCLOSE_TO)} as described above.</span></label>
<div class="field"><label>Electronic signature</label>
<input type="text" name="typedName" autocomplete="name" value="${esc(opts.typedName ?? '')}">
<div class="legend">Type your full legal name — this is your electronic signature.</div></div>
<p class="legend">${ESIGN_LINE}</p>
<button type="submit">Sign both documents</button></div></form>`);
}

export const renderAlready = (at: string) =>
  page('Already signed', `<div class="card"><h1>Already signed on ${esc(at)}</h1>
<p>Nothing further is needed. A copy was emailed to you.</p></div>`);

export const renderSuccess = () =>
  page('Signed', `<div class="card"><h1>Signed.</h1>
<p>Your care coordinator will confirm your visit.</p>
<p>A copy of both signed documents has been emailed to you.</p></div>`);

export const renderError = (status: string, msg: string) =>
  page(status, `<div class="card"><h1>${esc(status)}</h1><p>${esc(msg)}</p></div>`);

export const copyEmailHtml = (name: string, typedName: string, at: string) =>
  `<p>Hello ${esc(name)},</p><p>Here is your signed copy. Effective ${esc(LEGAL_EFFECTIVE)}.</p>
<h2>Notice of Privacy Practices</h2>${NPP_HTML}
<h2>Authorization for Use and Disclosure of PHI</h2>
<p><strong>Disclose to:</strong> ${esc(DISCLOSE_TO)}</p>${PATIENT_AUTH_HTML}
<h2>Signature</h2><p>Electronically signed by <strong>${esc(typedName)}</strong> on ${esc(at)}.</p>
<p>${ESIGN_LINE}</p><p>${TAGLINE}</p>`;
