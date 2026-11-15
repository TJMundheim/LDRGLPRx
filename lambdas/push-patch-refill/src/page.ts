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

export interface Choice { blend: string; price?: string; fields: Record<string, string>; hasAuto: boolean }

export const choose = (a: Choice): string => {
  const price = a.price ? ` (${esc(a.price)} per box)` : '';
  const hidden = Object.entries(a.fields).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('');
  return page(`Your next ${a.blend} box`,
    `<p>One six-patch box${price}. It ships to the address on your last order.</p><form method="post" action="">${hidden}` +
    `<fieldset><legend>How would you like it?</legend>` +
    (a.hasAuto ? `<label><input type="radio" name="mode" value="auto" checked required> Auto-ship every 6 weeks (recommended)</label>` : '') +
    `<label><input type="radio" name="mode" value="one"${a.hasAuto ? '' : ' checked'} required> Just one box</label></fieldset>` +
    `<fieldset><legend>Any changes to your health or medications since your last order?</legend>` +
    `<label><input type="radio" name="change" value="no" required> No</label>` +
    `<label><input type="radio" name="change" value="yes" required> Yes</label></fieldset>` +
    `<button type="submit">Continue to secure checkout</button></form><p><small>Cancel anytime: reply to any email from us.</small></p>`);
};
