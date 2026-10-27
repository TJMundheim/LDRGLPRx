import { describe, it, expect } from 'vitest';
import { sortEncountersNewestFirst, latestEncounter } from './encounterOrder.js';

const e = (id: string, createdAt?: string | null, updatedAt?: string | null) => ({ id, createdAt, updatedAt });

describe('sortEncountersNewestFirst', () => {
  it('orders by createdAt descending regardless of id order', () => {
    const out = sortEncountersNewestFirst([e('a', '2026-10-01T00:00:00Z'), e('b', '2026-10-20T00:00:00Z'), e('c', '2026-10-10T00:00:00Z')]);
    expect(out.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
  it('falls back to updatedAt when createdAt is missing', () => {
    const out = sortEncountersNewestFirst([e('a', '2026-10-05T00:00:00Z'), e('b', null, '2026-10-09T00:00:00Z')]);
    expect(out.map((x) => x.id)).toEqual(['b', 'a']);
  });
  it('keeps original order for ties and for entries with no timestamps; undated sink last', () => {
    const out = sortEncountersNewestFirst([e('x'), e('y'), e('z', '2026-10-01T00:00:00Z'), e('w', '')]);
    expect(out.map((x) => x.id)).toEqual(['z', 'x', 'y', 'w']);
  });
  it('does not mutate input and tolerates null/undefined', () => {
    const input = [e('a', '2026-10-01T00:00:00Z'), e('b', '2026-10-02T00:00:00Z')];
    sortEncountersNewestFirst(input);
    expect(input.map((x) => x.id)).toEqual(['a', 'b']);
    expect(sortEncountersNewestFirst(null)).toEqual([]);
    expect(sortEncountersNewestFirst(undefined)).toEqual([]);
  });
});

describe('latestEncounter', () => {
  it('returns the newest or undefined', () => {
    expect(latestEncounter([e('a', '2026-10-01T00:00:00Z'), e('b', '2026-10-02T00:00:00Z')])?.id).toBe('b');
    expect(latestEncounter([])).toBeUndefined();
  });
});
