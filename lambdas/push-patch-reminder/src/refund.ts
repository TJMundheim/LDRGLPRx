import { findDeclinedPending, claimReminder, releaseReminder, lookupName, type DeclinedEnc } from './refund-store';
import { sendRefundReminder } from './refund-email';
import { addBusinessDays } from './business-days';

export interface RefundResult { scanned: number; sent: number; skipped: number; failed: number }
const BUSINESS_DAYS = 7;

const isDue = (e: DeclinedEnc, today: string): boolean =>
  !!e.declinedAt && addBusinessDays(new Date(e.declinedAt), BUSINESS_DAYS) <= today;

/** One internal email per declined Push Patch encounter whose refund is still pending after 7 business days. Logs counts + sk only. */
export async function refundSweep(): Promise<RefundResult> {
  const now = new Date();
  const nowIso = now.toISOString();
  const found = await findDeclinedPending();
  const res: RefundResult = { scanned: found.length, sent: 0, skipped: 0, failed: 0 };
  for (const e of found) {
    if (!isDue(e, nowIso.slice(0, 10))) { res.skipped++; continue; }
    try {
      if (!(await claimReminder(e, nowIso))) { res.skipped++; continue; }
    } catch {
      res.failed++; console.error('[push-patch-reminder] refund claim failed', { sk: e.sk }); continue;
    }
    try {
      await sendRefundReminder(e, await lookupName(e.contactId));
      res.sent++;
    } catch {
      res.failed++; console.error('[push-patch-reminder] refund send failed', { sk: e.sk });
      await releaseReminder(e, nowIso);
    }
  }
  console.log('[push-patch-reminder] refund sweep', res);
  return res;
}
