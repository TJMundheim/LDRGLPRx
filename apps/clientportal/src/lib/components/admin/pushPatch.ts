// Pure helpers for the Push Patch admin panel (PushPatchPanel.svelte).
import type { EncounterAdmin } from '../../api/operations.js';

export const stateLabel = (state: string): string =>
  state === 'sent-to-provider' ? 'Awaiting physician review'
    : state === 'script-written' ? 'Approved'
    : state === 'declined' ? 'Declined'
    : state;

export const canDecide = (e: EncounterAdmin): boolean => e.lane === 'push-patch' && e.state === 'sent-to-provider';

export function paidLabel(e: EncounterAdmin): string {
  const amt = typeof e.amountCents === 'number' && e.amountCents > 0 ? `$${(e.amountCents / 100).toFixed(2)}` : 'amount not recorded';
  return `Paid at checkout: ${amt}${e.testOrder ? ' (test)' : ''}`;
}

export const decidedByLabel = (by: string): string =>
  by.startsWith('admin:') ? `admin ${by.slice(6)}` : by === 'physician-link' ? 'physician link' : by;

export const when = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

export const CONFIRM = {
  approve: "Approve this order? This emails the patient's welcome and sends the order to the pharmacy.",
  decline: 'Decline? The patient is told a refund comes within 10 business days.',
} as const;
