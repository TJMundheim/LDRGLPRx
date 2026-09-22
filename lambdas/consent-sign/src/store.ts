// DynamoDB helpers for consent e-sign (PatientRecords single-table design).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { RECORD_SK, auditSk, CONSENT_NPP_V1, CONSENT_PHI_AUTH_V1 } from '@my4mlife/patient-record';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export interface SignedConsent {
  version: string;
  legalVersion: string;
  at: string;
  typedName: string;
  ip?: string;
  userAgent?: string;
}

export async function getRecord(contactId: string): Promise<Record<string, any> | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { contactId, sk: RECORD_SK } }));
  return res.Item as Record<string, any> | undefined;
}

/** Both consents are stored as JSON strings in the record's `consents` map. */
export function readConsents(record?: Record<string, any>): { npp?: SignedConsent; phi?: SignedConsent } {
  const map = (record?.consents ?? {}) as Record<string, unknown>;
  const parse = (v: unknown): SignedConsent | undefined => {
    if (typeof v === 'string') { try { return JSON.parse(v) as SignedConsent; } catch { return undefined; } }
    return (v as SignedConsent) || undefined;
  };
  return { npp: parse(map[CONSENT_NPP_V1]), phi: parse(map[CONSENT_PHI_AUTH_V1]) };
}

export async function writeConsents(contactId: string, npp: SignedConsent, phi: SignedConsent, ts: string): Promise<void> {
  // A record created by patient-record-intake has no `consents` attribute
  // unless the intake carried consents, and DynamoDB rejects a nested SET on a
  // missing map ("document path ... invalid"). Bootstrap the map first — the
  // if_not_exists keeps this a no-op for records that already have one.
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { contactId, sk: RECORD_SK },
    UpdateExpression: 'SET #c = if_not_exists(#c, :empty)',
    ExpressionAttributeNames: { '#c': 'consents' },
    ExpressionAttributeValues: { ':empty': {} },
  }));

  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { contactId, sk: RECORD_SK },
    UpdateExpression: 'SET #c.#npp = :npp, #c.#phi = :phi, updatedAt = :ts',
    ExpressionAttributeNames: { '#c': 'consents', '#npp': CONSENT_NPP_V1, '#phi': CONSENT_PHI_AUTH_V1 },
    ExpressionAttributeValues: { ':npp': JSON.stringify(npp), ':phi': JSON.stringify(phi), ':ts': ts },
  }));
}

export async function writeAudit(contactId: string, encounterId: string, ts: string): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      contactId,
      sk: auditSk(ts, 0),
      at: ts,
      encounterId,
      action: 'consent.signed',
      detail: { npp: true, phiAuth: true },
    },
  }));
}
