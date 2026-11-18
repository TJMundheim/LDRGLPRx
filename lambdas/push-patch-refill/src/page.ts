import { STATES } from './address';
const ENT: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ENT[c]!);

export const page = (title: string, body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<meta name="robots" content="noindex"><title>${esc(title)}</title><style>body{font:16px/1.5 -apple-system,Segoe UI,sans-serif;` +
  `background:#f4f6f8;color:#1b2733;display:flex;justify-content:center;padding:32px 16px;margin:0}main{max-width:460px;width:100%;background:#fff;` +
  `padding:28px;border-radius:12px;box-sizing:border-box}h1{font-size:22px;margin-top:0}fieldset{border:0;padding:0;margin:18px 0}` +
  `legend{font-weight:700;margin-bottom:6px}label{display:block;padding:12px;border:1px solid #cfd8e0;border-radius:10px;margin:8px 0}` +
  `button{margin-top:12px;width:100%;padding:16px;border:0;border-radius:10px;background:#1b7f3b;color:#fff;font:700 18px Arial,sans-serif}` +
  `small{color:#5b6b7a}</style></head><body><main><h1>${esc(title)}</h1>${body}</main></body></html>`;

export const msg = (title: string, body = ''): string => page(title, body && `<p>${esc(body)}</p>`);

export const EXPIRED = msg('Link expired', 'This link has expired. Reply to your last email from us or write support@my4mlife.com.');

export interface Choice {
  blend: string; price?: string; fields: Record<string, string>; hasAuto: boolean;
  city?: string; state?: string; // city + state only of the address on file; never street/zip/name
  form?: Record<string, string>; error?: string; // POST re-render: keep the patient's answers
  // Manual-pharmacy Rx product (e.g. Gut-Brain Rx). needAddress = nothing on file, so the address is required.
  rx?: { intervalDays: number; needAddress: boolean };
}

const radio = (name: string, value: string, label: string, form: Record<string, string>, dflt = false) =>
  `<label><input type="radio" name="${name}" value="${value}"${form[name] === value || (!form[name] && dflt) ? ' checked' : ''} required> ${label}</label>`;
const input = (n: string, label: string, form: Record<string, string>, attrs = '') =>
  `<label>${label}<input name="${n}" value="${esc(form[n] ?? '')}" ${attrs} style="display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:10px;font-size:16px;border:1px solid #cfd8e0;border-radius:8px"></label>`;

const addressBlock = (form: Record<string, string>, required = false): string =>
  `<div id="addrbox">${required ? '' : '<p><small>Only fill this in if your address changed.</small></p>'}` +
  input('a_name', 'Full name', form, 'autocomplete="name" maxlength="100"' + (required ? ' required' : '')) + input('a_line1', 'Street address', form, 'autocomplete="address-line1" maxlength="100"' + (required ? ' required' : '')) +
  input('a_line2', 'Apt/suite (optional)', form, 'autocomplete="address-line2" maxlength="100"') + input('a_city', 'City', form, 'autocomplete="address-level2" maxlength="60"' + (required ? ' required' : '')) +
  `<label>State<select name="a_state"${required ? ' required' : ''} autocomplete="address-level1" style="display:block;width:100%;margin-top:4px;padding:10px;font-size:16px;border-radius:8px"><option value="">Select</option>` +
  STATES.map((s) => `<option${form['a_state'] === s ? ' selected' : ''}>${s}</option>`).join('') + `</select></label>` +
  input('a_zip', 'ZIP code', form, 'autocomplete="postal-code" inputmode="numeric" maxlength="10"' + (required ? ' required' : '')) + `</div>`;

// Hides the address block unless "Yes" is chosen; without JS the block stays visible.
const TOGGLE = `<script>(function(){var b=document.getElementById('addrbox'),r=document.querySelectorAll('input[name=addr]');` +
  `function s(){var y=document.querySelector('input[name=addr]:checked');b.style.display=y&&y.value==='yes'?'block':'none'}` +
  `for(var i=0;i<r.length;i++)r[i].addEventListener('change',s);s()})()</script>`;

export const choose = (a: Choice): string => {
  const rx = a.rx;
  const price = a.price ? ` (${esc(a.price)} per box)` : '';
  const f = a.form ?? {};
  const hidden = Object.entries(a.fields).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('');
  const where = a.city && a.state ? `the address on your last order in ${esc(a.city)}, ${esc(a.state)}` : 'the address on your last order';
  const err = a.error ? `<p role="alert" style="color:#b00020;font-weight:700">${esc(a.error)}</p>` : '';
  const health = `<fieldset><legend>Any changes to your health or medications since your last order?</legend>` + radio('change', 'no', 'No', f) + radio('change', 'yes', 'Yes', f) + `</fieldset>`;
  if (rx) {
    const line = `<p>${esc(a.blend)}${a.price ? ` · ${esc(a.price)} every ${rx.intervalDays} days` : ''}</p>`;
    const addr = rx.needAddress
      ? `<fieldset><legend>Where should we ship it?</legend>${addressBlock(f, true)}</fieldset>`
      : `<fieldset><legend>Has your shipping address changed since your last order?</legend>` + radio('addr', 'no', 'No', f) + `<p><small>We'll ship to ${where}.</small></p>` + radio('addr', 'yes', 'Yes', f) + addressBlock(f) + `</fieldset>`;
    return page(`Your next ${a.blend} fill`, err + line + `<form method="post" action="">${hidden}` +
      `<fieldset><legend>How would you like it?</legend>` +
      (a.hasAuto ? radio('mode', 'auto', `Auto-ship every ${rx.intervalDays} days (recommended)`, f, true) : '') +
      radio('mode', 'one', 'Just one fill', f, !a.hasAuto) + `</fieldset>` + health + addr +
      `<button type="submit">Continue to secure checkout</button></form><p><small>Cancel anytime: reply to any email from us.</small></p>${rx.needAddress ? '' : TOGGLE}`);
  }
  return page(`Your next ${a.blend} box`,
    err +
    `<p>One six-patch box${price}.</p><form method="post" action="">${hidden}` +
    `<fieldset><legend>How would you like it?</legend>` +
    (a.hasAuto ? radio('mode', 'auto', 'Auto-ship every 6 weeks (recommended)', f, true) : '') +
    radio('mode', 'one', 'Just one box', f, !a.hasAuto) + `</fieldset>` + health +
    `<fieldset><legend>Has your shipping address changed since your last order?</legend>` +
    radio('addr', 'no', 'No', f) + `<p><small>We'll ship to ${where}.</small></p>` + radio('addr', 'yes', 'Yes', f) + addressBlock(f) + `</fieldset>` +
    `<button type="submit">Continue to secure checkout</button></form><p><small>Cancel anytime: reply to any email from us.</small></p>${TOGGLE}`);
};
