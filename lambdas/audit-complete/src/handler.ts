import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { v5 as uuidv5 } from 'uuid';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';
const USER_PROFILE_TABLE = process.env.USER_PROFILE_TABLE ?? 'Users';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? '';
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';
const DIGITAL_BUCKET = process.env.DIGITAL_FULFILLMENT_BUCKET ?? 'my4mlife-digital-fulfillment';
const BOOK_S3_KEY = process.env.PROTEGE_BOOK_S3_KEY ?? 'begin-with-the-end-in-mind.pdf';
const WORKBOOK_S3_KEY = process.env.PROTEGE_WORKBOOK_S3_KEY ?? 'cohort-workbook-month1.pdf';
const BUCKET_REGION = process.env.BUCKET_REGION ?? 'us-east-2';
export const NAMESPACE = 'f0e1d2c3-b4a5-4968-87a6-95c4d3e2f1a0';

const cognito = new CognitoIdentityProviderClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const sqs = new SQSClient({ region: REGION });
const lambda = new LambdaClient({ region: REGION });

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
  consent?: unknown; consentedAt?: string | null;
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
    ...(args.consent ? ['#consent = :consent', '#consentedAt = :consentedAt'] : []),
  ];
  await ddb.send(new UpdateCommand({
    TableName: USER_PROFILE_TABLE,
    Key: { id: args.sub },
    UpdateExpression: 'SET ' + sets.join(', '),
    ExpressionAttributeNames: {
      '#owner': 'owner', '#primaryEmail': 'primaryEmail', '#firstName': 'firstName',
      '#phone': 'phone', '#createdAt': 'createdAt', '#updatedAt': 'updatedAt',
      '#auditTop3': 'auditTop3', '#auditCompletedAt': 'auditCompletedAt', '#intakeAnswers': 'intakeAnswers',
      ...(args.consent ? { '#consent': 'consent', '#consentedAt': 'consentedAt' } : {}),
    },
    ExpressionAttributeValues: {
      ':owner': args.sub, ':primaryEmail': args.email, ':firstName': args.firstName,
      ':phone': args.phone, ':createdAt': now, ':updatedAt': now,
      ':auditTop3': JSON.stringify(args.auditTop3 ?? []),
      ':auditCompletedAt': args.auditCompletedAt,
      ':intakeAnswers': JSON.stringify(args.intakeAnswers ?? {}),
      ...(args.consent ? { ':consent': JSON.stringify(args.consent), ':consentedAt': args.consentedAt ?? now } : {}),
    },
  }));
}

// Direct public S3 URLs — bucket policy grants public read on these 2 specific keys.
// No presigning, no expiration, no version info in the URL.
function getBookDownloadUrl(): string {
  return `https://${DIGITAL_BUCKET}.s3.${BUCKET_REGION}.amazonaws.com/${encodeURIComponent(BOOK_S3_KEY)}`;
}

