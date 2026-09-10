// DynamoDB helpers for the plan-of-action flow (PatientRecords single-table design).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { RECORD_SK, auditSk } from '@my4mlife/patient-record';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export const briefSk = (encounterId: string) => `brief#${encounterId}`;
export const planSk = (encounterId: string) => `plan#${encounterId}`;

export async function getRecord(contactId: string): Promise<Record<string, unknown> | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { contactId, sk: RECORD_SK } }));
  return res.Item as Record<string, unknown> | undefined;
}

export async function getBrief(contactId: string, encounterId: string): Promise<Record<string, unknown> | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { contactId, sk: briefSk(encounterId) } }));
  return res.Item as Record<string, unknown> | undefined;
}

export async function getPlan(contactId: string, encounterId: string): Promise<Record<string, unknown> | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { contactId, sk: planSk(encounterId) } }));
  return res.Item as Record<string, unknown> | undefined;
}

export async function putDraftPlan(contactId: string, encounterId: string, json: unknown, ts: string): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { contactId, sk: planSk(encounterId), encounterId, state: 'draft', json, createdAt: ts, updatedAt: ts },
  }));
}

export async function markPlanSent(contactId: string, encounterId: string, json: unknown, ts: string): Promise<void> {
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { contactId, sk: planSk(encounterId) },
    UpdateExpression: 'SET #st = :sent, json = :json, updatedAt = :ts, sentAt = :ts, contactId = if_not_exists(contactId, :cid), encounterId = if_not_exists(encounterId, :eid), createdAt = if_not_exists(createdAt, :ts)',
    ExpressionAttributeNames: { '#st': 'state' },
    ExpressionAttributeValues: { ':sent': 'sent', ':json': json, ':ts': ts, ':cid': contactId, ':eid': encounterId },
  }));
}

export async function writeAudit(contactId: string, encounterId: string, action: string, ts: string): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { contactId, sk: auditSk(ts, 0), action, encounterId, at: ts },
  }));
}
