import { ScanCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { InvokeCommand } from '@aws-sdk/client-lambda';
import { composeWhileYouWait } from '@my4mlife/push-patch-decision-core/shipping-emails';
import { blendFor } from '@my4mlife/push-patch-decision-core/blends';
import type { AbandonedDeps } from './abandoned';

const TABLE = process.env['PATIENT_RECORDS_TABLE'] ?? 'PatientRecords';
const SENDER_FN = process.env['EMAIL_SENDER_FN'] ?? 'my4mlife-email-sender';
const HOUR = 3600_000, MIN_AGE_MS = 48 * HOUR, MAX_AGE_MS = 10 * 24 * HOUR;

export interface WaitingResult { scanned: number; sent: number; skipped: number; failed: number }
interface Enc { contactId: string; sk: string; sku?: string; decidedAt?: string; trackingNumber?: string; waitEmailSentAt?: string; testOrder?: boolean }

const isCondFail = (e: unknown) => (e as { name?: string }).name === 'ConditionalCheckFailedException';

async function findCandidates({ ddb }: AbandonedDeps, now: Date, since: number): Promise<Enc[]> {
  const out: Enc[] = [];
  let key: Record<string, unknown> | undefined;
  do {
    const r = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'begins_with(sk, :p) AND #s = :s AND decidedAt BETWEEN :from AND :to AND attribute_not_exists(trackingNumber) AND attribute_not_exists(waitEmailSentAt) AND (attribute_not_exists(testOrder) OR testOrder = :f)',
      ExpressionAttributeNames: { '#s': 'state' },
      ExpressionAttributeValues: { ':p': 'encounter#pp-', ':s': 'script-written', ':f': false, ':from': new Date(Math.max(now.getTime() - MAX_AGE_MS, since)).toISOString(), ':to': new Date(now.getTime() - MIN_AGE_MS).toISOString() },
      ProjectionExpression: 'contactId, sk, sku, decidedAt, trackingNumber, waitEmailSentAt, testOrder',
      ...(key ? { ExclusiveStartKey: key } : {}),
    }));
    out.push(...((r?.Items ?? []) as Enc[]));
    key = r?.LastEvaluatedKey;
  } while (key);
  return out;
}

const eligible = (e: Enc, now: Date, since: number): boolean => {
  const at = Date.parse(e.decidedAt ?? '');
  const age = now.getTime() - at;
  return at >= since && age >= MIN_AGE_MS && age <= MAX_AGE_MS && !e.trackingNumber && !e.waitEmailSentAt && !e.testOrder;
};

/** "While you wait" email, 48h to 10d after approval, until a tracking number lands. Stamp FIRST, then send:
 *  a crash can skip an email but never double-send. Logs counts and sk only (no names, emails, tracking). */
export async function sweepWaiting(deps: AbandonedDeps, now: Date = new Date()): Promise<WaitingResult> {
  const since = Date.parse(process.env['WAITING_EMAIL_SINCE'] ?? '');
  if (Number.isNaN(since)) {
    console.log('[push-patch-reminder] waiting: no-cutoff');
    return { scanned: 0, sent: 0, skipped: 0, failed: 0 };
  }
  const found = await findCandidates(deps, now, since);
  const res: WaitingResult = { scanned: found.length, sent: 0, skipped: 0, failed: 0 };
  for (const e of found) {
    if (!eligible(e, now, since)) { res.skipped++; continue; }
    try {
      const rec = (await deps.ddb.send(new GetCommand({ TableName: TABLE, Key: { contactId: e.contactId, sk: 'record' } })))?.Item;
      const demo = rec?.demographics ?? {};
      if (!demo.email) { res.skipped++; continue; }
      await deps.ddb.send(new UpdateCommand({
        TableName: TABLE, Key: { contactId: e.contactId, sk: e.sk }, UpdateExpression: 'SET waitEmailSentAt = :now',
        ConditionExpression: 'attribute_not_exists(waitEmailSentAt) AND attribute_not_exists(trackingNumber)', ExpressionAttributeValues: { ':now': now.toISOString() },
      }));
      const m = composeWhileYouWait({ firstName: demo.firstName ?? 'there', blendName: blendFor(e.sku ?? '').name });
      const r = await deps.lambda.send(new InvokeCommand({
        FunctionName: SENDER_FN, InvocationType: 'RequestResponse',
        Payload: Buffer.from(JSON.stringify({ kind: 'info', from: 'support', to: demo.email, ...m })),
      }));
      if (r.FunctionError) throw new Error('email-sender failed');
      res.sent++;
    } catch (err) {
      if (isCondFail(err)) { res.skipped++; continue; }
      res.failed++; console.error('[push-patch-reminder] waiting failed', { sk: e.sk });
    }
  }
  console.log('[push-patch-reminder] waiting sweep', res);
  return res;
}
