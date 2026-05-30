import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { v5 as uuidv5 } from 'uuid';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';
const USER_PROFILE_TABLE = process.env.USER_PROFILE_TABLE ?? 'Users';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? '';
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';

export const NAMESPACE = 'f0e1d2c3-b4a5-4968-87a6-95c4d3e2f1a0';

const cognito = new CognitoIdentityProviderClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const lambda = new LambdaClient({ region: REGION });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RE = /^\+[1-9]\d{6,14}$/;

function reply(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
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
  if (args.auditTop3 !== undefined && args.auditTop3 !== null) {
    sets.push('#auditTop3 = if_not_exists(#auditTop3, :auditTop3)');
    names['#auditTop3'] = 'auditTop3';
    values[':auditTop3'] = JSON.stringify(args.auditTop3);
  }
  if (args.auditCompletedAt) {
    sets.push('#auditCompletedAt = if_not_exists(#auditCompletedAt, :auditCompletedAt)');
    names['#auditCompletedAt'] = 'auditCompletedAt';
    values[':auditCompletedAt'] = args.auditCompletedAt;
  }
  if (args.intakeAnswers !== undefined && args.intakeAnswers !== null) {
    sets.push('#intakeAnswers = if_not_exists(#intakeAnswers, :intakeAnswers)');
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

async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  const appUrl = 'https://app.my4mlife.com';
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px">
<h1 style="font-size:22px;color:#111">Welcome, ${firstName}.</h1>
<p>You're a Protégé — free app access, weekly Zooms, and 15% off your first order are all yours.</p>
<p style="margin:24px 0"><a href="${appUrl}" style="background:#00b894;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Open the My4MLife App &rarr;</a></p>
<p style="color:#444;font-size:14px;line-height:1.55">When you open the app, we'll email you a one-time sign-in code. Use that code to enter — there's no password to remember.</p>
<p style="color:#666;font-size:13px;margin-top:24px">Begin with the end in mind. — Dr. TJ &amp; the My4MLife team</p></div>`;
  const payload = { kind: 'info', to: email, subject: 'Welcome to My4MLife — your account is ready', html };
  await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'Event',
    Payload: Buffer.from(JSON.stringify(payload)),
  }));
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if ((event as any).requestContext?.http?.method === 'OPTIONS') return reply(204, {});

  let body: any;
  try { body = event.body ? JSON.parse(event.body) : {}; } catch { return reply(400, { error: 'invalid JSON' }); }

  const emailRaw: string | undefined = body.email;
  if (!emailRaw || typeof emailRaw !== 'string') return reply(400, { error: 'email required' });
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return reply(400, { error: 'malformed email' });

  const firstName: string | undefined = body.firstName && typeof body.firstName === 'string' ? body.firstName.trim() : undefined;
  if (!firstName) return reply(400, { error: 'firstName required' });

  const phone: string | undefined = body.phone ? String(body.phone).trim() : undefined;
  if (!phone) return reply(400, { error: 'phone required' });
  if (!E164_RE.test(phone)) return reply(400, { error: 'phone must be E.164 (e.g. +15551234567)' });

  const consent = body.consent;
  if (!consent || consent.ai !== true || consent.protege !== true) {
    return reply(400, { error: 'consent.ai and consent.protege must both be true' });
  }

  let alreadyExists = false;
  let sub: string | null = null;
  try {
    ({ alreadyExists, sub } = await ensureCognitoUser(email, firstName));
  } catch {
    return reply(500, { error: 'cognito error' });
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
    if (e?.name !== 'ConditionalCheckFailedException') return reply(500, { error: 'write failed' });
  }

  // Seed UserProfile (Users table) with audit data so the app skips the intake gate.
  // Failures here MUST NOT fail the signup.
  if (sub) {
    try {
      const audit = await readContactAudit(contactId);
      await seedUserProfile({ sub, email, firstName, phone, ...audit });
    } catch (err) {
      console.warn('[protege-signup] UserProfile seed failed:', err);
    }
  }

  if (!alreadyExists) {
    try { await sendWelcomeEmail(email, firstName); } catch { /* non-fatal */ }
  }

  return reply(200, { ok: true, ...(alreadyExists ? { alreadyExists: true } : {}) });
};
