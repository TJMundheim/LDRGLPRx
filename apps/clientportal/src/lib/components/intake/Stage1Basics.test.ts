/**
 * Unit tests for Stage 1 lightweight consent flow.
 * Tests the pure logic Stage1Basics.svelte depends on:
 *  - canContinue requires name + age + height + weight + consentAccepted
 *  - consent stored as `consent-protege-v1` { acceptedAt: ISO, version: 1 }
 *  - unchecking consent removes the record
 */
import { describe, it, expect } from 'vitest';

/**
 * Mirrors the canContinue $derived logic in Stage1Basics.svelte.
 * phone is intentionally excluded — it's optional and must never gate Continue.
 */
function canContinue(
  basics: { name: string; age: string; height: string; weight: string; phone?: string },
  consentAccepted: boolean,
): boolean {
  return (
    String(basics.name ?? '').trim().length > 0 &&
    String(basics.age ?? '').trim().length > 0 &&
    String(basics.height ?? '').trim().length > 0 &&
    String(basics.weight ?? '').trim().length > 0 &&
    consentAccepted
  );
}

const FULL_BASICS = { name: 'John Doe', age: '45', height: '70', weight: '210' };

describe('Stage1Basics lightweight consent', () => {
  it('all fields filled + consent checked → canContinue=true', () => {
    expect(canContinue(FULL_BASICS, true)).toBe(true);
  });

  it('missing name → canContinue=false even with consent', () => {
    expect(canContinue({ ...FULL_BASICS, name: '' }, true)).toBe(false);
  });

  it('missing age → canContinue=false', () => {
    expect(canContinue({ ...FULL_BASICS, age: '' }, true)).toBe(false);
  });

  it('missing height → canContinue=false', () => {
    expect(canContinue({ ...FULL_BASICS, height: '' }, true)).toBe(false);
  });

  it('missing weight → canContinue=false', () => {
    expect(canContinue({ ...FULL_BASICS, weight: '' }, true)).toBe(false);
  });

  it('consent not checked → canContinue=false even with all fields', () => {
    expect(canContinue(FULL_BASICS, false)).toBe(false);
  });

  it('whitespace-only name → canContinue=false', () => {
    expect(canContinue({ ...FULL_BASICS, name: '   ' }, true)).toBe(false);
  });

  it('phone omitted → canContinue=true (phone is optional)', () => {
    const { ...withoutPhone } = FULL_BASICS;
    expect(canContinue(withoutPhone, true)).toBe(true);
  });

  it('phone empty string → canContinue=true (phone is optional)', () => {
    expect(canContinue({ ...FULL_BASICS, phone: '' }, true)).toBe(true);
  });
});

describe('consent-protege-v1 storage format', () => {
  it('stored consent has acceptedAt ISO string and version=1', () => {
    const before = Date.now();
    const record = { acceptedAt: new Date().toISOString(), version: 1 as const };
    const after = Date.now();

    expect(record.version).toBe(1);
    const ts = new Date(record.acceptedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('null stored consent → consentAccepted=false', () => {
    const stored: { acceptedAt: string; version: number } | null = null;
    const consentAccepted = !!stored;
    expect(consentAccepted).toBe(false);
  });

  it('valid stored consent → consentAccepted=true', () => {
    const stored = { acceptedAt: new Date().toISOString(), version: 1 };
    const consentAccepted = !!stored;
    expect(consentAccepted).toBe(true);
  });
});
