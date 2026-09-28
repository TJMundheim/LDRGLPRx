// DynamoDB helpers for the consent-request flow (PatientRecords single-table design).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { RECORD_SK, auditSk, encounterSk } from '@my4mlife/patient-record';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export async function getRecord(contactId: string): Promise<Record<string, unknown> | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { contactId, sk: RECORD_SK } }));
  return res.Item as Record<string, unknown> | undefined;
}

export async function writeConsentRequestedAudit(
  contactId: string,
  encounterId: string,
  sentTo: string,
  ts: string,
): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { contactId, sk: auditSk(ts, 0), action: 'consent.requested', encounterId, sentTo, at: ts },
  }));
}

/**
 * Stamp the chosen treatment lane + price on the encounter item so the e-sign
 * page can name the product on the card step. SET only — never clears other
 * encounter attributes.
 */
export async function writeEncounterLane(
  contactId: string,
  encounterId: string,
  lane: string,
  label: string,
  priceCents: number,
  ts: string,
): Promise<void> {
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { contactId, sk: encounterSk(encounterId) },
    UpdateExpression: 'SET #lane = :lane, laneLabel = :label, priceCents = :price, updatedAt = :ts',
    ExpressionAttributeNames: { '#lane': 'lane' },
    ExpressionAttributeValues: {
      ':lane': lane, ':label': label, ':price': priceCents, ':ts': ts,
    },
  }));
}
