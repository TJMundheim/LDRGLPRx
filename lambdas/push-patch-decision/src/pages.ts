// HTML pages returned to the physician after one tap. Titles/bodies are fixed strings (never user data).
export const page = (title: string, body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
  `<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">` +
  `<title>${title}</title><style>` +
  `body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f6f8;` +
  `font:16px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#1b2733}` +
  `main{max-width:420px;margin:16px;padding:32px 24px;background:#fff;border-radius:12px;` +
  `box-shadow:0 2px 12px rgba(0,0,0,.08);text-align:center}h1{font-size:22px;margin:0 0 8px}p{margin:0;color:#4a5a68}` +
  `</style></head><body><main><h1>${title}</h1><p>${body}</p></main></body></html>`;

export const pages = {
  approved: () => page('Approved', 'Welcome email sent and order forwarded.'),
  approvedMailFailed: () => page('Approved', 'The decision is recorded, but an email failed to send. Notify the coordinator.'),
  declined: () => page('Declined', 'Refund issued and the patient has been notified.'),
  declinedMailFailed: () => page('Declined', 'Refund issued, but the patient email failed to send. Notify the coordinator.'),
  decided: (state: string) => page('Already decided', `Current state: ${state.replace(/[^a-z-]/gi, '')}`),
  invalid: () => page('Link invalid', 'This link is not valid. Use the buttons in the original review email.'),
  error: () => page('Something went wrong', 'Nothing was changed. Try again, or contact the coordinator.'),
};
