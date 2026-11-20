import { describe, it, expect } from 'vitest';
import {
  pickWinner, secureRandomIndex, ordinal, loadState, saveState, clearState,
  defaultEvent, type Entrant,
} from './drawing.js';

const E = (id: string, display = id): Entrant => ({ contactId: id, display });

describe('pickWinner', () => {
  it('excludes previous winners', () => {
    const pool = [E('a'), E('b'), E('c')];
    for (let i = 0; i < 50; i++) {
      const w = pickWinner(pool, [E('a'), E('b')], () => 0);
      expect(w?.contactId).toBe('c');
    }
  });
  it('returns null with 0 entrants or when all already drawn', () => {
    expect(pickWinner([], [], () => 0)).toBeNull();
    expect(pickWinner([E('a')], [E('a')], () => 0)).toBeNull();
  });
  it('handles 1 and 2 entrants', () => {
    expect(pickWinner([E('a')], [], () => 0)?.contactId).toBe('a');
    const two = [E('a'), E('b')];
    const first = pickWinner(two, [], () => 1)!;
    expect(first.contactId).toBe('b');
    expect(pickWinner(two, [first], () => 0)?.contactId).toBe('a');
    expect(pickWinner(two, [first, E('a')], () => 0)).toBeNull();
  });
  it('uses the injected random over the remaining pool only', () => {
    const calls: number[] = [];
    pickWinner([E('a'), E('b'), E('c')], [E('a')], (n) => { calls.push(n); return 1; });
    expect(calls).toEqual([2]);
  });
});

describe('secureRandomIndex', () => {
  it('stays in range and covers all values', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) {
      const v = secureRandomIndex(3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(3);
      seen.add(v);
    }
    expect(seen.size).toBe(3);
  });
  it('is 0 for n=1 and throws for n<1', () => {
    expect(secureRandomIndex(1)).toBe(0);
    expect(() => secureRandomIndex(0)).toThrow();
  });
});

describe('ordinal', () => {
  it('formats 1st..3rd and beyond', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(ordinal)).toEqual(
      ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd'],
    );
  });
});

describe('session state per tag', () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
  };
  it('round-trips winners per tag', () => {
    const s = mem();
    saveState('talk-a', { winners: [E('a', 'Jane D.')], maxDraws: 3 }, s);
    expect(loadState('talk-a', s).winners).toEqual([E('a', 'Jane D.')]);
    expect(loadState('talk-b', s).winners).toEqual([]);
  });
  it('clear removes; corrupt/missing storage falls back to empty', () => {
    const s = mem();
    saveState('talk-a', { winners: [E('a')], maxDraws: 5 }, s);
    clearState('talk-a', s);
    expect(loadState('talk-a', s)).toEqual({ winners: [], maxDraws: 3 });
    s.setItem('drawing:v1:talk-a', '{not json');
    expect(loadState('talk-a', s)).toEqual({ winners: [], maxDraws: 3 });
    expect(loadState('talk-a', null)).toEqual({ winners: [], maxDraws: 3 });
  });
});

describe('defaultEvent', () => {
  it('picks the most recent lastEntryAt, null when none', () => {
    expect(defaultEvent([])).toBeNull();
    expect(defaultEvent([
      { tag: 'talk-old', entrantCount: 2, lastEntryAt: '2026-11-10T00:00:00Z' },
      { tag: 'talk-new', entrantCount: 1, lastEntryAt: '2026-11-19T00:00:00Z' },
    ])).toBe('talk-new');
  });
});
