import type { Handler } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const DOMAIN = process.env.MAILGUN_DOMAIN ?? 'my4mlife.com';
const sm = new SecretsManagerClient({ region: REGION });

let cache: { key: string; addrs: Record<string, string> } | null = null;
async function secrets() {
  if (cache) return cache;
  const [k, a] = await Promise.all([
    sm.send(new GetSecretValueCommand({ SecretId: 'mailgun-api-key' })),
    sm.send(new GetSecretValueCommand({ SecretId: 'mailgun-email-addresses' })),
  ]);
  const keyJson = JSON.parse(k.SecretString!) as Record<string, string>;
  cache = { key: keyJson['mailgun-send-key'] ?? keyJson['api-key'] ?? Object.values(keyJson)[0], addrs: JSON.parse(a.SecretString!) };
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

type SendKind = 'verification' | 'info';
type SendPayload = { kind: SendKind; to: string; subject: string; html: string; text?: string };

async function send(p: SendPayload) {
  const { addrs } = await secrets();
  const addr = p.kind === 'verification' ? addrs['email-verification'] : addrs['email-info'];
  if (!addr) throw new Error(`no from address for kind=${p.kind}`);
  const id = await mailgun(`My4MLife <${addr}>`, p.to, p.subject, p.html, p.text);
  return { id };
}

const verifyHtml = (code: string) => `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px">
<h1 style="font-size:20px;color:#111">Verify your My4MLife account</h1>
<p>Your verification code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:4px;background:#f4f4f5;padding:16px;text-align:center;border-radius:8px">${code}</p>
<p style="color:#666;font-size:13px">Begin with the end in mind. — The My4MLife concierge</p></div>`;

export const handler: Handler = async (event: any) => {
  if (event?.triggerSource?.startsWith('CustomMessage_')) {
    event.response.emailSubject = 'Your My4MLife verification code';
    event.response.emailMessage = verifyHtml(event.request.codeParameter);
    return event;
  }
  if (event?.requestContext && typeof event?.body === 'string') {
    const out = await send(JSON.parse(event.body));
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(out) };
  }
  return send(event as SendPayload);
};
