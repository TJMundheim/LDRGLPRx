// Pure helpers for the Push Patch admin panel (PushPatchPanel.svelte).
import type { EncounterAdmin, PushPatchProvider } from '../../api/operations.js';

export const stateLabel = (state: string): string =>
  state === 'sent-to-provider' ? 'Awaiting physician review'
    : state === 'script-written' ? 'Approved'
    : state === 'declined' ? 'Declined'
    : state;

/** A paid GLP-1 order (encounter g1-<sessionId>, lane glp1). Legacy coordinator glp1 encounters don't match. */
export const isGlp1Order = (e: EncounterAdmin): boolean => e.lane === 'glp1' && e.encounterId.startsWith('g1-');

export const canDecide = (e: EncounterAdmin): boolean => (e.lane === 'push-patch' || isGlp1Order(e)) && e.state === 'sent-to-provider';

export const GLP1_NAMES: Record<string, string> = {
  'glp1-sema': 'GLP-1 · Sema (semaglutide)',
  'glp1-tirzep': 'GLP-2 · Tirzep (tirzepatide)',
  'glp1-reta': 'GLP-3 · Reta',
};
/** Weekly mg dose lists, same as the physician email link. */
export const GLP1_DOSES: Record<string, string[]> = {
  'glp1-sema': ['0.25', '0.5', '1', '1.7', '2.4'],
  'glp1-tirzep': ['2.5', '5', '7.5', '10', '12.5', '15'],
  'glp1-reta': ['2', '4', '8', '12'],
};
export const glp1Name = (sku?: string | null): string => (sku && GLP1_NAMES[sku]) || 'GLP-1';
export const GLP1_REFILL_NOTE = 'Refills are one month each, every 4 weeks.';

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

export const providerLabel = (p: Pick<PushPatchProvider, 'name' | 'credentials'>): string =>
  p.credentials ? `${p.name}, ${p.credentials}` : p.name;

export const CONFIRM = {
  approve: "Approve this order? This emails the patient's welcome and sends the order to the pharmacy.",
  decline: 'Decline? The patient is told a refund comes within 10 business days.',
} as const;
