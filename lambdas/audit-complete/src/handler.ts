import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v5 as uuidv5 } from 'uuid';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';
const USER_PROFILE_TABLE = process.env.USER_PROFILE_TABLE ?? 'Users';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? '';
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';
const DIGITAL_BUCKET = process.env.DIGITAL_FULFILLMENT_BUCKET ?? 'my4mlife-digital-fulfillment';
const BOOK_S3_KEY = process.env.PROTEGE_BOOK_S3_KEY ?? 'begin-with-the-end-in-mind-v5.pdf';
const WORKBOOK_S3_KEY = process.env.PROTEGE_WORKBOOK_S3_KEY ?? 'cohort-workbook-v2.pdf';
const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7; // 7 days
export const NAMESPACE = 'f0e1d2c3-b4a5-4968-87a6-95c4d3e2f1a0';

const cognito = new CognitoIdentityProviderClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const sqs = new SQSClient({ region: REGION });
const lambda = new LambdaClient({ region: REGION });
const s3 = new S3Client({ region: REGION });

function randomPassword(len = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function ensureCognitoUser(email: string, firstName: string): Promise<string | null> {
  try {
    const got = await cognito.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: email }));
    return got.UserAttributes?.find((a) => a.Name === 'sub')?.Value ?? null;
  } catch (e: any) {
    if (e?.name !== 'UserNotFoundException') throw e;
  }
  const created = await cognito.send(new AdminCreateUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    MessageAction: 'SUPPRESS',
    TemporaryPassword: randomPassword(),
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'given_name', Value: firstName },
    ],
  }));
  return created.User?.Attributes?.find((a) => a.Name === 'sub')?.Value ?? null;
}

async function seedUserProfile(args: {
  sub: string; email: string; firstName: string; phone: string;
  auditTop3: unknown; auditCompletedAt: string; intakeAnswers: unknown;
}): Promise<void> {
  const now = new Date().toISOString();
  // Audit fields OVERWRITE on retake so the app always reflects the latest assessment.
  const sets: string[] = [
    '#owner = if_not_exists(#owner, :owner)',
    '#primaryEmail = if_not_exists(#primaryEmail, :primaryEmail)',
    '#firstName = if_not_exists(#firstName, :firstName)',
    '#phone = if_not_exists(#phone, :phone)',
    '#createdAt = if_not_exists(#createdAt, :createdAt)',
    '#updatedAt = :updatedAt',
    '#auditTop3 = :auditTop3',
    '#auditCompletedAt = :auditCompletedAt',
    '#intakeAnswers = :intakeAnswers',
  ];
  await ddb.send(new UpdateCommand({
    TableName: USER_PROFILE_TABLE,
    Key: { id: args.sub },
    UpdateExpression: 'SET ' + sets.join(', '),
    ExpressionAttributeNames: {
      '#owner': 'owner', '#primaryEmail': 'primaryEmail', '#firstName': 'firstName',
      '#phone': 'phone', '#createdAt': 'createdAt', '#updatedAt': 'updatedAt',
      '#auditTop3': 'auditTop3', '#auditCompletedAt': 'auditCompletedAt', '#intakeAnswers': 'intakeAnswers',
    },
    ExpressionAttributeValues: {
      ':owner': args.sub, ':primaryEmail': args.email, ':firstName': args.firstName,
      ':phone': args.phone, ':createdAt': now, ':updatedAt': now,
      ':auditTop3': JSON.stringify(args.auditTop3 ?? []),
      ':auditCompletedAt': args.auditCompletedAt,
      ':intakeAnswers': JSON.stringify(args.intakeAnswers ?? {}),
    },
  }));
}

async function getBookDownloadUrl(): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: DIGITAL_BUCKET, Key: BOOK_S3_KEY }), { expiresIn: SIGNED_URL_TTL_SEC });
}

async function getWorkbookDownloadUrl(): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: DIGITAL_BUCKET, Key: WORKBOOK_S3_KEY }), { expiresIn: SIGNED_URL_TTL_SEC });
}

