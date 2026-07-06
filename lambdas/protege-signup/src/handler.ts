import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
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
const BOOK_S3_KEY = process.env.PROTEGE_BOOK_S3_KEY ?? 'begin-with-the-end-in-mind-v1.pdf';
const WORKBOOK_S3_KEY = process.env.PROTEGE_WORKBOOK_S3_KEY ?? 'cohort-workbook-v1.pdf';
const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

export const NAMESPACE = 'f0e1d2c3-b4a5-4968-87a6-95c4d3e2f1a0';

const cognito = new CognitoIdentityProviderClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const lambda = new LambdaClient({ region: REGION });
const s3 = new S3Client({ region: REGION });

async function getBookDownloadUrl(): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: DIGITAL_BUCKET, Key: BOOK_S3_KEY }),
    { expiresIn: SIGNED_URL_TTL_SEC },
  );
}

async function getWorkbookDownloadUrl(): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: DIGITAL_BUCKET, Key: WORKBOOK_S3_KEY }),
    { expiresIn: SIGNED_URL_TTL_SEC },
  );
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
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RE = /^\+[1-9]\d{6,14}$/;

function reply(statusCode: number, body: unknown, origin?: string): APIGatewayProxyResultV2 {
  return { statusCode, headers: corsHeaders(origin), body: JSON.stringify(body) };
}

function randomPassword(len = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function ensureCognitoUser(email: string, firstName: string): Promise<{ alreadyExists: boolean; sub: string | null }> {
  try {
    const got = await cognito.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: email }));
    const sub = got.UserAttributes?.find((a) => a.Name === 'sub')?.Value ?? null;
    return { alreadyExists: true, sub };
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
  const sub = created.User?.Attributes?.find((a) => a.Name === 'sub')?.Value ?? null;
  return { alreadyExists: false, sub };
}

