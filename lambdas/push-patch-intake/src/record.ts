import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { RECORD_SK, encounterSk } from '@my4mlife/patient-record';
import type { PushPatchBody } from './validate';

export const CONSENT_KEY = 'consent-telehealth-push-patch-v1';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export interface PaidSession {
  id: string;
  payment_status?: string | null;
  payment_intent?: string | { id: string } | null;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null; name?: string | null; phone?: string | null } | null;
  shipping_details?: { name?: string | null; address?: Record<string, string | null> | null } | null;
}

const isConditional = (e: unknown) => (e as { name?: string })?.name === 'ConditionalCheckFailedException';

/** Deterministic: `pp-${sessionId}` so a second submit collides on the conditional put. */
export const encounterIdFor = (sessionId: string): string => `pp-${sessionId}`;

/** Conditional put of the Encounter. Runs FIRST so a duplicate never touches the record or consent. */
export async function createEncounter(a: {
  contactId: string; encounterId: string; sku: string; sessionId: string; paymentIntentId: string; ts: string;
}): Promise<'created' | 'duplicate'> {
  try {
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        contactId: a.contactId, sk: encounterSk(a.encounterId), encounterId: a.encounterId,
        lane: 'push-patch', category: 'push-patch', visitType: 'async', sku: a.sku,
        sessionId: a.sessionId, paymentIntentId: a.paymentIntentId, state: 'sent-to-provider',
        createdAt: a.ts, updatedAt: a.ts,
      },
      ConditionExpression: 'attribute_not_exists(sk)',
    }));
    return 'created';
  } catch (e) {
    if (isConditional(e)) return 'duplicate';
    throw e;
  }
}

/** Retry gap: remove a just-created encounter (only while still sent-to-provider) so the buyer can resubmit. */
export async function deleteEncounter(contactId: string, encounterId: string): Promise<void> {
  try {
    await ddb.send(new DeleteCommand({
      TableName: TABLE,
      Key: { contactId, sk: encounterSk(encounterId) },
      ConditionExpression: '#s = :sent',
      ExpressionAttributeNames: { '#s': 'state' },
      ExpressionAttributeValues: { ':sent': 'sent-to-provider' },
    }));
  } catch (e) {
    if (!isConditional(e)) console.error('[push-patch-intake] rollback failed', { encounterId });
  }
}

/** Upsert the root PatientRecord: demographics, history, screeningAnswers, consents[CONSENT_KEY]. */
export async function upsertRecord(a: {
  contactId: string; session: PaidSession; body: PushPatchBody; ts: string;
}): Promise<void> {
  const { contactId, session, body, ts } = a;
  const [first = '', ...rest] = (session.customer_details?.name ?? '').trim().split(/\s+/);
  const consent = { version: CONSENT_KEY, agreed: true, name: body.consentName, at: ts };
  const key = { contactId, sk: RECORD_SK };
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: key,
    UpdateExpression: 'SET demographics = :dem, history = :hist, screeningAnswers = :scr, '
      + 'consents = if_not_exists(consents, :con), updatedAt = :ts, createdAt = if_not_exists(createdAt, :ts)',
    ExpressionAttributeValues: {
      ':dem': {
        firstName: first, lastName: rest.join(' '),
        email: (session.customer_details?.email ?? '').trim().toLowerCase(),
        phone: body.phone, dob: body.dob, sex: body.sex,
        ...(session.shipping_details?.address?.state ? { state: session.shipping_details.address.state } : {}),
      },
      ':hist': { medications: body.medications, allergies: body.allergies, conditions: body.conditions },
      ':scr': body.screening,
      ':con': { [CONSENT_KEY]: consent },
      ':ts': ts,
    },
  }));
  // The map may already exist from another consent; make sure this one is on it.
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: key,
    UpdateExpression: 'SET consents.#k = :c',
    ExpressionAttributeNames: { '#k': CONSENT_KEY },
    ExpressionAttributeValues: { ':c': consent },
  }));
}
