import type { SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';
const TOUCHPOINTS_TABLE = process.env.TOUCHPOINTS_TABLE ?? 'Touchpoints';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const sns = new SNSClient({ region: REGION });

const SUBJECT = 'Your 4M results — quick intro from Dr. TJ';
const body = (zoom: string) => `Thanks for taking the 4M Audit.

Before you decide on a next step, watch this short intro from Dr. TJ — it explains the 4M framework and how the top categories you scored on tie together:

${zoom}

Begin with the end in mind.
— The My4MLife concierge`;

async function sendEmail(to: string, zoom: string): Promise<string | null> {
  const dom = process.env.MAILGUN_DOMAIN, key = process.env.MAILGUN_API_KEY;
  if (!dom || !key || !to) return null;
  const from = process.env.MAILGUN_FROM ?? 'concierge@my4mlife.com';
  const form = new URLSearchParams({ from, to, subject: SUBJECT, text: body(zoom) });
  const auth = Buffer.from(`api:${key}`).toString('base64');
  const res = await fetch(`https://api.mailgun.net/v3/${dom}/messages`, {
    method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(),
  });
  if (!res.ok) { console.warn('mailgun fail', res.status, await res.text()); return null; }
  return `mg-${Date.now()}`;
}

async function sendSms(phone: string | undefined, zoom: string): Promise<string | null> {
  if (!phone) return null;
  const r: any = await sns.send(new PublishCommand({ PhoneNumber: phone, Message: `My4MLife: watch your 4M intro from Dr. TJ — ${zoom}` }));
  return r?.MessageId ?? 'sns-ok';
}

async function logTouch(contactId: string, eventType: 'email-out' | 'sms-out', channelMessageId: string | null) {
  const ts = new Date().toISOString();
  await ddb.send(new PutCommand({
    TableName: TOUCHPOINTS_TABLE,
    Item: { contactId, sk: `${ts}#${eventType}#${Math.random().toString(36).slice(2, 10)}`, eventType, ts, payload: { kind: 'nurture-intro' }, ...(channelMessageId ? { channelMessageId } : {}) },
  }));
}

export const handler = async (event: SQSEvent): Promise<{ ok: true }> => {
  for (const rec of event.Records) {
    const { contactId } = JSON.parse(rec.body);
    if (!contactId) continue;
    const got = await ddb.send(new GetCommand({ TableName: CONTACT_TABLE, Key: { contactId } }));
    const c: any = got.Item;
    if (!c || c.lifecycleStage === 'banned' || c.nurtureSent === true) continue;
    if (c.lifecycleStage !== 'lead') continue;
    const zoom = process.env.INTRO_ZOOM_URL ?? '';
    const emailId = await sendEmail(c.email, zoom);
    const smsId = await sendSms(c.phone, zoom);
    await logTouch(contactId, 'email-out', emailId);
    await logTouch(contactId, 'sms-out', smsId);
    await ddb.send(new UpdateCommand({
      TableName: CONTACT_TABLE, Key: { contactId },
      UpdateExpression: 'SET nurtureSent = :t, nurtureSentAt = :ts, updatedAt = :ts',
      ExpressionAttributeValues: { ':t': true, ':ts': new Date().toISOString() },
    }));
  }
  return { ok: true };
};
