import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE = process.env['PATIENT_RECORDS_TABLE'] ?? 'PatientRecords';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env['AWS_REGION'] ?? 'us-east-2' }));
const isCondFail = (e: unknown) => (e as { name?: string }).name === 'ConditionalCheckFailedException';

export interface DeclinedEnc { contactId: string; sk: string; declinedAt?: string; refundDueBy?: string }

/**
 * PatientRecords has no GSI on (lane, state), so this is a paginated Scan with a filter. Volume is low
 * (one encounter per Push Patch order; declined + refund-pending is a small subset). If the table grows,
 * add a sparse GSI keyed on refundStatus and Query it instead.
 */
export async function findDeclinedPending(): Promise<DeclinedEnc[]> {
  const out: DeclinedEnc[] = [];
  let key: Record<string, unknown> | undefined;
  do {
    const r = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'begins_with(sk, :p) AND lane = :lane AND #state = :st AND refundStatus = :rs AND attribute_not_exists(refundReminderSentAt)',
      ExpressionAttributeNames: { '#state': 'state' },
      ExpressionAttributeValues: { ':p': 'encounter#pp-', ':lane': 'push-patch', ':st': 'declined', ':rs': 'pending' },
      ProjectionExpression: 'contactId, sk, declinedAt, refundDueBy',
      ...(key ? { ExclusiveStartKey: key } : {}),
    }));
    out.push(...((r?.Items ?? []) as DeclinedEnc[]));
    key = r?.LastEvaluatedKey;
  } while (key);
  return out;
}

/** Conditional claim; false if another run already stamped it. */
export async function claimReminder(e: DeclinedEnc, nowIso: string): Promise<boolean> {
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE, Key: { contactId: e.contactId, sk: e.sk },
      UpdateExpression: 'SET refundReminderSentAt = :now',
      ConditionExpression: 'attribute_not_exists(refundReminderSentAt)',
      ExpressionAttributeValues: { ':now': nowIso },
    }));
    return true;
  } catch (err) {
    if (isCondFail(err)) return false;
    throw err;
  }
}

/** Undo a claim whose email failed so the next sweep retries. Best-effort. */
export async function releaseReminder(e: DeclinedEnc, nowIso: string): Promise<void> {
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE, Key: { contactId: e.contactId, sk: e.sk },
      UpdateExpression: 'REMOVE refundReminderSentAt',
      ConditionExpression: 'refundReminderSentAt = :now',
      ExpressionAttributeValues: { ':now': nowIso },
    }));
  } catch (err) {
    if (!isCondFail(err)) console.error('[push-patch-reminder] refund release failed', { sk: e.sk });
  }
}

/** "J. Smith" from the patient's record item, or '' if unavailable. Best-effort (internal email only). */
export async function lookupName(contactId: string): Promise<string> {
  try {
    const d = (await ddb.send(new GetCommand({ TableName: TABLE, Key: { contactId, sk: 'record' } })))?.Item?.demographics ?? {};
    const first = String(d.firstName ?? '').trim();
    const last = String(d.lastName ?? '').trim();
    return `${first ? `${first[0].toUpperCase()}. ` : ''}${last}`.trim();
  } catch {
    return '';
  }
}
