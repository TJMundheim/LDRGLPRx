/**
 * Unit tests for the v1 MindSpan Score module (pure, deterministic).
 */

import { describe, it, expect } from 'vitest';
import {
  riskLoadFromScores,
  mindspanScore,
  adherencePctForWindow,
  streakDays,
  mindspanSeries,
  weeklyDelta,
} from './mindspan.js';

// ── Fixed reference date so tests are deterministic ──────────────────────────
const END = new Date('2026-07-02T12:00:00');

function dstr(offset: number): string {
  const d = new Date(END);
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function entry(offset: number, actionId: string, hour = '08:00'): { dateActionId: string; completedAt: string } {
  const ds = dstr(offset);
  return { dateActionId: `${ds}#${actionId}`, completedAt: `${ds}T${hour}` };
}

// ── riskLoadFromScores ────────────────────────────────────────────────────────

describe('riskLoadFromScores', () => {
  it('returns 50 (neutral default) for null', () => {
    expect(riskLoadFromScores(null)).toBe(50);
  });

  it('returns 50 (neutral default) for undefined', () => {
    expect(riskLoadFromScores(undefined)).toBe(50);
  });

  it('returns 50 (neutral default) for an empty object', () => {
    expect(riskLoadFromScores({})).toBe(50);
  });

  it('returns 100 when all scores are at maxPerFactor', () => {
    expect(riskLoadFromScores({ a: 5, b: 5 })).toBe(100);
  });

  it('returns 0 when all scores are 0', () => {
    expect(riskLoadFromScores({ a: 0, b: 0 })).toBe(0);
  });

  it('averages values across factors relative to maxPerFactor', () => {
    // (2 + 3 + 4) / (5 * 3) * 100 = 60
    expect(riskLoadFromScores({ a: 2, b: 3, c: 4 })).toBe(60);
  });

  it('clamps values above maxPerFactor before summing', () => {
    // 10 clamps to 5 -> (5 + 0) / (5*2) * 100 = 50
    expect(riskLoadFromScores({ a: 10, b: -5 })).toBe(50);
  });

  it('respects a custom maxPerFactor', () => {
    // (10 + 10) / (10*2) * 100 = 100
    expect(riskLoadFromScores({ a: 10, b: 10 }, 10)).toBe(100);
  });
});

// ── mindspanScore ─────────────────────────────────────────────────────────────

describe('mindspanScore', () => {
  it('returns 100 for perfect adherence, zero risk, full streak', () => {
    expect(mindspanScore({ adherencePct: 100, riskLoad: 0, streakDays: 14 })).toBe(100);
  });

  it('returns 0 for zero adherence, max risk, no streak', () => {
    expect(mindspanScore({ adherencePct: 0, riskLoad: 100, streakDays: 0 })).toBe(0);
  });

  it('computes a mid-range weighted score', () => {
    // 0.45*80 + 0.35*(100-50) + 0.20*(7/14)*100 = 36 + 17.5 + 10 = 63.5 -> round -> 64
    expect(mindspanScore({ adherencePct: 80, riskLoad: 50, streakDays: 7 })).toBe(64);
  });

  it('caps the streak contribution at 14 days', () => {
    const at14 = mindspanScore({ adherencePct: 50, riskLoad: 50, streakDays: 14 });
    const at30 = mindspanScore({ adherencePct: 50, riskLoad: 50, streakDays: 30 });
    expect(at30).toBe(at14);
    expect(at14).toBe(60);
  });

  it('clamps the result to a maximum of 100 with out-of-range inputs', () => {
    expect(mindspanScore({ adherencePct: 200, riskLoad: -50, streakDays: 30 })).toBe(100);
  });

  it('clamps the result to a minimum of 0 with out-of-range inputs', () => {
    expect(mindspanScore({ adherencePct: -50, riskLoad: 200, streakDays: -10 })).toBe(0);
  });
});

// ── adherencePctForWindow ─────────────────────────────────────────────────────

describe('adherencePctForWindow', () => {
  it('returns 100 when both actions are completed every day in the window', () => {
    const entries = [];
    for (let o = 0; o < 7; o++) {
      entries.push(entry(o, 'biome-ns-ultra'), entry(o, 'eating-window'));
    }
    expect(adherencePctForWindow(entries, END, 7)).toBe(100);
  });

  it('returns 0 for an empty entries array', () => {
    expect(adherencePctForWindow([], END, 7)).toBe(0);
  });

  it('counts duplicate same-day same-action entries only once', () => {
    const entries = [
      entry(0, 'biome-ns-ultra', '08:00'),
      entry(0, 'biome-ns-ultra', '09:00'),
      entry(0, 'eating-window', '08:00'),
    ];
    // 2 unique hits out of 14 slots -> round(100*2/14) = 14
    expect(adherencePctForWindow(entries, END, 7)).toBe(14);
  });

  it('ignores entries outside the window', () => {
    const entries = [
      entry(10, 'biome-ns-ultra'), // outside a 7-day window
      entry(0, 'biome-ns-ultra'),
    ];
    // 1 unique hit out of 14 slots -> round(100*1/14) = 7
    expect(adherencePctForWindow(entries, END, 7)).toBe(7);
  });

  it('ignores entries for unrecognized action ids', () => {
    const entries = [entry(0, 'some-other-action')];
    expect(adherencePctForWindow(entries, END, 7)).toBe(0);
  });
});

// ── streakDays ─────────────────────────────────────────────────────────────────

describe('streakDays', () => {
  it('returns the length of the longest consecutive run', () => {
    const entries = [4, 3, 2, 1, 0].map((o) => entry(o, 'biome-ns-ultra'));
    entries.push(entry(10, 'biome-ns-ultra')); // isolated day, does not extend the run
    expect(streakDays(entries, END, 'biome-ns-ultra', 14)).toBe(5);
  });

  it('returns 0 when there are no entries', () => {
    expect(streakDays([], END, 'biome-ns-ultra', 14)).toBe(0);
  });

  it('does not double count duplicate same-day entries', () => {
    const entries = [4, 3, 2, 1, 0].map((o) => entry(o, 'biome-ns-ultra'));
    entries.push(entry(0, 'biome-ns-ultra', '20:00')); // duplicate for day 0
    expect(streakDays(entries, END, 'biome-ns-ultra', 14)).toBe(5);
  });

  it('caps the streak at the lookback window', () => {
    const entries = Array.from({ length: 20 }, (_, o) => entry(o, 'biome-ns-ultra'));
    expect(streakDays(entries, END, 'biome-ns-ultra', 14)).toBe(14);
  });
});

// ── mindspanSeries ────────────────────────────────────────────────────────────

describe('mindspanSeries', () => {
  it('returns `days` scores, oldest to newest, reflecting growing adherence history', () => {
    const entries = [];
    for (let o = 0; o < 7; o++) {
      entries.push(entry(o, 'biome-ns-ultra'), entry(o, 'eating-window'));
    }
    const series = mindspanSeries(entries, 20, END, 7);
    expect(series).toHaveLength(7);
    expect(series).toEqual([36, 44, 52, 59, 67, 75, 83]);
    // strictly increasing since each successive day accumulates more adherence history
    for (let i = 1; i < series.length; i++) {
      expect(series[i]).toBeGreaterThanOrEqual(series[i - 1]);
    }
  });
});

// ── weeklyDelta ────────────────────────────────────────────────────────────────

describe('weeklyDelta', () => {
  it('returns the difference between the last and first entries, to one decimal', () => {
    expect(weeklyDelta([36, 44, 52, 59, 67, 75, 83])).toBe(47);
  });

  it('returns a negative delta when the score declined', () => {
    expect(weeklyDelta([80, 70, 60])).toBe(-20);
  });

  it('returns 0 for a flat series', () => {
    expect(weeklyDelta([50, 50, 50])).toBe(0);
  });
});
