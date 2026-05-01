import { describe, it, expect } from 'vitest';
import { detectReturningUser, fillNeutralDefaults } from './intakeMigration';

// Minimal in-memory Storage implementation
function makeStorage(initial: Record<string, string> = {}): Storage {
  const store: Record<string, string> = { ...initial };
  return {
    length: 0,
    key: () => null,
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  } as unknown as Storage;
}

describe('detectReturningUser', () => {
  it('fresh — empty storage', () => {
    const s = makeStorage();
    expect(detectReturningUser(s).kind).toBe('fresh');
  });

  it('returning-completed — intake-complete-v1 set', () => {
    const s = makeStorage({
      'intake-complete-v1': JSON.stringify({ completedAt: '2025-01-01T00:00:00.000Z' }),
    });
    expect(detectReturningUser(s).kind).toBe('returning-completed');
  });

  it('in-flight — intake-stage-v1 set to stage 2', () => {
    const s = makeStorage({
      'intake-stage-v1': JSON.stringify({ currentStage: 2 }),
    });
    expect(detectReturningUser(s).kind).toBe('in-flight');
  });

  it('fresh — stage set but currentStage=0 or 1', () => {
    const s0 = makeStorage({ 'intake-stage-v1': JSON.stringify({ currentStage: 0 }) });
    expect(detectReturningUser(s0).kind).toBe('fresh');

    const s1 = makeStorage({ 'intake-stage-v1': JSON.stringify({ currentStage: 1 }) });
    expect(detectReturningUser(s1).kind).toBe('fresh');
  });

  it('in-flight — stage set to 3', () => {
    const s = makeStorage({
      'intake-stage-v1': JSON.stringify({ currentStage: 3 }),
    });
    expect(detectReturningUser(s).kind).toBe('in-flight');
  });
});

describe('fillNeutralDefaults (stub)', () => {
  it('returns 0 — no-op stub for backward compat', () => {
    const s = makeStorage();
    expect(fillNeutralDefaults(s)).toBe(0);
  });
});
