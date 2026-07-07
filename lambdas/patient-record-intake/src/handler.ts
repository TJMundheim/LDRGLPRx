import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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

  // ── Write 1: root PatientRecord item — MERGE, never blind-overwrite ──────────
  // Audit 2026-07-07: this is a public /api endpoint keyed by uuidv5(email). A
  // full Put let anyone re-post an email and wipe an existing patient's card /
  // consents. We now only SET fields that were actually provided, and never
  // clobber cardOnFile / consents with null. createdAt is set once.
  const setParts = ['updatedAt = :ts', 'createdAt = if_not_exists(createdAt, :ts)'];
  const names: Record<string, string> = {};
  const vals: Record<string, unknown> = { ':ts': ts };
  if (parsed.demographics && typeof parsed.demographics === 'object') { setParts.push('demographics = :dem'); vals[':dem'] = parsed.demographics; }
  if (parsed.history !== undefined) { setParts.push('history = :hist'); vals[':hist'] = parsed.history ?? null; }
  if (parsed.screeningAnswers !== undefined) { setParts.push('screeningAnswers = :scr'); vals[':scr'] = parsed.screeningAnswers ?? null; }
  if (consents !== undefined) { setParts.push('consents = :con'); vals[':con'] = consents; }
  if (cardOnFile !== undefined) { setParts.push('cardOnFile = :card'); vals[':card'] = cardOnFile; }
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { contactId, sk: RECORD_SK },
    UpdateExpression: `SET ${setParts.join(', ')}`,
    ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
    ExpressionAttributeValues: vals,
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
