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

/** Upsert the plan item to state 'sending' with the (possibly coordinator-edited)
 *  json BEFORE the patient email goes out, so a mail failure still leaves a
 *  record. contactId is the table's partition key and must never appear in
 *  SET — only non-key attrs may use if_not_exists here. */
export async function upsertPlanSending(contactId: string, encounterId: string, json: unknown, ts: string): Promise<void> {
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { contactId, sk: planSk(encounterId) },
    UpdateExpression: 'SET #st = :sending, json = :json, updatedAt = :ts, encounterId = if_not_exists(encounterId, :eid), createdAt = if_not_exists(createdAt, :ts)',
    ExpressionAttributeNames: { '#st': 'state' },
    ExpressionAttributeValues: { ':sending': 'sending', ':json': json, ':ts': ts, ':eid': encounterId },
  }));
}

export async function markPlanSent(contactId: string, encounterId: string, json: unknown, ts: string): Promise<void> {
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { contactId, sk: planSk(encounterId) },
    UpdateExpression: 'SET #st = :sent, json = :json, updatedAt = :ts, sentAt = :ts, encounterId = if_not_exists(encounterId, :eid), createdAt = if_not_exists(createdAt, :ts)',
    ExpressionAttributeNames: { '#st': 'state' },
    ExpressionAttributeValues: { ':sent': 'sent', ':json': json, ':ts': ts, ':eid': encounterId },
  }));
}

export async function writeAudit(contactId: string, encounterId: string, action: string, ts: string): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { contactId, sk: auditSk(ts, 0), action, encounterId, at: ts },
  }));
}
