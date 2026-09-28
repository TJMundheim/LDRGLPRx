// DynamoDB helpers for consent e-sign (PatientRecords single-table design).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { RECORD_SK, auditSk, encounterSk, CONSENT_NPP_V1, CONSENT_PHI_AUTH_V1 } from '@my4mlife/patient-record';

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

export interface CardOnFile {
  stripeCustomerId: string;
  paymentMethodId: string;
  setupIntentId: string;
  last4?: string;
  brand?: string;
  savedAt: string;
}

/** The encounter item carries the lane/laneLabel/priceCents set at request time. */
export async function getEncounter(
  contactId: string,
  encounterId: string,
): Promise<Record<string, any> | undefined> {
  const res = await ddb.send(new GetCommand({
    TableName: TABLE, Key: { contactId, sk: encounterSk(encounterId) },
  }));
  return res.Item as Record<string, any> | undefined;
}

export function readCardOnFile(record?: Record<string, any>): Partial<CardOnFile> {
  const c = record?.cardOnFile;
  return (c && typeof c === 'object' && !Array.isArray(c)) ? (c as Partial<CardOnFile>) : {};
}

export function hasCard(record?: Record<string, any>): boolean {
  return typeof readCardOnFile(record).paymentMethodId === 'string';
}

/**
 * Merge the saved card into record.cardOnFile. The map is bootstrapped first
 * (same reason as writeConsents: DynamoDB rejects a nested SET on a missing
 * map) and only the six card fields are written, so anything another writer
 * put there survives.
 */
export async function writeCardOnFile(contactId: string, card: CardOnFile): Promise<void> {
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { contactId, sk: RECORD_SK },
    UpdateExpression: 'SET #c = if_not_exists(#c, :empty)',
    ExpressionAttributeNames: { '#c': 'cardOnFile' },
    ExpressionAttributeValues: { ':empty': {} },
  }));

  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { contactId, sk: RECORD_SK },
    UpdateExpression:
      'SET #c.stripeCustomerId = :cus, #c.paymentMethodId = :pm, #c.setupIntentId = :si, '
      + '#c.last4 = :l4, #c.brand = :br, #c.savedAt = :at, updatedAt = :at',
    ExpressionAttributeNames: { '#c': 'cardOnFile' },
    ExpressionAttributeValues: {
      ':cus': card.stripeCustomerId, ':pm': card.paymentMethodId, ':si': card.setupIntentId,
      ':l4': card.last4 ?? '', ':br': card.brand ?? '', ':at': card.savedAt,
    },
  }));
}

export async function writeCardAudit(
  contactId: string, encounterId: string, ts: string, brand?: string, last4?: string,
): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      contactId, sk: auditSk(ts, 1), at: ts, encounterId, action: 'card.saved',
      detail: { brand: brand ?? '', last4: last4 ?? '' },
    },
  }));
}
