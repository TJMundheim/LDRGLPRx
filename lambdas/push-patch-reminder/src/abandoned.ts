import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { sendAbandoned, type Sender } from './abandoned-email';

const INTAKES_TABLE = process.env['PATIENT_RECORDS_TABLE'] ?? 'PatientRecords';
const MIN_AGE_MS = 60 * 60 * 1000, MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface AbandonedResult { scanned: number; sent: number; skipped: number; failed: number }
export interface AbandonedDeps { ddb: { send(cmd: unknown): Promise<any> }; lambda: Sender }
interface Intake { contactId: string; sk: string; email?: string; firstName?: string; skuId?: string; abandonedNudgeAt?: string }

const isCondFail = (e: unknown) => (e as { name?: string }).name === 'ConditionalCheckFailedException';
export function defaultDeps(): AbandonedDeps {
  const region = process.env['AWS_REGION'] ?? 'us-east-2';
  return { ddb: DynamoDBDocumentClient.from(new DynamoDBClient({ region })), lambda: new LambdaClient({ region }) as unknown as Sender };
}

/** No GSI covers pending intakes: paginated Scan with a filter (low volume; items TTL after 30 days). */
async function findCandidates({ ddb }: AbandonedDeps, now: Date): Promise<Intake[]> {
  const out: Intake[] = [];
  let key: Record<string, unknown> | undefined;
  do {
    const r = await ddb.send(new ScanCommand({
      TableName: INTAKES_TABLE,
      FilterExpression: 'begins_with(sk, :p) AND signedAt BETWEEN :from AND :to AND attribute_not_exists(abandonedNudgeAt)',
      ExpressionAttributeValues: {
        ':p': 'pending-intake#',
        ':from': new Date(now.getTime() - MAX_AGE_MS).toISOString(),
        ':to': new Date(now.getTime() - MIN_AGE_MS).toISOString(),
      },
      ProjectionExpression: 'contactId, sk, email, firstName, skuId, abandonedNudgeAt',
      ...(key ? { ExclusiveStartKey: key } : {}),
    }));
    out.push(...((r?.Items ?? []) as Intake[]));
    key = r?.LastEvaluatedKey;
  } while (key);
  return out;
}

/** Skip if the person paid (a Touchpoints PUSH_PATCH_PENDING# marker) or any of their pending intakes was
 *  already nudged (repeat Buy clicks leave several pending rows: one email per person, not per row). */
async function shouldSkip({ ddb }: AbandonedDeps, contactId: string): Promise<boolean> {
  const paid = await ddb.send(new QueryCommand({
    TableName: 'Touchpoints', KeyConditionExpression: 'contactId = :c AND begins_with(sk, :p)',
    ExpressionAttributeValues: { ':c': contactId, ':p': 'PUSH_PATCH_PENDING#' }, Limit: 1,
  }));
  if ((paid?.Items?.length ?? 0) > 0) return true;
  const nudged = await ddb.send(new QueryCommand({
    TableName: INTAKES_TABLE, ConsistentRead: true, ProjectionExpression: 'sk',
    KeyConditionExpression: 'contactId = :c AND begins_with(sk, :p)', FilterExpression: 'attribute_exists(abandonedNudgeAt)',
    ExpressionAttributeValues: { ':c': contactId, ':p': 'pending-intake#' },
  }));
  return (nudged?.Items?.length ?? 0) > 0;
}

async function claim({ ddb }: AbandonedDeps, i: Intake, nowIso: string): Promise<boolean> {
  try {
    await ddb.send(new UpdateCommand({
      TableName: INTAKES_TABLE, Key: { contactId: i.contactId, sk: i.sk }, UpdateExpression: 'SET abandonedNudgeAt = :now',
      ConditionExpression: 'attribute_exists(sk) AND attribute_not_exists(abandonedNudgeAt)', ExpressionAttributeValues: { ':now': nowIso },
    }));
    return true;
  } catch (e) { if (isCondFail(e)) return false; throw e; }
}

/** Undo a claim whose email failed so the next sweep retries. */
async function release({ ddb }: AbandonedDeps, i: Intake, nowIso: string): Promise<void> {
  try {
    await ddb.send(new UpdateCommand({
      TableName: INTAKES_TABLE, Key: { contactId: i.contactId, sk: i.sk }, UpdateExpression: 'REMOVE abandonedNudgeAt',
      ConditionExpression: 'abandonedNudgeAt = :now', ExpressionAttributeValues: { ':now': nowIso },
    }));
  } catch (e) { if (!isCondFail(e)) console.error('[push-patch-reminder] abandoned release failed', { sk: i.sk }); }
}

/** One nudge per unpaid intake, 60 min to 7 days after signing. Logs counts + sk only. */
export async function sweepAbandoned(deps: AbandonedDeps, now: Date = new Date()): Promise<AbandonedResult> {
  const nowIso = now.toISOString();
  const found = await findCandidates(deps, now);
  const res: AbandonedResult = { scanned: found.length, sent: 0, skipped: 0, failed: 0 };
  for (const i of found) {
    if (!i.email || i.abandonedNudgeAt) { res.skipped++; continue; }
    try {
      if ((await shouldSkip(deps, i.contactId)) || !(await claim(deps, i, nowIso))) { res.skipped++; continue; }
    } catch {
      res.failed++; console.error('[push-patch-reminder] abandoned claim failed', { sk: i.sk }); continue;
    }
    try {
      await sendAbandoned(deps.lambda, i.email, i.firstName, i.skuId);
      res.sent++;
    } catch {
      res.failed++; console.error('[push-patch-reminder] abandoned send failed', { sk: i.sk });
      await release(deps, i, nowIso);
    }
  }
  console.log('[push-patch-reminder] abandoned sweep', res);
  return res;
}
