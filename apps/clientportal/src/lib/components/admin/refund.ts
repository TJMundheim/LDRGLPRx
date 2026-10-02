// Pure helpers for the Push Patch admin refund UI (PushPatchRefund.svelte).
import type { EncounterAdmin } from '../../api/operations.js';

export const isPushPatch = (e: EncounterAdmin): boolean => e.lane === 'push-patch';

export const canRefund = (e: EncounterAdmin): boolean =>
  isPushPatch(e) && e.state === 'declined' && e.refundStatus === 'pending';

const ymd = (d: Date): string => d.toISOString().slice(0, 10);

/** Business days (Mon-Fri) from today until `due` (YYYY-MM-DD). 0 = due today; negative = overdue. */
export function businessDaysUntil(due: string, now: Date = new Date()): number {
  const today = ymd(now);
  if (due === today) return 0;
  const [a, b, sign] = due < today ? [due, today, -1] : [today, due, 1];
  const d = new Date(`${a}T00:00:00Z`);
  const end = new Date(`${b}T00:00:00Z`);
  let n = 0;
  while (d < end) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) n++;
  }
  return n === 0 && sign < 0 ? -1 : sign * n;
}

/** Highlight when due within 2 business days or already overdue. */
export function refundDueSoon(due: string | null | undefined, now: Date = new Date()): boolean {
  return !!due && businessDaysUntil(due, now) <= 2;
}

export function confirmText(amountCents: number | null | undefined, name: string): string {
  const amt = typeof amountCents === 'number' && amountCents > 0 ? `$${(amountCents / 100).toFixed(2)}` : 'the full payment';
  return `Refund ${amt} to ${name || 'this patient'}? This cannot be undone.`;
}

export function refundStatusLabel(s: string | null | undefined): string {
  return s === 'pending' ? 'Refund pending' : s === 'processing' ? 'Refund processing' : s === 'refunded' ? 'Refunded' : '';
}
