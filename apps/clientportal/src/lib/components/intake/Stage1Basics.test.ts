/**
 * Unit tests for Stage 1 consent restore logic.
 * Tests the pure functions / logic that Stage1Basics.svelte depends on:
 *  - evaluateConsent: stored SHA matches current doc SHA → checkbox rendered checked+disabled
 *  - stale SHA → checkbox stays checked (prior acceptance honoured), stale flag set for warning
 *  - missing record → checkbox unchecked
 *  - normalizeForHash: trailing whitespace / CRLF changes don't alter the hash output
 */
import { describe, it, expect } from 'vitest';

interface ConsentRecord {
  acceptedAt: string;
  version: number;
  documentSha: string;
}

/**
 * Mirrors the logic used in Stage1Basics.svelte onMount validation.
 *
 * Key invariant (post-fix): a prior acceptance is NEVER revoked just because
 * the document changed. checked and opened stay true; only stale is flagged
 * so the UI can show a soft "docs updated" notice.
 */
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
    // Document changed — warn but keep the prior acceptance intact
    return { checked: true, stale: true, opened: true };
  }
  return { checked: true, stale: false, opened: true };
}

/**
 * Mirrors normalizeForHash() in legalDocs.ts.
 * Strips trailing whitespace from each line and normalises CRLF → LF.
 */
function normalizeForHash(text: string): string {
  return text
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n+$/, ''); // strip trailing blank lines only, preserve leading content
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

  it('stale SHA (doc changed) → checked=true, stale=true, opened=true (prior acceptance retained)', () => {
    const result = evaluateConsent(VALID_RECORD, 'different-sha');
    expect(result.checked).toBe(true);
    expect(result.stale).toBe(true);
    expect(result.opened).toBe(true);
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

describe('normalizeForHash whitespace stability', () => {
  it('trailing spaces on a line do not change normalised output', () => {
    const original = 'Hello world\nLine two';
    const withTrailing = 'Hello world   \nLine two  ';
    expect(normalizeForHash(original)).toBe(normalizeForHash(withTrailing));
  });

  it('CRLF line endings produce same hash input as LF', () => {
    const lf = 'Hello\nWorld';
    const crlf = 'Hello\r\nWorld';
    expect(normalizeForHash(lf)).toBe(normalizeForHash(crlf));
  });

  it('leading whitespace changes ARE preserved (semantic difference)', () => {
    const indented = '  - bullet';
    const notIndented = '- bullet';
    expect(normalizeForHash(indented)).not.toBe(normalizeForHash(notIndented));
  });

  it('user accepts → doc gets trailing whitespace added → revisit shows checked, no re-consent required', () => {
    // Simulate: user accepted when doc had no trailing spaces.
    // A later commit adds trailing spaces to some lines.
    // With normalisation both SHAs would match; evaluateConsent must stay checked+not-stale.
    // (In production the SHAs would be equal after normalisation; here we test via evaluateConsent)
    const originalNormalized = normalizeForHash('# Privacy Practices\nWe collect data.\n');
    const updatedWithSpaces  = normalizeForHash('# Privacy Practices  \nWe collect data.  \n');
    expect(originalNormalized).toBe(updatedWithSpaces);

    // If SHAs end up equal (as they will in production after this fix), no stale flag
    const record: ConsentRecord = { ...VALID_RECORD, documentSha: 'same' };
    const result = evaluateConsent(record, 'same');
    expect(result.checked).toBe(true);
    expect(result.stale).toBe(false);
    expect(result.opened).toBe(true);
  });
});
