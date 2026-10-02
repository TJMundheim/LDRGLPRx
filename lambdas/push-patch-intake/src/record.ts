import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { RECORD_SK, encounterSk } from '@my4mlife/patient-record';
import type { PushPatchBody } from './validate';
import { buildRecordUpdates } from './upsert';
import type { StoredScreening } from './screening';
import type { ShipTo, StripeShipping } from './ship';

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
  shipping_details?: StripeShipping | null;
}

const isConditional = (e: unknown) => (e as { name?: string })?.name === 'ConditionalCheckFailedException';

/** Deterministic: `pp-${sessionId}` so a second submit collides on the conditional put. */
export const encounterIdFor = (sessionId: string): string => `pp-${sessionId}`;

/** Conditional put of the Encounter. Runs FIRST so a duplicate never touches the record or consent. */
export async function createEncounter(a: {
  contactId: string; encounterId: string; sku: string; sessionId: string; paymentIntentId: string; shipTo: ShipTo; ts: string;
}): Promise<'created' | 'duplicate'> {
  try {
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        contactId: a.contactId, sk: encounterSk(a.encounterId), encounterId: a.encounterId,
        lane: 'push-patch', category: 'push-patch', visitType: 'async', sku: a.sku,
        sessionId: a.sessionId, paymentIntentId: a.paymentIntentId, shipTo: a.shipTo, state: 'sent-to-provider',
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

/** Upsert the root PatientRecord without removing existing data: nested SETs only (see upsert.ts). */
export async function upsertRecord(a: {
  contactId: string; session: PaidSession; body: PushPatchBody; shipTo: ShipTo; screening: StoredScreening; ts: string;
}): Promise<void> {
  const { contactId, session, body, shipTo, screening, ts } = a;
  const [first = '', ...rest] = (session.customer_details?.name ?? '').trim().split(/\s+/);
  const updates = buildRecordUpdates({
    demographics: {
      firstName: first, lastName: rest.join(' '),
      email: (session.customer_details?.email ?? '').trim().toLowerCase(),
      phone: body.phone, dob: body.dob, sex: body.sex,
      state: shipTo.state,
    },
    history: { medications: body.medications, allergies: body.allergies, conditions: body.conditions },
    screening,
    consentKey: CONSENT_KEY,
    consent: { version: CONSENT_KEY, agreed: true, name: body.consentName, at: ts },
    ts,
  });
  for (const u of updates) await ddb.send(new UpdateCommand({ TableName: TABLE, Key: { contactId, sk: RECORD_SK }, ...u }));
}
