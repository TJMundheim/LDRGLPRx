import { describe, it, expect, vi } from 'vitest';
import {
  COUNT_FIELDS, parseCountInput, needsTenKAction, weekSummary, saveCounts, countRowsToValues, TEN_K_ACTION,
} from './counts.js';

const mon = new Date(2026, 10, 16); // Mon 2026-11-16 (local)
const e = (date: string, id: string, value: number) => ({ dateActionId: `${date}#${id}`, value });

describe('parseCountInput', () => {
  it('has at most 5 fields, all with count- ids', () => {
    expect(COUNT_FIELDS.length).toBeLessThanOrEqual(5);
    for (const f of COUNT_FIELDS) expect(f.actionId.startsWith('count-')).toBe(true);
  });
  it('allows empty', () => {
    expect(parseCountInput('steps', '')).toEqual({ ok: true, value: null });
    expect(parseCountInput('steps', '  ')).toEqual({ ok: true, value: null });
  });
  it('strips commas and parses numbers', () => {
    expect(parseCountInput('steps', '8,250')).toEqual({ ok: true, value: 8250 });
    expect(parseCountInput('sleep', '7.5')).toEqual({ ok: true, value: 7.5 });
  });
  it('rejects junk, negatives, out of range, fractional steps', () => {
    expect(parseCountInput('steps', 'abc').ok).toBe(false);
    expect(parseCountInput('steps', '-1').ok).toBe(false);
    expect(parseCountInput('steps', '200000').ok).toBe(false);
    expect(parseCountInput('steps', '10.5').ok).toBe(false);
    expect(parseCountInput('water', '30').ok).toBe(false);
    expect(parseCountInput('sleep', '25').ok).toBe(false);
    expect(parseCountInput('chews', '101').ok).toBe(false);
  });
  it('accepts zero where it makes sense, not for chews', () => {
    expect(parseCountInput('water', '0')).toEqual({ ok: true, value: 0 });
    expect(parseCountInput('steps', '0')).toEqual({ ok: true, value: 0 });
    expect(parseCountInput('chews', '0').ok).toBe(false);
    expect(parseCountInput('chews', '1')).toEqual({ ok: true, value: 1 });
  });
  it('decimal sleep: comma decimal mark, leading/trailing dot; no NaN', () => {
    expect(parseCountInput('sleep', '7,5')).toEqual({ ok: true, value: 7.5 });
    expect(parseCountInput('sleep', '.5')).toEqual({ ok: true, value: 0.5 });
    expect(parseCountInput('sleep', '7.')).toEqual({ ok: true, value: 7 });
    for (const bad of ['.', '1e3', 'NaN', 'Infinity', '7..5', '7.5.1']) expect(parseCountInput('sleep', bad).ok).toBe(false);
    expect(parseCountInput('water', '2.5').ok).toBe(false);
  });
});

describe('needsTenKAction', () => {
  it('true at 10,000+ when not yet logged', () => {
    expect(needsTenKAction(10000, false)).toBe(true);
    expect(needsTenKAction(12000, false)).toBe(true);
  });
  it('false below 10k, null, or already logged (no double log)', () => {
    expect(needsTenKAction(9999, false)).toBe(false);
    expect(needsTenKAction(null, false)).toBe(false);
    expect(needsTenKAction(15000, true)).toBe(false);
  });
});

