// Pending (unpaid) intake: a TTL'd item in PatientRecords holding the health form + signature until
// Stripe confirms payment. PHI lives here only; it is deleted on finalize and expires after 30 days.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { HealthFields } from './validate';

const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));

export const PENDING_TTL_SECONDS = 30 * 86400;
const pendingSk = (intakeId: string) => `pending-intake#${intakeId}`;

export interface PendingIntake extends HealthFields {
  contactId: string; sk: string; intakeId: string;
  email: string; firstName: string; lastName: string; skuId: string;
  signedAt: string; ip?: string; userAgent?: string; ttl: number;
}

export async function putPending(a: Omit<PendingIntake, 'sk' | 'ttl'>, now = new Date()): Promise<void> {
  const item: PendingIntake = { ...a, sk: pendingSk(a.intakeId), ttl: Math.floor(now.getTime() / 1000) + PENDING_TTL_SECONDS };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
}

/** The live pending intake, or null. DynamoDB TTL deletes late, so an item with ttl < now counts as missing. */
export async function getPending(contactId: string, intakeId: string): Promise<PendingIntake | null> {
  const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { contactId, sk: pendingSk(intakeId) }, ConsistentRead: true }));
  const item = r.Item as PendingIntake | undefined;
  return item && item.ttl >= Math.floor(Date.now() / 1000) ? item : null;
}

/** Best-effort: a failed delete leaves the item to expire by TTL. */
export async function deletePending(contactId: string, intakeId: string): Promise<void> {
  try {
    await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { contactId, sk: pendingSk(intakeId) } }));
  } catch (e) {
    console.error('[push-patch-intake] pending delete failed', { error: (e as { name?: string })?.name ?? 'Error' });
  }
}
