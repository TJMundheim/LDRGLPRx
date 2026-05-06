/**
 * Clean-slate wipe tests (schema v6).
 *
 * Verifies that:
 *   1. All WIPE_KEYS are removed when the schema sentinel mismatches.
 *   2. Cognito tokens are preserved through the wipe.
 *   3. ?reset=1 triggers the same comprehensive wipe.
 *
 * The wipe logic lives in App.svelte's top-level script block and runs at
 * module-evaluation time (before any component mounts). Because we can't
 * import a Svelte file as a plain module in Vitest, the wipe function is
 * extracted and tested here as a pure utility against a localStorage mock.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ── Reproduce the wipe constants exactly as they appear in App.svelte ────────

const SCHEMA_KEY = 'intake-schema-v6';
const SCHEMA_VAL = '2026-05-05';

const WIPE_KEYS = [
  // Intake state
  'basics-v1',
  'audit-v1',
  'discovery-v1',
  'intake-stage-v1',
  'intake-complete-v1',
  'intake-audit-scores-v1',
  'intake-date-v1',
  // Consent state
  'consent-protege-v1',
  'consent-npp-v1',
  'consent-phi-auth-v1',
  'consent-ai-comm-v1',
  'consent-marketing-v1',
  // Assessment state
  'gut-assessment-v1',
  'allergy-assessment-v1',
  'goals-v1',
  'connected-mind-v1',
  // Workbook data
  'workbook-local-workbook',
  '4m:workbook:local-workbook',
  '4m:index:local-user',
  // Nudge state
  'last-seen-v1',
  'intake-celebrated-v1',
  'nudges-shown-today-v1',
  'nudges-dismissed-v1',
  'nudges-week-1-shown-v1',
  'nudges-week-2-shown-v1',
  'nudges-week-3-shown-v1',
  'nudges-week-4-shown-v1',
  'nudges-substance-use-shown-v1',
  'screens-visited-v1',
  'last-upgrade-nudge-v1',
] as const;

// Keys that must NEVER be wiped
const COGNITO_KEYS = [
  'cognito_id_token',
  'cognito_access_token',
  'cognito_refresh_token',
] as const;

// ── Minimal localStorage implementation ─────────────────────────────────────

const store: Record<string, string> = {};
const ls = {
  getItem: (k: string): string | null => store[k] ?? null,
  setItem: (k: string, v: string): void => { store[k] = v; },
  removeItem: (k: string): void => { delete store[k]; },
  clear: (): void => { Object.keys(store).forEach((k) => delete store[k]); },
};

// ── Wipe helpers (mirrors App.svelte logic) ──────────────────────────────────

function sentinelWipe(): void {
  if (ls.getItem(SCHEMA_KEY) !== SCHEMA_VAL) {
    WIPE_KEYS.forEach((k) => ls.removeItem(k));
    ls.setItem(SCHEMA_KEY, SCHEMA_VAL);
  }
}

function resetWipe(): void {
  WIPE_KEYS.forEach((k) => ls.removeItem(k));
  ls.removeItem(SCHEMA_KEY);
}

// ── Setup ────────────────────────────────────────────────────────────────────

function seedAll(): void {
  // Seed every wipe key with dummy data
  WIPE_KEYS.forEach((k) => ls.setItem(k, JSON.stringify({ seeded: true })));
  // Seed Cognito tokens
  COGNITO_KEYS.forEach((k) => ls.setItem(k, `token-for-${k}`));
}

beforeEach(() => {
  ls.clear();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('sentinel mismatch wipe', () => {
  it('removes every key in WIPE_KEYS when sentinel is absent', () => {
    seedAll();
    sentinelWipe();

    for (const k of WIPE_KEYS) {
      expect(ls.getItem(k)).toBeNull();
    }
  });

  it('removes every key in WIPE_KEYS when sentinel has a stale value', () => {
    seedAll();
    ls.setItem(SCHEMA_KEY, 'stale-2025-01-01');
    sentinelWipe();

    for (const k of WIPE_KEYS) {
      expect(ls.getItem(k)).toBeNull();
    }
  });

  it('preserves Cognito tokens through the wipe', () => {
    seedAll();
    sentinelWipe();

    for (const k of COGNITO_KEYS) {
      expect(ls.getItem(k)).toBe(`token-for-${k}`);
    }
  });

  it('sets the sentinel to SCHEMA_VAL after wiping', () => {
    seedAll();
    sentinelWipe();
    expect(ls.getItem(SCHEMA_KEY)).toBe(SCHEMA_VAL);
  });

  it('does NOT wipe when sentinel already matches', () => {
    seedAll();
    ls.setItem(SCHEMA_KEY, SCHEMA_VAL);
    sentinelWipe(); // should be a no-op

    // Data should still be present
    for (const k of WIPE_KEYS) {
      expect(ls.getItem(k)).toBe(JSON.stringify({ seeded: true }));
    }
  });
});

describe('?reset=1 wipe', () => {
  it('removes every key in WIPE_KEYS', () => {
    seedAll();
    ls.setItem(SCHEMA_KEY, SCHEMA_VAL); // even with valid sentinel, reset clears everything
    resetWipe();

    for (const k of WIPE_KEYS) {
      expect(ls.getItem(k)).toBeNull();
    }
  });

  it('also removes the schema sentinel so next page-load re-wipes', () => {
    seedAll();
    ls.setItem(SCHEMA_KEY, SCHEMA_VAL);
    resetWipe();

    expect(ls.getItem(SCHEMA_KEY)).toBeNull();
  });

  it('preserves Cognito tokens through a ?reset=1 wipe', () => {
    seedAll();
    resetWipe();

    for (const k of COGNITO_KEYS) {
      expect(ls.getItem(k)).toBe(`token-for-${k}`);
    }
  });
});

describe('WIPE_KEYS completeness', () => {
  it('WIPE_KEYS does not contain any Cognito token key', () => {
    for (const cognitoKey of COGNITO_KEYS) {
      expect(WIPE_KEYS).not.toContain(cognitoKey);
    }
  });

  it('WIPE_KEYS contains at least 30 keys (regression guard)', () => {
    // If this drops below 30, something was accidentally removed.
    expect(WIPE_KEYS.length).toBeGreaterThanOrEqual(30);
  });
});
