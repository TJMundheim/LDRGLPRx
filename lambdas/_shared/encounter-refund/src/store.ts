// PatientRecords access for the refund flow: loads, the conditional claim, finalize, rollback, audit.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { RECORD_SK, encounterSk, auditSk } from '@my4mlife/patient-record';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));
const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';
const NAMES = { '#rs': 'refundStatus', '#state': 'state' };

type Item = Record<string, any>;
const key = (contactId: string, encounterId: string) => ({ contactId, sk: encounterSk(encounterId) });
const isCondFail = (e: unknown) => (e as { name?: string })?.name === 'ConditionalCheckFailedException';

export async function load(contactId: string, encounterId: string): Promise<{ enc?: Item; record?: Item }> {
  const get = async (Key: Item) => (await ddb.send(new GetCommand({ TableName: TABLE, Key }))).Item as Item | undefined;
  const [enc, record] = await Promise.all([get(key(contactId, encounterId)), get({ contactId, sk: RECORD_SK })]);
  return { enc, record };
}

/** pending → processing. Also re-asserts declined + never-sent-to-Genesis atomically. False = lost the race. */
export async function claim(contactId: string, encounterId: string): Promise<boolean> {
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE, Key: key(contactId, encounterId),
      UpdateExpression: 'SET #rs = :processing, updatedAt = :now',
      ConditionExpression: '#rs = :pending AND #state = :declined AND attribute_not_exists(genesisOrderSentAt)',
      ExpressionAttributeNames: NAMES,
      ExpressionAttributeValues: { ':pending': 'pending', ':processing': 'processing', ':declined': 'declined', ':now': new Date().toISOString() },
    }));
    return true;
  } catch (e) {
    if (isCondFail(e)) return false;
    throw e;
  }
}

/** processing → pending after a failed Stripe call. */
export async function rollback(contactId: string, encounterId: string): Promise<void> {
  await ddb.send(new UpdateCommand({
    TableName: TABLE, Key: key(contactId, encounterId),
    UpdateExpression: 'SET #rs = :pending, updatedAt = :now',
    ConditionExpression: '#rs = :processing',
    ExpressionAttributeNames: NAMES,
    ExpressionAttributeValues: { ':pending': 'pending', ':processing': 'processing', ':now': new Date().toISOString() },
  }));
}

/** processing → refunded, plus the audit row. */
export async function finalize(a: { contactId: string; encounterId: string; refundId: string; amountCents: number; actor: string }): Promise<void> {
  const now = new Date().toISOString();
  await ddb.send(new UpdateCommand({
    TableName: TABLE, Key: key(a.contactId, a.encounterId),
    UpdateExpression: 'SET #rs = :refunded, refundedAt = :now, refundId = :rid, refundedBy = :by, refundAmountCents = :amt, updatedAt = :now',
    ConditionExpression: '#rs = :processing',
    ExpressionAttributeNames: NAMES,
    ExpressionAttributeValues: { ':refunded': 'refunded', ':processing': 'processing', ':now': now, ':rid': a.refundId, ':by': a.actor, ':amt': a.amountCents },
  }));
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { contactId: a.contactId, sk: auditSk(now, 0), at: now, action: `refunded: $${(a.amountCents / 100).toFixed(2)}`, detail: `refundId=${a.refundId}`, actor: a.actor },
  }));
}
