import type { Handler } from 'aws-lambda';
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

async function mailgun(from: string, to: string, subject: string, html: string, text?: string) {
  const { key } = await secrets();
  const form = new URLSearchParams({ from, to, subject, html, ...(text ? { text } : {}) });
  const auth = Buffer.from(`api:${key}`).toString('base64');
  const res = await fetch(`https://api.mailgun.net/v3/${DOMAIN}/messages`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!res.ok) throw new Error(`mailgun ${res.status} ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]);
const formHtml = (formId: string, fields: Record<string, unknown>) => {
  const rows = Object.entries(fields).map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:600;color:#555;border-bottom:1px solid #eee">${esc(k)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${esc(v)}</td></tr>`).join('');
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px"><h2 style="font-size:18px;color:#111">Form submission: ${esc(formId)}</h2><table style="border-collapse:collapse;width:100%">${rows}</table></div>`;
};
const verifyHtml = (code: string) => `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px">
<h1 style="font-size:20px;color:#111">Verify your My4MLife account</h1>
<p>Your verification code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:4px;background:#f4f4f5;padding:16px;text-align:center;border-radius:8px">${code}</p>
<p style="color:#666;font-size:13px">Begin with the end in mind. — The My4MLife concierge</p></div>`;

// Customer-facing confirmation email, tailored by form type. Closes the loop so a
// prospect who just submitted (and saved a card) gets an instant acknowledgment
// instead of silence until a coordinator manually replies.
const CONFIRM_FROM_KEY = 'email-info';
const NO_CONFIRM = new Set(['public-assessment']); // already receives the audit-complete welcome email
const CUST_EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
function confirmation(formId: string): { subject: string; html: string } {
  const wrap = (heading: string, body: string) => `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:28px">
    <h1 style="font-size:20px;color:#1A2E1E;margin:0 0 12px">${heading}</h1>
    ${body}
    <p style="color:#5A8A64;font-size:13px;margin-top:22px">Begin with the end in mind.<br>— The My4MLife care team</p>
    <p style="color:#999;font-size:12px;margin-top:14px">Questions? Reply to this email or contact <a href="mailto:support@my4mlife.com">support@my4mlife.com</a>.</p>
  </div>`;
  if (formId.endsWith('-questionnaire')) {
    return {
      subject: "We've got your intake — My4MLife",
      html: wrap('Your intake is in.',
        `<p style="color:#1A2E1E;font-size:15px;line-height:1.6"><strong>No charge has been made.</strong> A care coordinator will email you within 24 hours to confirm the next steps with our network physician.</p>
         <p style="color:#3A6A44;font-size:14px;line-height:1.6">Your card is saved securely and is only ever charged after a physician reviews your case, writes your script, and you approve it. If you're not approved, you're never charged.</p>`),
    };
  }
  if (formId === 'consult-intake') {
    return {
      subject: "We've got your request — My4MLife",
      html: wrap('Request received.',
        `<p style="color:#1A2E1E;font-size:15px;line-height:1.6">Thank you — we've received your request. A care coordinator will email you within 24 hours to confirm next steps and schedule your consult.</p>`),
    };
  }
  return {
    subject: "We've received your message — My4MLife",
    html: wrap('Thanks for reaching out.',
      `<p style="color:#1A2E1E;font-size:15px;line-height:1.6">We've received your message and a member of our team will be in touch shortly.</p>`),
  };
}

type SendPayload =
  | { kind: 'verification' | 'info'; to: string; subject: string; html: string; text?: string }
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
        const c = confirmation(p.formId);
        confirmId = await mailgun(`My4MLife <${addrs[CONFIRM_FROM_KEY]}>`, custEmail, c.subject, c.html);
      } catch (e) {
        console.error('[email-sender] customer confirmation failed (lead notification already sent):', e);
      }
    }
    return { id, confirmId };
  }
  const addr = p.kind === 'verification' ? addrs['email-verification'] : addrs['email-info'];
  if (!addr) throw new Error(`no from address for kind=${p.kind}`);
  const id = await mailgun(`My4MLife <${addr}>`, p.to, p.subject, p.html, p.text);
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
      const out = await send(JSON.parse(event.body));
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(out) };
    } catch (e: any) {
      return { statusCode: 400, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: e.message }) };
    }
  }
  return send(event as SendPayload);
};