describe('weekSummary', () => {
  const entries = [
    e('2026-11-15', 'count-steps', 99999), // Sunday before: excluded
    e('2026-11-16', 'count-steps', 6000), e('2026-11-16', 'count-chews', 20),
    e('2026-11-18', 'count-steps', 10000), e('2026-11-18', 'count-water', 2),
    e('2026-11-22', 'count-steps', 8000), // Sunday: included
    e('2026-11-23', 'count-steps', 1), // next Monday: excluded
  ];
  it('averages within Monday-Sunday only and counts days logged', () => {
    const s = weekSummary(entries, mon);
    expect(s.avgSteps).toBe(8000);
    expect(s.avgChews).toBe(20);
    expect(s.avgWater).toBe(2);
    expect(s.avgSleep).toBeNull();
    expect(s.daysLogged).toBe(3);
    expect(s.steps).toEqual([6000, null, 10000, null, null, null, 8000]);
  });
  it('rounds average steps to a whole number', () => {
    expect(weekSummary([e('2026-11-16', 'count-steps', 8000), e('2026-11-17', 'count-steps', 8001)], mon).avgSteps).toBe(8001);
  });
    it('is null/zero for an empty week', () => {
    const s = weekSummary([], mon);
    expect(s.avgSteps).toBeNull();
    expect(s.daysLogged).toBe(0);
  });
  it('is DST-safe across the fall-back week (2026-11-01)', () => {
    const s = weekSummary([e('2026-11-01', 'count-steps', 5000), e('2026-10-26', 'count-steps', 3000)], new Date(2026, 9, 26));
    expect(s.steps[0]).toBe(3000);
    expect(s.steps[6]).toBe(5000);
  });
});

describe('countRowsToValues', () => {
  it('maps a day to field values', () => {
    expect(countRowsToValues([e('2026-11-16', 'count-steps', 5), e('2026-11-17', 'count-steps', 9)], '2026-11-16'))
      .toEqual({ steps: 5, chews: null, water: null, sleep: null });
  });
});

describe('saveCounts', () => {
  it('upserts values with source manual, deletes cleared, logs 10k once', async () => {
    const record = vi.fn().mockResolvedValue({});
    await saveCounts(record, '2026-11-16', { steps: 10500, chews: 30, water: null, sleep: null },
      [e('2026-11-16', 'count-water', 3)]);
    const calls = record.mock.calls.map(c => c[0]);
    const steps = calls.find(c => c.actionId === 'count-steps');
    expect(steps).toMatchObject({ date: '2026-11-16', completed: true, value: 10500 });
    expect(JSON.parse(steps.notes)).toEqual({ source: 'manual' });
    expect(calls.find(c => c.actionId === 'count-water')).toMatchObject({ completed: false });
    expect(calls.find(c => c.actionId === 'count-sleep')).toBeUndefined();
    expect(calls.filter(c => c.actionId === TEN_K_ACTION)).toHaveLength(1);
  });
  it('reports tenKLogged only when the 10k row was written', async () => {
    const ok = vi.fn().mockResolvedValue({});
    expect(await saveCounts(ok, '2026-11-16', { steps: 10000, chews: null, water: null, sleep: null }, [])).toEqual({ tenKLogged: true });
    expect(await saveCounts(ok, '2026-11-16', { steps: 9999, chews: null, water: null, sleep: null }, [])).toEqual({ tenKLogged: false });
    const fail = vi.fn().mockImplementation(async (i: any) => { if (i.actionId === TEN_K_ACTION) throw new Error('x'); return {}; });
    expect(await saveCounts(fail, '2026-11-16', { steps: 10000, chews: null, water: null, sleep: null }, [])).toEqual({ tenKLogged: false });
  });
  it('does not delete a cleared field that was never saved, and never writes NaN', async () => {
    const record = vi.fn().mockResolvedValue({});
    await saveCounts(record, '2026-11-16', { steps: null, chews: null, water: null, sleep: 7.5 }, []);
    expect(record.mock.calls.map(c => c[0].actionId)).toEqual(['count-sleep']);
    expect(Number.isFinite(record.mock.calls[0][0].value)).toBe(true);
  });
  it('does not re-log 10k when already present, and ignores 10k failure', async () => {
    const record = vi.fn().mockResolvedValue({});
    await saveCounts(record, '2026-11-16', { steps: 11000, chews: null, water: null, sleep: null },
      [{ dateActionId: `2026-11-16#${TEN_K_ACTION}` }]);
    expect(record.mock.calls.some(c => c[0].actionId === TEN_K_ACTION)).toBe(false);
    const rec2 = vi.fn().mockImplementation(async (i: any) => { if (i.actionId === TEN_K_ACTION) throw new Error('x'); return {}; });
    await expect(saveCounts(rec2, '2026-11-17', { steps: 11000, chews: null, water: null, sleep: null }, [])).resolves.toEqual({ tenKLogged: false });
  });
});
