import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { deriveContactId } from '@my4mlife/contact-id';
import { RECORD_SK, encounterSk, auditSk, forcedVisitType } from '@my4mlife/patient-record';
import { corsHeaders, reply, sanitiseCard, serialiseConsents } from './helpers';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const lambda = new LambdaClient({ region: REGION });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = (event.headers?.['origin'] ?? event.headers?.['Origin']) as string | undefined;

  if (event.requestContext?.http?.method === 'OPTIONS') return reply(204, {}, origin);
  if (!event.body) return reply(400, { error: 'missing body' }, origin);

  let parsed: any;
  try { parsed = JSON.parse(event.body); } catch { return reply(400, { error: 'invalid json' }, origin); }

  const rawEmail: string | undefined = parsed.email;
  if (!rawEmail || typeof rawEmail !== 'string' || !EMAIL_RE.test(rawEmail.trim())) {
    return reply(400, { error: 'email required' }, origin);
  }

  const email = rawEmail.trim().toLowerCase();
  const contactId = deriveContactId(email);
  const category: string = parsed.category ?? 'general';
  const ts = new Date().toISOString();
  const encounterId = crypto.randomUUID();

  // Sanitise card — whitelist only tokenized Stripe references.
  const cardOnFile = parsed.cardOnFile && typeof parsed.cardOnFile === 'object'
    ? sanitiseCard(parsed.cardOnFile as Record<string, unknown>)
    : undefined;

  // Serialise consents — each consent value stored as JSON string with version + at.
  const consents = parsed.consents && typeof parsed.consents === 'object'
    ? serialiseConsents(parsed.consents as Record<string, unknown>)
    : undefined;

  // ── Write 1: root PatientRecord item ────────────────────────────────────────
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      contactId,
      sk: RECORD_SK,
      demographics: parsed.demographics ?? {},
      history: parsed.history ?? null,
      screeningAnswers: parsed.screeningAnswers ?? null,
      consents,
      cardOnFile,
      createdAt: ts,
      updatedAt: ts,
    },
  }));

  // ── Write 2: encounter item ──────────────────────────────────────────────────
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      contactId,
      sk: encounterSk(encounterId),
      encounterId,
      category,
      state: 'new',
      visitType: forcedVisitType(category),
      createdAt: ts,
      updatedAt: ts,
    },
  }));

  // ── Write 3: audit item ──────────────────────────────────────────────────────
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      contactId,
      sk: auditSk(ts, 0),
      action: 'record-created',
      encounterId,
      category,
      at: ts,
      actor: 'patient',
    },
  }));

  // ── Fire-and-forget coordinator notification ─────────────────────────────────
  try {
    const notifyPayload = { kind: 'coordinator-notify', contactId, encounterId, category, email };
    await lambda.send(new InvokeCommand({
      FunctionName: EMAIL_SENDER_FN,
      InvocationType: 'Event',
      Payload: Buffer.from(JSON.stringify(notifyPayload)),
    }));
  } catch (e) {
    console.warn('coordinator notify invoke failed', e);
  }

  return reply(200, { ok: true, contactId, encounterId }, origin);
};
