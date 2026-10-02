import { findDue, claim, release } from './pending';
import { sendReminder } from './email';
import { refundSweep, type RefundResult } from './refund';

export interface SweepResult { scanned: number; sent: number; skipped: number; failed: number; refunds: RefundResult }

/** EventBridge every 15 min. Logs counts and session ids only (never email or health data). */
export const handler = async (): Promise<SweepResult> => {
  const due = await findDue(new Date().toISOString());
  const res: SweepResult = { scanned: due.length, sent: 0, skipped: 0, failed: 0, refunds: { scanned: 0, sent: 0, skipped: 0, failed: 0 } };
  for (const p of due) {
    if (!p.email) { res.skipped++; continue; }
    try {
      if (!(await claim(p))) { res.skipped++; continue; }
    } catch {
      res.failed++; console.error('[push-patch-reminder] claim failed', { sk: p.sk }); continue;
    }
    try {
      await sendReminder(p.email, p.sessionId, p.remindersSent === 0 ? 0 : 1);
      res.sent++;
    } catch {
      res.failed++; console.error('[push-patch-reminder] send failed', { sk: p.sk });
      await release(p);
    }
  }
  // Refund-pending reminders to TJ: independent of the patient reminders; a failure here must not mask them.
  try { res.refunds = await refundSweep(); } catch { res.refunds.failed++; console.error('[push-patch-reminder] refund sweep failed'); }
  console.log('[push-patch-reminder] sweep', res);
  return res;
};
