import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));

// Contact row first; the patient record's demographics are the fallback (older orders may have no Contact row under this id).
export async function loadContact(contactId: string): Promise<{ email: string; firstName: string } | null> {
  const r = await ddb.send(new GetCommand({ TableName: process.env.CONTACT_TABLE ?? 'Contact', Key: { contactId } }));
  if (r.Item?.email) return { email: String(r.Item.email), firstName: String(r.Item.firstName ?? '') };
  const d = (await ddb.send(new GetCommand({ TableName: process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords', Key: { contactId, sk: 'record' } }))).Item?.demographics;
  return d?.email ? { email: String(d.email), firstName: String(d.firstName ?? '') } : null;
}
