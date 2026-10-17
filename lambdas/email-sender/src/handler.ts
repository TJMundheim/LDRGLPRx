import type { Handler } from 'aws-lambda';
import { mailgunSend, type Attachment } from './mailgun';
import { formHtml, verifyHtml, confirmation, CONFIRM_FROM_KEY, NO_CONFIRM, CUST_EMAIL_RE } from './templates';
import { composeCoachingConfirmation } from './coaching-confirmation';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const DOMAIN = process.env.MAILGUN_DOMAIN ?? 'my4mlife.com';
const sm = new SecretsManagerClient({ region: REGION });

type Cache = { key: string; addrs: Record<string, string>; recipients: Record<string, string> };
let cache: Cache | null = null;
async function secrets(): Promise<Cache> {
  if (cache) return cache;
  const [k, a, r] = await Promise.all([
    sm.send(new GetSecretValueCommand({ SecretId: 'mailgun-api-key' })),
    sm.send(new GetSecretValueCommand({ SecretId: 'mailgun-email-addresses' })),
    sm.send(new GetSecretValueCommand({ SecretId: 'form-recipients' })),
  ]);
  const keyJson = JSON.parse(k.SecretString!) as Record<string, string>;
  cache = {
    key: keyJson['mailgun-send-key'] ?? keyJson['api-key'] ?? Object.values(keyJson)[0],
    addrs: JSON.parse(a.SecretString!),
    recipients: JSON.parse(r.SecretString!),
  };
  return cache;
}

const SUPPORT_ADDR = 'support@my4mlife.com';
// Personal notes from TJ (friends-and-family sends): allowlisted 'drtj' identity, replies to drtj@.
const DRTJ_ADDR = 'drtj@my4mlife.com';
const DRTJ_FROM = `Dr. TJ <${DRTJ_ADDR}>`;
const SUPPORT_FROM = `My4MLife Support <${SUPPORT_ADDR}>`;

async function mailgun(from: string, to: string, subject: string, html: string, text?: string, cc?: string, attachments?: Attachment[], replyTo?: string) {
  const { key } = await secrets();
  return mailgunSend({ key, domain: DOMAIN, from, to, subject, html, text, cc, attachments, replyTo });
}

type SendPayload =
  | { kind: 'verification' | 'info'; to: string; subject: string; html: string; text?: string; cc?: string; attachments?: Attachment[]; from?: unknown }
  | { kind: 'form'; formId: string; fields: Record<string, unknown> };

async function send(p: SendPayload) {
  const { addrs, recipients } = await secrets();
  if (p.kind === 'form') {
    const to = recipients['default'];
    if (!to) throw new Error('no default form recipient');
    const custEmail = typeof (p.fields as any)?.email === 'string' ? (p.fields as any).email.trim() : '';
    const fromEmail = custEmail ? ` from ${custEmail}` : '';
    // 1) Internal lead notification (critical path).
    const id = await mailgun(`My4MLife <${addrs['email-info']}>`, to, `[Form: ${p.formId}]${fromEmail}`, formHtml(p.formId, p.fields));
    // 2) Customer confirmation (best-effort — must never break the lead notification).
    let confirmId: string | undefined;
    if (custEmail && CUST_EMAIL_RE.test(custEmail) && !NO_CONFIRM.has(p.formId)) {
      try {
        if (p.formId === 'coaching-application') {
          const c = composeCoachingConfirmation(p.fields);
          confirmId = await mailgun(DRTJ_FROM, custEmail, c.subject, c.html, c.text, undefined, undefined, DRTJ_ADDR);
        } else {
          const c = confirmation(p.formId);
          confirmId = await mailgun(`My4MLife <${addrs[CONFIRM_FROM_KEY]}>`, custEmail, c.subject, c.html);
        }
      } catch (e) {
        console.error('[email-sender] customer confirmation failed (lead notification already sent):', e);
      }
    }
    return { id, confirmId };
  }
  const addr = p.kind === 'verification' ? addrs['email-verification'] : addrs['email-info'];
  if (!addr) throw new Error(`no from address for kind=${p.kind}`);
  // Allowlist: only the literals 'support' / 'drtj' on kind 'info' switch identity; anything else is ignored.
  const ident = p.kind === 'info' && p.from === 'support' ? { from: SUPPORT_FROM, reply: SUPPORT_ADDR }
    : p.kind === 'info' && p.from === 'drtj' ? { from: DRTJ_FROM, reply: DRTJ_ADDR } : null;
  const id = await mailgun(ident ? ident.from : `My4MLife <${addr}>`, p.to, p.subject, p.html, p.text, p.cc, p.kind === 'info' ? p.attachments : undefined, ident ? ident.reply : undefined);
  return { id };
}

export const handler: Handler = async (event: any) => {
  if (event?.triggerSource?.startsWith('CustomMessage_')) {
    event.response.emailSubject = 'Your My4MLife verification code';
    event.response.emailMessage = verifyHtml(event.request.codeParameter);
    return event;
  }
  if (event?.requestContext && typeof event?.body === 'string') {
    try {
      // Public route (POST /api/contact-form): form submissions only. 'info'/'verification' (arbitrary
      // to/subject/html/attachments/support@ identity) are Lambda-invoke only, never an open relay.
      const p = JSON.parse(event.body);
      if (p?.kind !== 'form') throw new Error('only form submissions are accepted');
      const out = await send(p);
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(out) };
    } catch (e: any) {
      return { statusCode: 400, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: e.message }) };
    }
  }
  return send(event as SendPayload);
};
