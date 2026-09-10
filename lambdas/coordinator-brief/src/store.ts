// Persists the generated brief and an audit-trail entry to PatientRecords.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { auditSk } from '@my4mlife/patient-record';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const PATIENT_RECORDS_TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

/** Stores the brief as a DynamoDB map — NOT a JSON string. The `json` field is
 *  exposed as an AWSJSON scalar, which AppSync serialises on read; handing it a
 *  pre-stringified value would double-encode it and break the admin parsers. */
export async function storeBrief(contactId: string, encounterId: string, json: unknown, createdAt: string): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: PATIENT_RECORDS_TABLE,
    Item: { contactId, sk: `brief#${encounterId}`, encounterId, json, createdAt },
  }));
}

export async function storeAudit(contactId: string, actor: string): Promise<void> {
  const now = new Date().toISOString();
  await ddb.send(new PutCommand({
    TableName: PATIENT_RECORDS_TABLE,
    Item: { contactId, sk: auditSk(now, 0), action: 'brief.generated', actor, at: now },
  }));
}
