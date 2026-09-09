// Builds and sends TJ's approve-draft notification, and exposes the generic
// email-sender invoke used for both that notification and the auto-send path.
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { approveToken } from './token';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';
const NOTIFY_TO = process.env.NOTIFY_TO ?? 'drtj@my4mlife.com';
const APPROVE_URL = process.env.APPROVE_URL ?? '';
const APPROVE_SECRET = process.env.APPROVE_SECRET ?? '';

const lambda = new LambdaClient({ region: REGION });
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]);

export async function sendMail(to: string, subject: string, html: string, text?: string): Promise<void> {
  await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ kind: 'info', to, subject, html, text })),
  }));
}

export interface NotifyParams {
  contactId: string; sk: string; category: string; confidence: number; escalate: boolean;
  isProspect: boolean; internalNote: string; memberEmail: string; originalSubject: string;
  originalBody: string; draftReply: string;
}

export async function notifyTJ(p: NotifyParams): Promise<void> {
  const prefix = p.escalate ? '[ESCALATE][Concierge draft]' : '[Concierge draft]';
  const subject = `${prefix} ${p.category} — ${p.memberEmail} — ${p.originalSubject}`;
  const token = approveToken(APPROVE_SECRET, p.contactId, p.sk);
  const link = `${APPROVE_URL}?c=${encodeURIComponent(p.contactId)}&s=${encodeURIComponent(p.sk)}&t=${token}`;

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto">
      <p style="font-size:13px;color:#555">Category: <strong>${esc(p.category)}</strong> &middot; Confidence: ${Math.round(p.confidence * 100)}%${p.isProspect ? ' &middot; <strong>Prospect (no member record)</strong>' : ''}</p>
      ${p.internalNote ? `<p style="font-size:13px;color:#900;background:#fff4f4;padding:8px;border-radius:6px">${esc(p.internalNote)}</p>` : ''}
      <p style="font-size:12px;color:#888;text-transform:uppercase">Member's message</p>
      <blockquote style="border-left:3px solid #ccc;margin:0;padding:8px 14px;color:#333;white-space:pre-wrap">${esc(p.originalBody)}</blockquote>
      <p style="font-size:12px;color:#888;text-transform:uppercase;margin-top:16px">Draft reply</p>
      <div style="border:1px solid #ddd;border-radius:8px;padding:14px;white-space:pre-wrap">${esc(p.draftReply)}</div>
      <p style="text-align:center;margin:24px 0">
        <a href="${link}" style="background:#1A2E1E;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600">Approve &amp; send</a>
      </p>
      <p style="font-size:12px;color:#888">To change it: reply to the member yourself from Gmail (their email is already in your inbox). Unapproved drafts expire on their own.</p>
    </div>`;
  const text = `${p.category} (${Math.round(p.confidence * 100)}%)${p.isProspect ? ' — prospect' : ''}\n${p.internalNote ? p.internalNote + '\n' : ''}\nMember's message:\n${p.originalBody}\n\nDraft reply:\n${p.draftReply}\n\nApprove & send: ${link}\n\nTo change it: reply to the member yourself from Gmail. Unapproved drafts expire on their own.`;

  await sendMail(NOTIFY_TO, subject, html, text);
}
