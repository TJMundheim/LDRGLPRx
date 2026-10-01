import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

export const TABLE = 'Touchpoints';
export const PREFIX = 'PUSH_PATCH_PENDING#';
export const MAX_REMINDERS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface Pending {
  contactId: string; sk: string; sessionId: string; email?: string;
  createdAt: string; intakeDue: string; remindersSent: number;
}

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env['AWS_REGION'] ?? 'us-east-2' }));

const isCondFail = (e: unknown) => (e as { name?: string }).name === 'ConditionalCheckFailedException';

/**
 * Touchpoints has no GSI that covers these rows (byEventType needs eventType+ts, which
 * pending markers lack), so this is a paginated Scan with a filter. Volume is low
 * (one row per Push Patch order; Touchpoints is small). If the table grows, add
 * eventType/ts to the marker and query byEventType instead.
 */
export async function findDue(nowIso: string): Promise<Pending[]> {
  const out: Pending[] = [];
  let key: Record<string, unknown> | undefined;
  do {
    const r = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'begins_with(sk, :p) AND attribute_not_exists(intakeSubmittedAt) AND remindersSent < :max AND intakeDue <= :now',
      ExpressionAttributeValues: { ':p': PREFIX, ':max': MAX_REMINDERS, ':now': nowIso },
      ProjectionExpression: 'contactId, sk, sessionId, email, createdAt, intakeDue, remindersSent',
      ...(key ? { ExclusiveStartKey: key } : {}),
    }));
    out.push(...((r.Items ?? []) as Pending[]));
    key = r.LastEvaluatedKey;
  } while (key);
  return out;
}

/** Conditional claim (count+1, next due = createdAt+24h). False if another run already claimed or intake landed. */
export async function claim(p: Pending): Promise<boolean> {
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE, Key: { contactId: p.contactId, sk: p.sk },
      UpdateExpression: 'SET remindersSent = :next, intakeDue = :due',
      ConditionExpression: 'remindersSent = :cur AND attribute_not_exists(intakeSubmittedAt)',
      ExpressionAttributeValues: {
        ':cur': p.remindersSent, ':next': p.remindersSent + 1,
        ':due': new Date(Date.parse(p.createdAt) + DAY_MS).toISOString(),
      },
    }));
    return true;
  } catch (e) {
    if (isCondFail(e)) return false;
    throw e;
  }
}

/** Undo a claim whose email failed, so the next sweep retries. Best-effort. */
export async function release(p: Pending): Promise<void> {
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE, Key: { contactId: p.contactId, sk: p.sk },
      UpdateExpression: 'SET remindersSent = :cur, intakeDue = :dueOld',
      ConditionExpression: 'remindersSent = :next',
      ExpressionAttributeValues: { ':cur': p.remindersSent, ':next': p.remindersSent + 1, ':dueOld': p.intakeDue },
    }));
  } catch (e) {
    if (!isCondFail(e)) console.error('[push-patch-reminder] release failed', { sk: p.sk });
  }
}