const ALLOWED_ORIGINS = new Set([
  'https://my4mlife.com',
  'https://www.my4mlife.com',
  'https://app.my4mlife.com',
  'http://localhost:4321',
  'http://localhost:5173',
]);

function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://my4mlife.com';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reply(s: number, b: unknown, origin?: string): APIGatewayProxyResultV2 {
  return { statusCode: s, headers: corsHeaders(origin), body: JSON.stringify(b) };
}

function buildResultsHtml(firstName: string, top3: any[], bookUrl: string, workbookUrl: string): string {
  const safe = (s: string) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));
  const appUrl = 'https://app.my4mlife.com';

  const top3Items = top3.map((t: any, i: number) => {
    const label = safe(t?.label || t?.id || 'Priority ' + (i + 1));
    return `<li style="margin:8px 0;font-size:15px"><strong>#${i + 1}.</strong> ${label}</li>`;
  }).join('');

  const top3Card = `<div style="margin:20px 0;padding:22px;border:2px solid #1a3656;border-radius:10px;background:#f4f6fa">
<p style="font-size:12px;font-weight:700;letter-spacing:0.16em;color:#1a3656;text-transform:uppercase;margin:0 0 8px">Your Top 3 Priorities</p>
<h2 style="font-family:Georgia,serif;font-size:20px;color:#0a1628;margin:0 0 6px;line-height:1.2">From Your 4M Assessment</h2>
<p style="color:#222;font-size:14px;line-height:1.55;margin:0 0 12px">These are the areas where addressing the root cause will create the biggest ripple effect across your health.</p>
<ol style="padding-left:18px;margin:0;color:#0a1628">${top3Items}</ol>
</div>`;

  const bookCard = bookUrl
    ? `<div style="margin:20px 0;padding:22px;border:2px solid #d4af5a;border-radius:10px;background:#fbf7ec">
<p style="font-size:12px;font-weight:700;letter-spacing:0.16em;color:#a37a14;text-transform:uppercase;margin:0 0 8px">Your Welcome Book</p>
<h2 style="font-family:Georgia,serif;font-size:22px;color:#0a1628;margin:0 0 6px;line-height:1.2">Begin with the End in Mind</h2>
<p style="font-style:italic;color:#666;font-size:14px;margin:0 0 12px;line-height:1.4">Don't lose your identity and your dignity while you still have a choice.</p>
<p style="color:#222;font-size:14px;line-height:1.55;margin:0 0 16px">Dr. TJ's field guide to brain healthspan, organized around the 4M framework. The why behind the system.</p>
<p style="margin:0"><a href="${bookUrl}" style="background:#d4af5a;color:#0a1628;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px">Download the Book (PDF) &rarr;</a></p>
<p style="color:#777;font-size:11px;margin:12px 0 0">Link valid for 7 days. Reply to this email if you need a fresh one.</p>
</div>`
    : '';

  const workbookCard = workbookUrl
    ? `<div style="margin:20px 0;padding:22px;border:2px solid #b87333;border-radius:10px;background:#fdf5ed">
<p style="font-size:12px;font-weight:700;letter-spacing:0.16em;color:#7a4c1f;text-transform:uppercase;margin:0 0 8px">Your Action Workbook</p>
<h2 style="font-family:Georgia,serif;font-size:22px;color:#0a1628;margin:0 0 6px;line-height:1.2">The Cohort Workbook — Month 1</h2>
<p style="font-style:italic;color:#666;font-size:14px;margin:0 0 12px;line-height:1.4">Print it. Mark it up. Run it daily.</p>
<p style="color:#222;font-size:14px;line-height:1.55;margin:0 0 16px">Daily check-ins, weekly reflections, tear-out scorecards, the stack reference, and the optional advanced layer. The how that pairs with the book's why.</p>
<p style="margin:0"><a href="${workbookUrl}" style="background:#b87333;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px">Download the Workbook (PDF) &rarr;</a></p>
<p style="color:#777;font-size:11px;margin:12px 0 0">Link valid for 7 days. Reply to this email if you need a fresh one.</p>
</div>`
    : '';

  const appCard = `<div style="margin:20px 0;padding:22px;border:2px solid #00b894;border-radius:10px;background:#f0fbf6">
<p style="font-size:12px;font-weight:700;letter-spacing:0.16em;color:#007a5e;text-transform:uppercase;margin:0 0 8px">Your App Access</p>
<h2 style="font-family:Georgia,serif;font-size:22px;color:#0a1628;margin:0 0 6px;line-height:1.2">Open the My4MLife App</h2>
<p style="color:#222;font-size:14px;line-height:1.55;margin:0 0 16px">Your dashboard, weekly Zooms with Dr. TJ, the cohort, and the daily action guide — all in one place. Sign in with this email address. We'll send a 6-digit code when you tap below — no password to remember.</p>
<p style="margin:0"><a href="${appUrl}" style="background:#00b894;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px">Open the My4MLife App &rarr;</a></p>
<p style="color:#777;font-size:11px;margin:12px 0 0">Save the app to your home screen for one-tap access.</p>
</div>`;

  const coordinatorCard = `<div style="margin:28px 0 12px;padding:18px;border-top:1px solid #e2e8f0;text-align:center">
<p style="color:#333;font-size:14px;line-height:1.55;margin:0 0 12px"><strong>Want to talk to a person?</strong> Schedule a call with one of our care coordinators — they'll listen to your situation and connect you with the appropriate medical provider in our network.</p>
<p style="margin:0"><a href="https://my4mlife.com/consult" style="color:#1a3656;font-weight:600;font-size:14px;text-decoration:underline">Schedule with a Care Coordinator &rarr;</a></p>
</div>`;

  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
