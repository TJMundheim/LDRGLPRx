// HTML pages returned to the physician after one tap. Titles/bodies are fixed strings (never user data).
export const page = (title: string, body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
  `<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">` +
  `<title>${title}</title><style>` +
  `body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f6f8;` +
  `font:16px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#1b2733}` +
  `main{max-width:420px;margin:16px;padding:32px 24px;background:#fff;border-radius:12px;` +
  `box-shadow:0 2px 12px rgba(0,0,0,.08);text-align:center}h1{font-size:22px;margin:0 0 8px}p{margin:0;color:#4a5a68}` +
  `button{margin-top:20px;width:100%;padding:18px 16px;border:0;border-radius:10px;color:#fff;font:700 19px Arial,sans-serif;cursor:pointer}` +
  `</style></head><body><main><h1>${title}</h1><p>${body}</p></main></body></html>`;

// Step 1 of 2: GET renders this; only the form POST acts. The token is base64url but is escaped anyway.
const confirm = (action: 'approve' | 'decline', token: string): string => {
  const t = token.replace(/[^A-Za-z0-9_-]/g, '');
  const [label, bg, note] = action === 'approve'
    ? ['Confirm approve', '#1b7f3b', 'Approving sends the patient the welcome email and forwards the order.']
    : ['Confirm decline', '#b00020', 'Declining queues a refund for admin approval and sends the patient the not-cleared email. Nothing is sent to the pharmacy.'];
  return page(action === 'approve' ? 'Approve this order?' : 'Decline this order?',
    `${note}</p><form method="post" action=""><input type="hidden" name="t" value="${t}">` +
    `<button type="submit" style="background:${bg}">${label}</button></form><p>`);
};

export const pages = {
  confirm,
  approved: () => page('Approved', 'Welcome email sent and order forwarded.'),
  approvedMailFailed: () => page('Approved', 'The decision is recorded, but an email failed to send. Notify the coordinator.'),
  declined: () => page('Declined', 'A refund is queued for admin approval.'),
  declinedMailFailed: () => page('Declined', 'A refund is queued for admin approval, but the patient email failed to send. Notify the coordinator.'),
  decided: (state: string) => page('Already decided', `Current state: ${state.replace(/[^a-z-]/gi, '')}`),
  invalid: () => page('Link invalid', 'This link is not valid. Use the buttons in the original review email.'),
  error: () => page('Something went wrong', 'Nothing was changed. Try again, or contact the coordinator.'),
};
