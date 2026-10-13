import type { SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { emailTemplate, smsTemplate, NurtureStage } from './templates';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';
const TOUCHPOINTS_TABLE = process.env.TOUCHPOINTS_TABLE ?? 'Touchpoints';
// The 8 assessment category slugs audit-complete writes into Contact `tags`
// (same set as apps/clientportal audit-handoff SLUG_TO_APP_ID), with display labels.
const CATEGORY_LABELS: Record<string, string> = {
  gut: 'Gut', sleep: 'Sleep', weight: 'Weight', nutrition: 'Nutrition',
  'erectile-dysfunction': 'Erectile dysfunction', environment: 'Environment',
  cognitive: 'Cognitive', hormones: 'Hormones',
};

/** Category labels from Contact `tags` (Set or array; non-category tags ignored), else legacy `auditTop3`. */
export function topCategoriesFor(c: { tags?: unknown; auditTop3?: unknown }): string {
  const tags = c.tags instanceof Set ? [...c.tags] : Array.isArray(c.tags) ? c.tags : [];
  const fromTags = tags.filter((t): t is string => typeof t === 'string' && t in CATEGORY_LABELS).map((t) => CATEGORY_LABELS[t]);
  if (fromTags.length) return fromTags.join(', ');
  return Array.isArray(c.auditTop3) ? c.auditTop3.join(', ') : '';
}

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const sns = new SNSClient({ region: REGION });

async function sendEmail(to: string, subject: string, body: string): Promise<string | null> {
  const dom = process.env.MAILGUN_DOMAIN, key = process.env.MAILGUN_API_KEY;
  if (!dom || !key || !to) return null;
  const from = process.env.MAILGUN_FROM ?? 'concierge@my4mlife.com';
  const form = new URLSearchParams({ from, to, subject, text: body });
  const auth = Buffer.from(`api:${key}`).toString('base64');
  const res = await fetch(`https://api.mailgun.net/v3/${dom}/messages`, {
    method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(),
  });
  if (!res.ok) { console.warn('mailgun fail', res.status, await res.text()); return null; }
  return `mg-${Date.now()}`;
}

async function sendSms(phone: string | undefined, message: string): Promise<string | null> {
  if (!phone) return null;
  const r: any = await sns.send(new PublishCommand({ PhoneNumber: phone, Message: message }));
  return r?.MessageId ?? 'sns-ok';
}

async function logTouch(contactId: string, eventType: 'email-out' | 'sms-out', stage: NurtureStage, channelMessageId: string | null) {
  const ts = new Date().toISOString();
  await ddb.send(new PutCommand({
    TableName: TOUCHPOINTS_TABLE,
    Item: { contactId, sk: `${ts}#${eventType}#${Math.random().toString(36).slice(2, 10)}`, eventType, ts, payload: { kind: 'nurture', stage }, ...(channelMessageId ? { channelMessageId } : {}) },
  }));
}

export const handler = async (event: SQSEvent): Promise<{ ok: true }> => {
  for (const rec of event.Records) {
    const parsed = JSON.parse(rec.body);
    const contactId: string | undefined = parsed.contactId;
    const stage: NurtureStage = (parsed.stage as NurtureStage) ?? 1;
    if (!contactId) continue;
    const got = await ddb.send(new GetCommand({ TableName: CONTACT_TABLE, Key: { contactId } }));
    const c: any = got.Item;
    if (!c || c.lifecycleStage === 'banned') continue;
    if (c.lifecycleStage !== 'lead') continue;
    const stageFlag = `nurtureStage${stage}Sent`;
    if (c[stageFlag] === true) continue;
    const topCategories = topCategoriesFor(c);
    const ctx = { firstName: c.firstName ?? '', introZoomUrl: process.env.INTRO_ZOOM_URL ?? '', topCategories };
    const { subject, body } = emailTemplate(stage, ctx);
    const emailId = await sendEmail(c.email, subject, body);
    const smsId = await sendSms(c.phone, smsTemplate(stage, ctx));
    await logTouch(contactId, 'email-out', stage, emailId);
    await logTouch(contactId, 'sms-out', stage, smsId);
    await ddb.send(new UpdateCommand({
      TableName: CONTACT_TABLE, Key: { contactId },
      UpdateExpression: `SET ${stageFlag} = :t, nurtureSent = :t, updatedAt = :ts`,
      ExpressionAttributeValues: { ':t': true, ':ts': new Date().toISOString() },
    }));
  }
  return { ok: true };
};
