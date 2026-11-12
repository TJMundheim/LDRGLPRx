const ENT: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ENT[c]!);

export const page = (title: string, body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<meta name="robots" content="noindex"><title>${esc(title)}</title><style>body{font:16px/1.5 -apple-system,Segoe UI,sans-serif;` +
  `background:#f4f6f8;color:#1b2733;display:flex;justify-content:center;padding:40px 16px}main{max-width:420px;background:#fff;padding:28px;` +
  `border-radius:12px;text-align:center}button{margin-top:16px;width:100%;padding:16px;border:0;border-radius:10px;background:#1b7f3b;` +
  `color:#fff;font:700 18px Arial,sans-serif}</style></head><body><main><h1>${esc(title)}</h1>${body}</main></body></html>`;

export const confirm = (who: string, fields: Record<string, string>, tracking: string): string =>
  page('Send tracking?', `<p>Send tracking ${esc(tracking)} to ${esc(who)}?</p><form method="post" action="">` +
    Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('') +
    `<button type="submit">Send the on-its-way email</button></form>`);

export const msg = (title: string, body = ''): string => page(title, body && `<p>${esc(body)}</p>`);
