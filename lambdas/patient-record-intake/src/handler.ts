import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { deriveContactId } from '@my4mlife/contact-id';
import { RECORD_SK, encounterSk, auditSk, forcedVisitType, CONSENT_NPP_V1, CONSENT_PHI_AUTH_V1 } from '@my4mlife/patient-record';
import { captureContact } from './contact';
import { corsHeaders, reply, sanitiseCard, serialiseConsents } from './helpers';
import { typedSignature } from './signature';
import { signAtIntake, writeConsentKeys } from './intakeConsents';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';
const COORDINATOR_BRIEF_FN = process.env.COORDINATOR_BRIEF_FN ?? 'my4mlife-coordinator-brief';

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

  // Serialise client consents (contact etc.) as JSON strings. The NPP + Patient Authorization
  // are NEVER taken from the client — a forged key would lift the physician hand-off gate;
  // they are built server-side from privacySign below.
  const consents = parsed.consents && typeof parsed.consents === 'object'
    ? serialiseConsents(parsed.consents as Record<string, unknown>)
    : {};
  delete consents[CONSENT_NPP_V1];
  delete consents[CONSENT_PHI_AUTH_V1];

  // ── Write 1: root PatientRecord item — MERGE, never blind-overwrite ──────────
  // Audit 2026-07-07: this is a public /api endpoint keyed by uuidv5(email). A
  // full Put let anyone re-post an email and wipe an existing patient's card /
  // consents. We now only SET fields that were actually provided, and never
  // clobber cardOnFile / consents with null. createdAt is set once.
  const setParts = ['updatedAt = :ts', 'createdAt = if_not_exists(createdAt, :ts)'];
  const names: Record<string, string> = {};
  const vals: Record<string, unknown> = { ':ts': ts };
  // demographics always carries the validated email — plan-of-action reads the patient address from record.demographics.email.
  if (parsed.demographics && typeof parsed.demographics === 'object') { setParts.push('demographics = :dem'); vals[':dem'] = { ...(parsed.demographics as Record<string, unknown>), email }; }
  if (parsed.history !== undefined) { setParts.push('history = :hist'); vals[':hist'] = parsed.history ?? null; }
  if (parsed.screeningAnswers !== undefined) { setParts.push('screeningAnswers = :scr'); vals[':scr'] = parsed.screeningAnswers ?? null; }
  if (cardOnFile !== undefined) { setParts.push('cardOnFile = :card'); vals[':card'] = cardOnFile; }
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { contactId, sk: RECORD_SK },
    UpdateExpression: `SET ${setParts.join(', ')}`,
    ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
    ExpressionAttributeValues: vals,
  }));

  // Merge client consent keys one by one — a re-submit never wipes signatures collected elsewhere.
  await writeConsentKeys(ddb, contactId, consents, ts);

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

  await captureContact(ddb, email, category, parsed.demographics);

  // ── Typed e-signature → NPP + Patient Authorization (server-built; never fails the intake) ──
  const demo = parsed.demographics as { firstName?: string; lastName?: string } | undefined;
  const typedName = typedSignature(parsed, demo);
  const http = event.requestContext?.http;
  const consentsSigned = typedName
    ? await signAtIntake(ddb, lambda, {
        contactId, encounterId, typedName, at: ts, ip: http?.sourceIp, userAgent: http?.userAgent, email,
        name: [demo?.firstName, demo?.lastName].filter(Boolean).join(' ') || 'Patient',
      })
    : false;

  // ── Fire-and-forget coordinator notification ─────────────────────────────────
  try {
    const notifyPayload = { kind: 'coordinator-notify', contactId, encounterId, category, email };
    await lambda.send(new InvokeCommand({
      FunctionName: COORDINATOR_BRIEF_FN,
      InvocationType: 'Event',
      Payload: Buffer.from(JSON.stringify(notifyPayload)),
    }));
  } catch (e) {
    console.warn('coordinator notify invoke failed', e);
  }

  return reply(200, { ok: true, contactId, encounterId, consentsSigned }, origin);
};