function getWorkbookDownloadUrl(): string {
  return `https://${DIGITAL_BUCKET}.s3.${BUCKET_REGION}.amazonaws.com/${encodeURIComponent(WORKBOOK_S3_KEY)}`;
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

type RxRec = { label: string; url: string; eyebrow: string; cta: string; note?: string };

const RX_MAP: Record<string, RxRec> = {
  'hormone-balance':       { label: 'Low Testosterone / ED Consult', url: 'https://my4mlife.com/rx/testosterone-ed',       eyebrow: 'Based on Your Hormone Score', cta: 'Schedule a Testosterone Consult →' },
  'erectile-dysfunction':  { label: 'Low Testosterone / ED Consult', url: 'https://my4mlife.com/rx/testosterone-ed',       eyebrow: 'Based on Your ED Score',      cta: 'Schedule a Testosterone / ED Consult →' },
  'weight-body-fat':       { label: 'GLP-1 Weight Loss Consult',     url: 'https://my4mlife.com/rx/weight-loss',           eyebrow: 'Based on Your Weight Score',  cta: 'Schedule a GLP-1 Consult →' },
  'gut-microbiome':        { label: 'Leaky Gut Repair Consult',      url: 'https://my4mlife.com/rx/leaky-gut',             eyebrow: 'Based on Your Gut Score',     cta: 'Schedule a Gut-Repair Consult →' },
  'already-diagnosed':     { label: 'Regenerative Medicine Consult', url: 'https://my4mlife.com/rx/regenerative-medicine', eyebrow: 'Based on Your Assessment',    cta: 'Schedule a Regenerative Consult →' },
};

// Weight and gut tied (both non-zero) → one consult covers both protocols.
const COMBINED_REC: RxRec = {
  label: 'Weight + Gut Repair Consult',
  url: 'https://my4mlife.com/consult',
  eyebrow: 'Based on Your Weight + Gut Scores',
  cta: 'Schedule Your Consult →',
  note: "Your weight and your gut scored neck-and-neck — and they're tightly linked. You don't have to choose: a single telemedicine visit can cover both the GLP-1 weight protocol and the leaky-gut repair protocol together. Book one consult and we'll handle both.",
};

// Pick the single consult recommended in the welcome email.
// Priority (locked 2026-06-21):
//   1. Neurocognitive (already-diagnosed) > 0  → Regenerative, every time.
//   2. Weight or gut > 0                       → the higher of the two; if tied, the combined consult.
//   3. Otherwise (weight, gut, regen all zero) → the other categories ranked evenly by raw score;
//      recommend the highest one that maps to a consult (e.g. testosterone/ED).
// Rationale: weight + gut are our nationwide-fulfillable priorities; testosterone has no nationwide
// telemedicine yet, so it only surfaces when nothing else does.
export function getRecommendedRx(scores: any, top3: any[]): RxRec | null {
  const scoreOf = (id: string): number => {
    if (scores && typeof scores === 'object' && scores[id] != null) return Number(scores[id]) || 0;
    if (Array.isArray(top3)) {
      const t = top3.find((x: any) => String(x?.id ?? '') === id);
      if (t) return Number(t.score ?? 0) || 0;
    }
    return 0;
  };

  // 1. Neurocognitive symptoms jump to #1 unless zero.
  if (scoreOf('already-diagnosed') > 0) return RX_MAP['already-diagnosed'];

  // 2. Weight / gut — the higher of the two, unless both are zero.
  const weight = scoreOf('weight-body-fat');
  const gut = scoreOf('gut-microbiome');
  if (weight > 0 || gut > 0) {
    if (weight > 0 && gut > 0 && weight === gut) return COMBINED_REC;
    return weight >= gut ? RX_MAP['weight-body-fat'] : RX_MAP['gut-microbiome'];
  }

  // 3. All three priorities are zero: fall back to the other seven, compared evenly by raw score.
  if (!Array.isArray(top3)) return null;
  const handled = new Set(['weight-body-fat', 'gut-microbiome', 'already-diagnosed']);
  const candidates = top3
    .map((t: any) => ({ id: String(t?.id ?? ''), score: Number(t?.score ?? 0) }))
    .filter((t) => t.score > 0 && RX_MAP[t.id] && !handled.has(t.id))
    .sort((a, b) => b.score - a.score);
  if (candidates.length === 0) return null;
  return RX_MAP[candidates[0].id];
}

function buildResultsHtml(firstName: string, scores: any, top3: any[], bookUrl: string, workbookUrl: string): string {
  const safe = (s: string) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));
  const appUrl = 'https://app.my4mlife.com';
  const rxRec = getRecommendedRx(scores, top3);

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
<p style="color:#777;font-size:11px;margin:12px 0 0">Save the PDF — this download link is yours to keep and share.</p>
</div>`
    : '';

  const workbookCard = workbookUrl
    ? `<div style="margin:20px 0;padding:22px;border:2px solid #b87333;border-radius:10px;background:#fdf5ed">
<p style="font-size:12px;font-weight:700;letter-spacing:0.16em;color:#7a4c1f;text-transform:uppercase;margin:0 0 8px">Your Action Workbook</p>
<h2 style="font-family:Georgia,serif;font-size:22px;color:#0a1628;margin:0 0 6px;line-height:1.2">The Cohort Workbook — Month 1</h2>
<p style="font-style:italic;color:#666;font-size:14px;margin:0 0 12px;line-height:1.4">Print it. Mark it up. Run it daily.</p>
<p style="color:#222;font-size:14px;line-height:1.55;margin:0 0 16px">Daily check-ins, weekly reflections, tear-out scorecards, the stack reference, and the optional advanced layer. The how that pairs with the book's why.</p>
<p style="margin:0"><a href="${workbookUrl}" style="background:#b87333;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px">Download the Workbook (PDF) &rarr;</a></p>
<p style="color:#777;font-size:11px;margin:12px 0 0">Save the PDF — this download link is yours to keep and share.</p>
</div>`
    : '';

  const appCard = `<div style="margin:20px 0;padding:22px;border:2px solid #00b894;border-radius:10px;background:#f0fbf6">
<p style="font-size:12px;font-weight:700;letter-spacing:0.16em;color:#007a5e;text-transform:uppercase;margin:0 0 8px">Your App Access</p>
<h2 style="font-family:Georgia,serif;font-size:22px;color:#0a1628;margin:0 0 6px;line-height:1.2">Open the My4MLife App</h2>
<p style="color:#222;font-size:14px;line-height:1.55;margin:0 0 16px">Your dashboard, weekly Zooms with Dr. TJ, the cohort, and the daily action guide — all in one place. Sign in with this email address. We'll send a 6-digit code when you tap below — no password to remember.</p>
<p style="margin:0"><a href="${appUrl}" style="background:#00b894;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px">Open the My4MLife App &rarr;</a></p>
<p style="color:#777;font-size:11px;margin:12px 0 0">Save the app to your home screen for one-tap access.</p>
</div>`;

  const rxCard = rxRec
    ? `<div style="margin:20px 0;padding:22px;border:2px solid #1a3656;border-radius:10px;background:#f0f5fb">
