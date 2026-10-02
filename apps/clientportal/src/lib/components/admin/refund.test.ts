import { describe, it, expect } from 'vitest';
import { isPushPatch, canRefund, businessDaysUntil, refundDueSoon, confirmText, refundStatusLabel } from './refund.js';

const enc = (o: Record<string, unknown> = {}) => ({ encounterId: 'pp-1', category: 'push-patch', state: 'declined', visitType: 'async', lane: 'push-patch', refundStatus: 'pending', createdAt: '', updatedAt: '', ...o }) as any;

describe('refund helpers', () => {
  it('isPushPatch keys off lane', () => {
    expect(isPushPatch(enc())).toBe(true);
    expect(isPushPatch(enc({ lane: 'glp1' }))).toBe(false);
    expect(isPushPatch(enc({ lane: null }))).toBe(false);
  });

  it('canRefund only for push-patch + declined + pending', () => {
    expect(canRefund(enc())).toBe(true);
    expect(canRefund(enc({ state: 'script-written' }))).toBe(false);
    expect(canRefund(enc({ refundStatus: 'refunded' }))).toBe(false);
    expect(canRefund(enc({ refundStatus: 'processing' }))).toBe(false);
    expect(canRefund(enc({ refundStatus: null }))).toBe(false);
    expect(canRefund(enc({ lane: 'glp1' }))).toBe(false);
  });

  it('businessDaysUntil counts weekdays after today up to the due date', () => {
    const fri = new Date('2026-10-02T15:00:00Z'); // Friday
    expect(businessDaysUntil('2026-10-02', fri)).toBe(0);
    expect(businessDaysUntil('2026-10-05', fri)).toBe(1); // Mon
    expect(businessDaysUntil('2026-10-07', fri)).toBe(3); // Wed
    expect(businessDaysUntil('2026-10-01', fri)).toBeLessThan(0); // overdue
  });

  it('refundDueSoon highlights within 2 business days or overdue', () => {
    const fri = new Date('2026-10-02T15:00:00Z');
    expect(refundDueSoon('2026-10-06', fri)).toBe(true);  // Tue = 2
    expect(refundDueSoon('2026-10-07', fri)).toBe(false); // Wed = 3
    expect(refundDueSoon('2026-09-30', fri)).toBe(true);  // overdue
    expect(refundDueSoon(null, fri)).toBe(false);
  });

  it('confirmText names amount and patient, and says it cannot be undone', () => {
    expect(confirmText(24900, 'Pat Lee')).toBe('Refund $249.00 to Pat Lee? This cannot be undone.');
    expect(confirmText(null, 'Pat Lee')).toBe('Refund the full payment to Pat Lee? This cannot be undone.');
    expect(confirmText(24900, '')).toBe('Refund $249.00 to this patient? This cannot be undone.');
  });

  it('refundStatusLabel', () => {
    expect(refundStatusLabel('pending')).toBe('Refund pending');
    expect(refundStatusLabel('processing')).toBe('Refund processing');
    expect(refundStatusLabel('refunded')).toBe('Refunded');
    expect(refundStatusLabel(null)).toBe('');
  });
});
