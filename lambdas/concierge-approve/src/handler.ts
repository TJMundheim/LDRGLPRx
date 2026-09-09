// Lambda function URL (payload format v2) handler for the "Approve & send"
// link in TJ's concierge draft notification.
import { verifyToken } from './token';
import { getDraft, sendApprovedReply, markSentAndLog } from './send';

const APPROVE_SECRET = process.env.APPROVE_SECRET ?? '';

interface FnUrlEvent { queryStringParameters?: Record<string, string> }
interface FnUrlResult { statusCode: number; headers: Record<string, string>; body: string }

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]);

const page = (title: string, body: string): string => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:60px auto;padding:0 20px;color:#1A2E1E}
.box{border:1px solid #ddd;border-radius:8px;padding:16px;white-space:pre-wrap;margin-top:16px;background:#fafafa}</style>
</head><body><h1>${title}</h1>${body}</body></html>`;

const html = (statusCode: number, body: string): FnUrlResult => ({ statusCode, headers: { 'content-type': 'text/html' }, body });

export const handler = async (event: FnUrlEvent): Promise<FnUrlResult> => {
  const c = event.queryStringParameters?.c ?? '';
  const s = event.queryStringParameters?.s ?? '';
  const t = event.queryStringParameters?.t ?? '';

  if (!c || !s || !t || !verifyToken(APPROVE_SECRET, c, s, t)) {
    return html(403, page('Not authorized', '<p>This link is invalid or has expired.</p>'));
  }

  const item = await getDraft(c, s);
  if (!item) {
    return html(404, page('Not found', '<p>This draft no longer exists.</p>'));
  }
  if (item.status === 'sent') {
    return html(200, page('Already sent', `<p>Already sent on ${esc(item.sentAt ?? 'an earlier visit')}.</p><div class="box">${esc(item.body)}</div>`));
  }

  const sentMessageId = await sendApprovedReply(item);
  const applied = await markSentAndLog(item, sentMessageId);
  if (!applied) {
    return html(200, page('Already sent', `<p>Already sent to ${esc(item.toEmail)}.</p><div class="box">${esc(item.body)}</div>`));
  }

  return html(200, page('Sent', `<p>Sent to ${esc(item.toEmail)} ✓</p><div class="box">${esc(item.body)}</div>`));
};