<p style="font-size:12px;font-weight:700;letter-spacing:0.16em;color:#1a3656;text-transform:uppercase;margin:0 0 8px">${safe(rxRec.eyebrow)}</p>
<h2 style="font-family:Georgia,serif;font-size:20px;color:#0a1628;margin:0 0 6px;line-height:1.2">${safe(rxRec.label)}</h2>
<p style="color:#222;font-size:14px;line-height:1.55;margin:0 0 16px">${safe(rxRec.note || 'Your assessment points directly at this. If you want to address it now rather than wait, schedule a telemedicine consult with a physician in our network. No labs required for most consults; medication is billed separately after the script is written.')}</p>
<p style="margin:0"><a href="${rxRec.url}" style="background:#1a3656;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px">${safe(rxRec.cta)}</a></p>
<p style="color:#777;font-size:11px;margin:12px 0 0">This is optional — your Protégé benefits above stand on their own. The consult is for when you want clinical intervention faster than diet and lifestyle alone.</p>
</div>`
    : '';

  const coordinatorCard = `<div style="margin:28px 0 12px;padding:18px;border-top:1px solid #e2e8f0;text-align:center">
<p style="color:#333;font-size:14px;line-height:1.55;margin:0 0 12px"><strong>Want to talk to a person?</strong> Schedule a call with one of our care coordinators — they'll listen to your situation and connect you with the appropriate medical provider in our network.</p>
<p style="margin:0"><a href="https://my4mlife.com/consult" style="color:#1a3656;font-weight:600;font-size:14px;text-decoration:underline">Schedule with a Care Coordinator &rarr;</a></p>
</div>`;

  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
<h1 style="font-size:24px;color:#0a1628;margin:0 0 10px">Welcome, ${safe(firstName)}.</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55">You're officially a My4MLife Protégé. Four things are yours right now — your assessment results, the book, the workbook, and the app. Take them in any order; they're designed to work together.</p>
${top3Card}
${rxCard}
${bookCard}
${workbookCard}
${appCard}
${coordinatorCard}
<p style="color:#666;font-size:13px;font-style:italic;margin:24px 0 0;text-align:center">Begin with the end in mind. — Dr. TJ &amp; the My4MLife team</p>
</div>`;
}

async function sendResultsEmail(email: string, firstName: string, scores: any, top3: any[]): Promise<void> {
  let bookUrl = '';
  let workbookUrl = '';
  try { bookUrl = getBookDownloadUrl(); } catch (e) { console.warn('book URL build failed', e); }
  try { workbookUrl = getWorkbookDownloadUrl(); } catch (e) { console.warn('workbook URL build failed', e); }

  const subject = `Welcome to My4MLife — your results, book, workbook, and app are ready`;
  const html = buildResultsHtml(firstName, scores, top3, bookUrl, workbookUrl);
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

  // Consent record: the exact agreements (text + version + timestamp) the user accepted.
  const consent = (parsed.consent && typeof parsed.consent === 'object') ? parsed.consent : null;
  const consentedAt: string | null = consent && typeof consent.consentedAt === 'string' ? consent.consentedAt : null;
  const aiCommsConsent: boolean = !!(consent && consent.aiComms && consent.aiComms.agreed);
  const protegeTermsConsent: boolean = !!(consent && consent.protegeTerms && consent.protegeTerms.agreed);

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
    UpdateExpression: 'SET auditCompletedAt = :ts, intakeAnswers = :scores, auditTop3 = :top3, updatedAt = :ts, #ls = if_not_exists(#ls, :protege), createdAt = if_not_exists(createdAt, :ts)' + (email ? ', #em = if_not_exists(#em, :em)' : '') + (firstName ? ', firstName = if_not_exists(firstName, :fn)' : '') + (phone ? ', phone = if_not_exists(phone, :ph)' : '') + (consent ? ', consent = :consent, consentedAt = :consentAt, aiCommsConsent = :aiC, protegeConsent = :protC' : ''),
    ExpressionAttributeNames: {
      '#ls': 'lifecycleStage',
      ...(email ? { '#em': 'email' } : {}),
    },
    ExpressionAttributeValues: {
      ':ts': ts,
      ':scores': (scores && typeof scores === 'object') ? scores : {},
      ':top3': Array.isArray(top3) ? top3 : [],
      ':protege': 'protege',
      ...(email ? { ':em': email } : {}),
      ...(firstName ? { ':fn': firstName } : {}),
      ...(phone ? { ':ph': phone } : {}),
      ...(consent ? {
        ':consent': JSON.stringify(consent),
        ':consentAt': consentedAt ?? ts,
        ':aiC': aiCommsConsent,
        ':protC': protegeTermsConsent,
      } : {}),
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
          consent, consentedAt: consentedAt ?? ts,
        });
      }
    } catch (e) {
      console.warn('cognito/userprofile seed failed', e);
    }

    try {
      await sendResultsEmail(email, firstName, (scores && typeof scores === 'object') ? scores : {}, Array.isArray(top3) ? top3 : []);
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
