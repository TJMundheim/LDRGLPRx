// Reorder reminders for Push Patch patients on one-box refills (not auto-ship).
// Covers Push Patch parents (encounter#pp-...) and manual Rx parents (any encounter#): only items stamped with refillDueAt match.
// Interval: refillAuth.intervalDays ?? 42; reminders at interval-7 and interval days after shipping (35/42 for Push Patch).
// Lookup design: shipping a box stamps a top-level `refillDueAt` (ship + 35 days) on the PARENT encounter item
// in PatientRecords (written by recordShipment in push-patch-decision-core). This sweep Scans PatientRecords with a
// filter on `refillDueAt <= now`, the same pattern and cost as waiting.ts. Per item:
//   reminder 1 at ship + 35d (remindersSent 0 -> 1, refillDueAt -> ship + 42d), reminder 2 at ship + 42d
//   (remindersSent 1 -> 2, refillDueAt removed), then nothing. If refills are used up or expired at due time, a single
//   "quick re-review" email goes out instead (refillAuth.reReviewSentAt) and the schedule ends.
// Claim first (conditional update), then send; a failed send releases the claim. Logs carry outcome codes only.
import { ScanCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { sendRefillReminder, sendRefillReReview } from '@my4mlife/push-patch-decision-core/emails';
import { signRefillLink, refillLinkKey } from '@my4mlife/push-patch-decision-core/refill-link';
import { blendFor } from '@my4mlife/push-patch-decision-core/blends';
import { rxProduct, refillIntervalDays } from '@my4mlife/push-patch-decision-core/rx-products';

const TABLE = process.env['PATIENT_RECORDS_TABLE'] ?? 'PatientRecords';
const DAY = 86_400_000;
export const LINK_DAYS = 21;

export interface RefillReminderResult { scanned: number; sent: number; reReview: number; cleared: number; skipped: number; failed: number }
interface Auth { refillsAuthorized: number; refillsUsed: number; sku?: string; fulfillment?: string; product?: string; intervalDays?: number; expiresAt: string; status: string; mode?: string; subscriptionId?: string;
  lastShippedAt?: string; remindersSent?: number; reReviewSentAt?: string }
interface Enc { contactId: string; sk: string; sku?: string; refillDueAt: string; refillAuth?: Auth }
type Ddb = { send(cmd: unknown): Promise<any> };

const isCondFail = (e: unknown) => (e as { name?: string }).name === 'ConditionalCheckFailedException';
const update = (ddb: Ddb, e: Enc, expr: string, cond: string, values: Record<string, unknown>) =>
  ddb.send(new UpdateCommand({ TableName: TABLE, Key: { contactId: e.contactId, sk: e.sk }, UpdateExpression: expr, ConditionExpression: cond, ExpressionAttributeValues: values }));

async function findDue(ddb: Ddb, nowIso: string): Promise<Enc[]> {
  const out: Enc[] = [];
  let key: Record<string, unknown> | undefined;
  do {
    const r = await ddb.send(new ScanCommand({
      TableName: TABLE, FilterExpression: 'begins_with(sk, :p) AND refillDueAt <= :now',
      ExpressionAttributeValues: { ':p': 'encounter#', ':now': nowIso },
      ProjectionExpression: 'contactId, sk, sku, refillDueAt, refillAuth',
      ...(key ? { ExclusiveStartKey: key } : {}),
    }));
    out.push(...((r?.Items ?? []) as Enc[]));
    key = r?.LastEvaluatedKey;
  } while (key);
  return out;
}

export async function sweepRefillReminders(ddb: Ddb, now: Date = new Date(), getKey: () => Promise<string> = refillLinkKey): Promise<RefillReminderResult> {
  const nowIso = now.toISOString();
  const found = await findDue(ddb, nowIso);
  const res: RefillReminderResult = { scanned: found.length, sent: 0, reReview: 0, cleared: 0, skipped: 0, failed: 0 };
  for (const e of found) {
    const a = e.refillAuth;
    try {
      const onAuto = a?.mode === 'auto' && !!a.subscriptionId;
      const ended = !a || a.status === 'paused' || a.status === 'cancelled' || onAuto || !a.lastShippedAt || (a.remindersSent ?? 0) >= 2 || !!a.reReviewSentAt;
      if (ended) { // nothing to send: end the schedule so the sweep stops seeing this item
        await update(ddb, e, 'REMOVE refillDueAt', 'refillDueAt = :d', { ':d': e.refillDueAt }); res.cleared++; continue;
      }
      const spent = a.status === 'exhausted' || a.refillsUsed >= a.refillsAuthorized || a.expiresAt <= nowIso;
      const cur = a.remindersSent ?? 0;
      const shipped = Date.parse(a.lastShippedAt!);
      const interval = refillIntervalDays(a); // 42 for Push Patch; Rx products carry their own (30 for Gut-Brain Rx)
      const rx = a.fulfillment === 'manual' ? rxProduct(a.product) : undefined;
      if (a.fulfillment === 'manual' && !rx) { res.skipped++; continue; }
      if (!spent && shipped + (cur === 0 ? interval - 7 : interval) * DAY > now.getTime()) { res.skipped++; continue; } // stale marker
      const demo = (await ddb.send(new GetCommand({ TableName: TABLE, Key: { contactId: e.contactId, sk: 'record' } })))?.Item?.demographics ?? {};
      if (!demo.email) { res.skipped++; continue; }
      const firstName = demo.firstName || 'there';
      if (spent) {
        await update(ddb, e, 'SET refillAuth.reReviewSentAt = :now REMOVE refillDueAt', 'refillDueAt = :d AND attribute_not_exists(refillAuth.reReviewSentAt)', { ':now': nowIso, ':d': e.refillDueAt });
        try { await sendRefillReReview({ to: demo.email, firstName, ...(rx ? { productName: rx.name } : {}) }); res.reReview++; }
        catch { await release(ddb, e, a); throw new Error('send'); }
        continue;
      }
      const n = (cur === 0 ? 1 : 2) as 1 | 2;
      const nextDue = new Date(shipped + interval * DAY).toISOString();
      await update(ddb, e, n === 1 ? 'SET refillAuth.remindersSent = :next, refillDueAt = :nd' : 'SET refillAuth.remindersSent = :next REMOVE refillDueAt',
        'refillDueAt = :d AND refillAuth.remindersSent = :cur', { ':next': n, ':cur': cur, ':d': e.refillDueAt, ...(n === 1 ? { ':nd': nextDue } : {}) });
      try {
        const link = signRefillLink({ contactId: e.contactId, encounterId: e.sk.slice('encounter#'.length), days: LINK_DAYS, key: await getKey(), now: now.getTime() });
        await sendRefillReminder({ to: demo.email, firstName, blendName: rx ? rx.name : blendFor(a.sku ?? e.sku ?? '').name, link, n, ...(rx ? { productName: rx.name, intervalDays: interval } : {}) });
        res.sent++;
      } catch { await release(ddb, e, a); throw new Error('send'); }
    } catch (err) {
      if (isCondFail(err)) { res.skipped++; continue; }
      res.failed++; console.error('[push-patch-reminder] refill reminder failed', { outcome: (err as Error).message === 'send' ? 'send-failed' : 'error' });
    }
  }
  console.log('[push-patch-reminder] refill sweep', res);
  return res;
}

/** Undo a claim whose send failed so the next sweep retries. Best-effort. */
async function release(ddb: Ddb, e: Enc, a: Auth): Promise<void> {
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE, Key: { contactId: e.contactId, sk: e.sk },
      UpdateExpression: 'SET refillDueAt = :d, refillAuth.remindersSent = :cur REMOVE refillAuth.reReviewSentAt',
      ExpressionAttributeValues: { ':d': e.refillDueAt, ':cur': a.remindersSent ?? 0 },
    }));
  } catch { console.error('[push-patch-reminder] refill release failed'); }
}