async function seedUserProfile(args: {
  sub: string; email: string; firstName: string; phone: string;
  auditTop3: unknown; auditCompletedAt: string | null; intakeAnswers: unknown;
  // When true (retake path), audit fields overwrite existing values rather
  // than preserving the prior assessment via if_not_exists.
  overwriteAudit?: boolean;
}): Promise<void> {
  const now = new Date().toISOString();
  const sets: string[] = [
    '#owner = if_not_exists(#owner, :owner)',
    '#primaryEmail = if_not_exists(#primaryEmail, :primaryEmail)',
    '#firstName = if_not_exists(#firstName, :firstName)',
    '#phone = if_not_exists(#phone, :phone)',
    '#createdAt = if_not_exists(#createdAt, :createdAt)',
    '#updatedAt = :updatedAt',
  ];
  const names: Record<string, string> = {
    '#owner': 'owner', '#primaryEmail': 'primaryEmail', '#firstName': 'firstName',
    '#phone': 'phone', '#createdAt': 'createdAt', '#updatedAt': 'updatedAt',
  };
  const values: Record<string, unknown> = {
    ':owner': args.sub, ':primaryEmail': args.email, ':firstName': args.firstName,
    ':phone': args.phone, ':createdAt': now, ':updatedAt': now,
  };
  const auditExpr = (col: string) => args.overwriteAudit ? `#${col} = :${col}` : `#${col} = if_not_exists(#${col}, :${col})`;
  if (args.auditTop3 !== undefined && args.auditTop3 !== null) {
    sets.push(auditExpr('auditTop3'));
    names['#auditTop3'] = 'auditTop3';
    values[':auditTop3'] = JSON.stringify(args.auditTop3);
  }
  if (args.auditCompletedAt) {
    sets.push(auditExpr('auditCompletedAt'));
    names['#auditCompletedAt'] = 'auditCompletedAt';
    values[':auditCompletedAt'] = args.auditCompletedAt;
  }
  if (args.intakeAnswers !== undefined && args.intakeAnswers !== null) {
    sets.push(auditExpr('intakeAnswers'));
    names['#intakeAnswers'] = 'intakeAnswers';
    values[':intakeAnswers'] = JSON.stringify(args.intakeAnswers);
  }
  await ddb.send(new UpdateCommand({
    TableName: USER_PROFILE_TABLE,
    Key: { id: args.sub },
    UpdateExpression: 'SET ' + sets.join(', '),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

async function readContactAudit(contactId: string): Promise<{ auditTop3: unknown; auditCompletedAt: string | null; intakeAnswers: unknown }> {
  try {
    const r = await ddb.send(new GetCommand({ TableName: CONTACT_TABLE, Key: { contactId } }));
    const item = r.Item ?? {};
    return {
      auditTop3: item.auditTop3 ?? null,
      auditCompletedAt: item.auditCompletedAt ?? null,
      intakeAnswers: item.intakeAnswers ?? null,
    };
  } catch {
    return { auditTop3: null, auditCompletedAt: null, intakeAnswers: null };
  }
}

type WelcomeEmailVariant = 'standard' | 'app-only';

async function sendWelcomeEmail(email: string, firstName: string, variant: WelcomeEmailVariant = 'standard'): Promise<void> {
  const appUrl = 'https://app.my4mlife.com';
  const includeBookAndWorkbook = variant === 'standard';
  let bookUrl = '';
  let workbookUrl = '';
  if (includeBookAndWorkbook) {
    try {
      bookUrl = await getBookDownloadUrl();
    } catch (err) {
      console.warn('[protege-signup] book signed URL failed:', err);
    }
    try {
      workbookUrl = await getWorkbookDownloadUrl();
    } catch (err) {
      console.warn('[protege-signup] workbook signed URL failed:', err);
    }
  }

  // Gold book card.
  const bookCard = bookUrl
    ? `<div style="margin:20px 0;padding:22px;border:2px solid #d4af5a;border-radius:10px;background:#fbf7ec">
<p style="font-size:12px;font-weight:700;letter-spacing:0.16em;color:#a37a14;text-transform:uppercase;margin:0 0 8px">Your Welcome Book</p>
<h2 style="font-family:Georgia,serif;font-size:22px;color:#0a1628;margin:0 0 6px;line-height:1.2">Begin with the End in Mind</h2>
<p style="font-style:italic;color:#666;font-size:14px;margin:0 0 12px;line-height:1.4">Don't lose your identity and your dignity while you still have a choice.</p>
<p style="color:#222;font-size:14px;line-height:1.55;margin:0 0 16px">Dr. TJ's 258-page field guide to brain healthspan, organized around the 4M framework. The why behind the system.</p>
<p style="margin:0"><a href="${bookUrl}" style="background:#d4af5a;color:#0a1628;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px">Download the Book (PDF) &rarr;</a></p>
<p style="color:#777;font-size:11px;margin:12px 0 0">Link valid for 7 days. Reply to this email if you need a fresh one.</p>
</div>`
    : '';

  // Bronze/copper workbook card.
  const workbookCard = workbookUrl
    ? `<div style="margin:20px 0;padding:22px;border:2px solid #b87333;border-radius:10px;background:#fdf5ed">
<p style="font-size:12px;font-weight:700;letter-spacing:0.16em;color:#7a4c1f;text-transform:uppercase;margin:0 0 8px">Your Action Workbook</p>
<h2 style="font-family:Georgia,serif;font-size:22px;color:#0a1628;margin:0 0 6px;line-height:1.2">The Cohort Workbook — Month 1</h2>
<p style="font-style:italic;color:#666;font-size:14px;margin:0 0 12px;line-height:1.4">Print it. Mark it up. Run it daily.</p>
<p style="color:#222;font-size:14px;line-height:1.55;margin:0 0 16px">135 pages of daily check-ins, weekly reflections, tear-out scorecards, the stack reference, and the optional advanced layer. The how that pairs with the book's why.</p>
<p style="margin:0"><a href="${workbookUrl}" style="background:#b87333;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px">Download the Workbook (PDF) &rarr;</a></p>
<p style="color:#777;font-size:11px;margin:12px 0 0">Link valid for 7 days. Reply to this email if you need a fresh one.</p>
</div>`
    : '';

  // Green app card — always included.
  const appCard = `<div style="margin:20px 0;padding:22px;border:2px solid #00b894;border-radius:10px;background:#f0fbf6">
<p style="font-size:12px;font-weight:700;letter-spacing:0.16em;color:#007a5e;text-transform:uppercase;margin:0 0 8px">Your App Access</p>
<h2 style="font-family:Georgia,serif;font-size:22px;color:#0a1628;margin:0 0 6px;line-height:1.2">Open the My4MLife App</h2>
<p style="color:#222;font-size:14px;line-height:1.55;margin:0 0 16px">Your dashboard, weekly Zooms with Dr. TJ, the cohort, and the daily action guide — all in one place. We'll email a 6-digit code when you tap below. No password to remember.</p>
<p style="margin:0"><a href="${appUrl}" style="background:#00b894;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px">Open the My4MLife App &rarr;</a></p>
<p style="color:#777;font-size:11px;margin:12px 0 0">Save the app to your home screen for one-tap access.</p>
</div>`;

  const lead = variant === 'app-only'
    ? `Thanks for purchasing My4MLife Protégé app access. You're officially a Protégé and your access is ready. Tap below to open the app — we'll email you a one-time sign-in code.`
    : `You're officially a My4MLife Protégé. Three things are yours right now — the book, the workbook, and the app. Take them in any order; they're designed to work together.`;

  const subject = variant === 'app-only'
    ? 'Welcome to My4MLife — your Protégé app access is ready'
    : 'Welcome to My4MLife — your book, workbook, and app are ready';

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
<h1 style="font-size:24px;color:#0a1628;margin:0 0 10px">Welcome, ${firstName}.</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55">${lead}</p>
${bookCard}
${workbookCard}
${appCard}
<p style="margin:24px 0 12px;font-size:14px;line-height:1.6;color:#333">Your Protégé benefits include free access to the My4MLife app, your welcome book, the cohort workbook, weekly Zooms with Dr. TJ, and the cohort community.</p>
<p style="color:#666;font-size:13px;font-style:italic;margin:24px 0 0">Begin with the end in mind. — Dr. TJ &amp; the My4MLife team</p>
</div>`;

  const payload = { kind: 'info', to: email, subject, html };
  await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'Event',
    Payload: Buffer.from(JSON.stringify(payload)),
  }));
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = (event.headers?.['origin'] ?? event.headers?.['Origin']) as string | undefined;
  if ((event as any).requestContext?.http?.method === 'OPTIONS') return reply(204, {}, origin);

  let body: any;
  try { body = event.body ? JSON.parse(event.body) : {}; } catch { return reply(400, { error: 'invalid JSON' }, origin); }

  const emailRaw: string | undefined = body.email;
  if (!emailRaw || typeof emailRaw !== 'string') return reply(400, { error: 'email required' }, origin);
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return reply(400, { error: 'malformed email' }, origin);

  const firstName: string | undefined = body.firstName && typeof body.firstName === 'string' ? body.firstName.trim() : undefined;
  if (!firstName) return reply(400, { error: 'firstName required' }, origin);

  const phone: string | undefined = body.phone ? String(body.phone).trim() : undefined;
  if (!phone) return reply(400, { error: 'phone required' }, origin);
  if (!E164_RE.test(phone)) return reply(400, { error: 'phone must be E.164 (e.g. +15551234567)' }, origin);

  const consent = body.consent;
  if (!consent || consent.ai !== true || consent.protege !== true) {
    return reply(400, { error: 'consent.ai and consent.protege must both be true' }, origin);
  }

  let alreadyExists = false;
  let sub: string | null = null;
  try {
    ({ alreadyExists, sub } = await ensureCognitoUser(email, firstName));
  } catch {
    return reply(500, { error: 'cognito error' }, origin);
  }

  const contactId = uuidv5(email, NAMESPACE);
  const ts = new Date().toISOString();

  try {
    await ddb.send(new UpdateCommand({
      TableName: CONTACT_TABLE,
      Key: { contactId },
      UpdateExpression: [
        'SET #email = :email',
        '#firstName = :firstName',
        '#phone = :phone',
        '#consent = :consent',
        '#updatedAt = :updatedAt',
        '#lifecycleStage = if_not_exists(#lifecycleStage, :protege)',
        '#createdAt = if_not_exists(#createdAt, :createdAt)',
      ].join(', '),
      ConditionExpression: 'attribute_not_exists(#lifecycleStage) OR #lifecycleStage = :lead OR #lifecycleStage = :protege',
      ExpressionAttributeNames: {
        '#email': 'email', '#firstName': 'firstName', '#phone': 'phone',
        '#consent': 'consent', '#updatedAt': 'updatedAt', '#lifecycleStage': 'lifecycleStage',
        '#createdAt': 'createdAt',
      },
      ExpressionAttributeValues: {
        ':email': email, ':firstName': firstName, ':phone': phone,
        ':consent': { ai: { v: 'consent-ai-v1', at: ts }, protege: { v: 'consent-protege-v1', at: ts } },
        ':updatedAt': ts, ':createdAt': ts,
        ':protege': 'protege', ':lead': 'lead',
      },
    }));
  } catch (e: any) {
    if (e?.name !== 'ConditionalCheckFailedException') return reply(500, { error: 'write failed' }, origin);
  }

  // Seed UserProfile (Users table) with audit data so the app skips the intake gate.
  // Prefer audit data sent in the request body (freshly computed by the
  // assessment that just submitted); fall back to Contact only when none was
  // passed. This avoids the audit-complete↔protege-signup race that
  // previously seeded UserProfile with the prior assessment's results.
  if (sub) {
    try {
      const bodyAuditTop3 = body.auditTop3 ?? null;
      const bodyIntakeAnswers = body.intakeAnswers ?? null;
      const bodyAuditCompletedAt = typeof body.auditCompletedAt === 'string' ? body.auditCompletedAt : null;
      let audit: { auditTop3: unknown; auditCompletedAt: string | null; intakeAnswers: unknown };
      let overwriteAudit = false;
      if (bodyAuditTop3 || bodyIntakeAnswers) {
        audit = {
          auditTop3: bodyAuditTop3,
          auditCompletedAt: bodyAuditCompletedAt ?? ts,
          intakeAnswers: bodyIntakeAnswers,
        };
        overwriteAudit = true;
      } else {
        audit = await readContactAudit(contactId);
      }
      await seedUserProfile({ sub, email, firstName, phone, ...audit, overwriteAudit });
    } catch (err) {
      console.warn('[protege-signup] UserProfile seed failed:', err);
    }
  }

  // Always send the welcome email — including the book download link —
  // even for returning Protégés. A returning user re-claiming the book is
  // a feature, not a bug, and silently skipping the email left book buyers
  // wondering where the file was.
  // Pick welcome email variant: 'app-only' when the caller is order-handler
  // post-purchase (app-access SKU buyer); 'standard' otherwise.
  const welcomeVariant: WelcomeEmailVariant =
    body.welcomeEmailVariant === 'app-only' ? 'app-only' : 'standard';
  try { await sendWelcomeEmail(email, firstName, welcomeVariant); } catch (err) {
    console.warn('[protege-signup] welcome email failed (non-fatal):', err);
  }

  return reply(200, { ok: true, ...(alreadyExists ? { alreadyExists: true } : {}) }, origin);
};
