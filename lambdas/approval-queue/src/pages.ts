// HTML pages for the approve/deny flow. Titles/bodies are fixed strings (the only dynamic
// values are an ISO timestamp from DDB and the base64url token, both sanitized).
export const page = (title: string, body: string, color = '#111'): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
  `<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">` +
  `<title>${title}</title></head>` +
  `<body style="font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;padding:24px;text-align:center">` +
  `<h1 style="color:${color};font-size:24px">${title}</h1><p style="color:#555">${body}</p></body></html>`;

// Step 1 of 2: GET renders this; only the form POST acts.
const confirm = (action: 'approve' | 'deny', token: string): string => {
  const t = token.replace(/[^A-Za-z0-9_-]/g, '');
  const [label, bg] = action === 'approve' ? ['Confirm approve', '#16a34a'] : ['Confirm deny', '#dc2626'];
  return page(action === 'approve' ? 'Approve this action?' : 'Deny this action?',
    `Tap below to record your decision.</p><form method="post" action=""><input type="hidden" name="token" value="${t}">` +
    `<button type="submit" style="margin-top:20px;width:100%;padding:18px 16px;border:0;border-radius:10px;` +
    `color:#fff;background:${bg};font:700 19px system-ui,sans-serif;cursor:pointer">${label}</button></form><p>`);
};

const when = (iso: string) => iso.replace(/[^0-9TZ:.-]/g, '') || 'an earlier time';

export const pages = {
  confirm,
  missing: () => page('Missing Token', 'No token provided.'),
  invalid: () => page('Invalid Token', 'This link is invalid or has been tampered with.', '#dc2626'),
  notFound: () => page('Not Found', 'Approval request not found.'),
  expired: () => page('Link Expired', 'This approval link has expired. Nothing was changed.', '#dc2626'),
  already: (status: string, at: string) => status === 'approved'
    ? page('Already approved', `This approval was already approved at ${when(at)}.`, '#16a34a')
    : page('Already denied', `This approval was already denied at ${when(at)}.`, '#dc2626'),
  raced: () => page('Already decided', 'This approval was decided by another click. Nothing else was changed.'),
  approved: () => page('&#x2705; Approved', 'The agent will continue with this action.', '#16a34a'),
  denied: () => page('&#x274C; Denied', 'The agent will not proceed.', '#dc2626'),
};
