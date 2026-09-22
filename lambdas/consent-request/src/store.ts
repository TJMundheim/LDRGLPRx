// DynamoDB helpers for the consent-request flow (PatientRecords single-table design).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { RECORD_SK, auditSk } from '@my4mlife/patient-record';

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
