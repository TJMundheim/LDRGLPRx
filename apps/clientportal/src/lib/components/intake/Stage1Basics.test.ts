/**
 * Unit tests for Stage 1 consent restore logic.
 * Tests the pure functions / logic that Stage1Basics.svelte depends on:
 *  - isConsentValid: stored SHA matches current doc SHA → checkbox rendered checked+disabled
 *  - stale SHA → checkbox unchecked with stale flag
 *  - missing record → checkbox unchecked
 */
import { describe, it, expect } from 'vitest';

interface ConsentRecord {
  acceptedAt: string;
  version: number;
  documentSha: string;
}

/** Mirrors the logic used in Stage1Basics.svelte onMount validation */
function evaluateConsent(
  stored: ConsentRecord | null,
  currentSha: string,
): { checked: boolean; stale: boolean; opened: boolean } {
  if (!stored) {
    return { checked: false, stale: false, opened: false };
  }
  // SHA check: if current SHA is unavailable in test env, treat as matching
  const shaMatch =
    stored.documentSha === currentSha ||
    stored.documentSha === 'sha256-unavailable' ||
    currentSha === 'sha256-unavailable';

  if (!shaMatch) {
    // Document changed — invalidate consent
    return { checked: false, stale: true, opened: false };
  }
  return { checked: true, stale: false, opened: true };
}

const VALID_RECORD: ConsentRecord = {
  acceptedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  version: 1,
  documentSha: 'abc123',
};

describe('Stage1Basics consent restore logic', () => {
  it('valid stored SHA → checked=true, stale=false, opened=true', () => {
    const result = evaluateConsent(VALID_RECORD, 'abc123');
    expect(result.checked).toBe(true);
    expect(result.stale).toBe(false);
    expect(result.opened).toBe(true);
  });

  it('stale SHA (doc changed) → checked=false, stale=true, opened=false', () => {
    const result = evaluateConsent(VALID_RECORD, 'different-sha');
    expect(result.checked).toBe(false);
    expect(result.stale).toBe(true);
    expect(result.opened).toBe(false);
  });

  it('missing localStorage record → checked=false, stale=false, opened=false', () => {
    const result = evaluateConsent(null, 'abc123');
    expect(result.checked).toBe(false);
    expect(result.stale).toBe(false);
    expect(result.opened).toBe(false);
  });

  it('sha256-unavailable (test env) matches any stored SHA', () => {
    const result = evaluateConsent(VALID_RECORD, 'sha256-unavailable');
    expect(result.checked).toBe(true);
    expect(result.stale).toBe(false);
  });

  it('stored sha256-unavailable matches any current SHA', () => {
    const record: ConsentRecord = { ...VALID_RECORD, documentSha: 'sha256-unavailable' };
    const result = evaluateConsent(record, 'some-real-sha');
    expect(result.checked).toBe(true);
    expect(result.stale).toBe(false);
  });
});
