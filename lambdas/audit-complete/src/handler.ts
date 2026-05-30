import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { v5 as uuidv5 } from 'uuid';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';
export const NAMESPACE = 'f0e1d2c3-b4a5-4968-87a6-95c4d3e2f1a0';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const sqs = new SQSClient({ region: REGION });
const lambda = new LambdaClient({ region: REGION });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reply(s: number, b: unknown): APIGatewayProxyResultV2 {
  return { statusCode: s, headers: CORS, body: JSON.stringify(b) };
}

function buildResultsHtml(firstName: string, email: string, phone: string, top3: any[], intakeAnswers: Record<string, number>): string {
  const safe = (s: string) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));
  const items = top3.map((t: any, i: number) => {
    const label = safe(t?.label || t?.id || 'Priority ' + (i + 1));
    return `<li style="margin:8px 0"><strong>#${i + 1}.</strong> ${label}</li>`;
  }).join('');
  const top3B64 = Buffer.from(JSON.stringify(top3)).toString('base64');
  const answersB64 = Buffer.from(JSON.stringify(intakeAnswers ?? {})).toString('base64');
  const qs = `?name=${encodeURIComponent(firstName)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&top3=${encodeURIComponent(top3B64)}&answers=${encodeURIComponent(answersB64)}`;
  const protegeUrl = 'https://my4mlife.com/become-protege' + qs;
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#0a1628;line-height:1.55">
<h1 style="font-size:22px;margin:0 0 12px">Hi ${safe(firstName)}, here are your top 3 priorities from your 4M Assessment:</h1>
<ul style="padding-left:18px;margin:12px 0 24px">${items}</ul>
<h2 style="font-size:17px;margin:24px 0 8px">Your next step:</h2>
<p style="margin:12px 0"><strong>Become a Protégé (free)</strong> — the My4MLife app, weekly live Zooms, and 15% off your first order. No purchase required.</p>
<p style="margin:8px 0 16px"><a href="${protegeUrl}" style="background:#00b894;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Become a Protégé &amp; Open the App →</a></p>
<p style="font-size:13px;color:#718096;margin:8px 0 24px">Have questions first? Email <a href="mailto:support@my4mlife.com" style="color:#00a381">support@my4mlife.com</a>.</p>
<p style="font-size:13px;color:#718096;margin-top:32px">Your results are saved — you can revisit them anytime at <a href="https://my4mlife.com/assessment" style="color:#00a381">my4mlife.com/assessment</a>.</p>
<p style="font-size:13px;color:#718096;margin-top:8px">Begin with the end in mind. — Dr. TJ &amp; the My4MLife team</p>
</div>`;
}

async function sendResultsEmail(email: string, firstName: string, phone: string, top3: any[], intakeAnswers: Record<string, number>): Promise<void> {
  const subject = `Your 4M Assessment Results — ${firstName || 'top 3 priorities'}`;
  const html = buildResultsHtml(firstName, email, phone, top3, intakeAnswers);
  const payload = { kind: 'info', to: email, subject, html };
  await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'Event',
    Payload: Buffer.from(JSON.stringify(payload)),
  }));
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(204, {});
  if (!event.body) return reply(400, { error: 'missing body' });

  let parsed: any;
  try { parsed = JSON.parse(event.body); } catch { return reply(400, { error: 'invalid json' }); }

  const { scores, top3 } = parsed;
  const rawEmail: string | undefined = parsed.email;
  const firstName: string = (parsed.firstName && typeof parsed.firstName === 'string') ? parsed.firstName.trim() : '';
  const phone: string = (parsed.phone && typeof parsed.phone === 'string') ? parsed.phone.trim() : '';

  let contactId: string | undefined = typeof parsed.contactId === 'string' && parsed.contactId.trim() ? parsed.contactId.trim() : undefined;
  let email = '';
  if (rawEmail && typeof rawEmail === 'string' && EMAIL_RE.test(rawEmail.trim().toLowerCase())) {
    email = rawEmail.trim().toLowerCase();
    if (!contactId) contactId = uuidv5(email, NAMESPACE);
  }
  if (!contactId) return reply(400, { error: 'contactId or email required' });

  const ts = new Date().toISOString();

  await ddb.send(new UpdateCommand({
    TableName: CONTACT_TABLE,
    Key: { contactId },
    UpdateExpression: 'SET auditCompletedAt = :ts, intakeAnswers = :scores, auditTop3 = :top3, updatedAt = :ts',
    ExpressionAttributeValues: {
      ':ts': ts,
      ':scores': (scores && typeof scores === 'object') ? scores : {},
      ':top3': Array.isArray(top3) ? top3 : [],
    },
  }));

  if (email) {
    try {
      await sendResultsEmail(email, firstName, phone, Array.isArray(top3) ? top3 : [], (scores && typeof scores === 'object') ? scores : {});
    } catch (e) {
      console.warn('results email invoke failed', e);
    }
  }

  const queueUrl = process.env.NURTURE_QUEUE_URL;
  if (queueUrl) {
    try {
      await sqs.send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ contactId, stage: 1 }),
        DelaySeconds: 900,
      }));
    } catch (e) {
      console.warn('nurture enqueue failed', e);
    }
  }

  return reply(200, { ok: true, contactId });
};