<h1 style="font-size:24px;color:#0a1628;margin:0 0 10px">Welcome, ${safe(firstName)}.</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55">You're officially a My4MLife Protégé. Four things are yours right now — your assessment results, the book, the workbook, and the app. Take them in any order; they're designed to work together.</p>
${top3Card}
${bookCard}
${workbookCard}
${appCard}
${coordinatorCard}
<p style="color:#666;font-size:13px;font-style:italic;margin:24px 0 0;text-align:center">Begin with the end in mind. — Dr. TJ &amp; the My4MLife team</p>
</div>`;
}

async function sendResultsEmail(email: string, firstName: string, top3: any[]): Promise<void> {
  let bookUrl = '';
  let workbookUrl = '';
  try { bookUrl = await getBookDownloadUrl(); } catch (e) { console.warn('book signed URL failed', e); }
  try { workbookUrl = await getWorkbookDownloadUrl(); } catch (e) { console.warn('workbook signed URL failed', e); }

  const subject = `Welcome to My4MLife — your results, book, workbook, and app are ready`;
  const html = buildResultsHtml(firstName, top3, bookUrl, workbookUrl);
  const payload = { kind: 'info', to: email, subject, html };
  await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'Event',
    Payload: Buffer.from(JSON.stringify(payload)),
  }));
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = (event.headers?.['origin'] ?? event.headers?.['Origin']) as string | undefined;
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(204, {}, origin);
  if (!event.body) return reply(400, { error: 'missing body' }, origin);

  let parsed: any;
  try { parsed = JSON.parse(event.body); } catch { return reply(400, { error: 'invalid json' }, origin); }

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
  if (!contactId) return reply(400, { error: 'contactId or email required' }, origin);

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
      const sub = await ensureCognitoUser(email, firstName || 'Friend');
      if (sub) {
        await seedUserProfile({
          sub, email, firstName: firstName || 'Friend', phone,
          auditTop3: Array.isArray(top3) ? top3 : [],
          auditCompletedAt: ts,
          intakeAnswers: (scores && typeof scores === 'object') ? scores : {},
        });
      }
    } catch (e) {
      console.warn('cognito/userprofile seed failed', e);
    }

    try {
      await sendResultsEmail(email, firstName, Array.isArray(top3) ? top3 : []);
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

  return reply(200, { ok: true, contactId }, origin);
};
