import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseDayLog, todaysSchema, LogParseError, LOG_PARSE_URL } from './logParse.js';

const schema = todaysSchema(1);

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('todaysSchema', () => {
  it('always includes the 5 standing actions', () => {
    const ids = todaysSchema(1).actions.map(a => a.id);
    expect(ids).toEqual(expect.arrayContaining([
      'biome-ns-ultra', 'eating-window', 'protein-breakfast', 'strength', 'fasted-walk',
    ]));
  });

  it('does not duplicate a Move that rides a standing action', () => {
    const ids = todaysSchema(1).actions.map(a => a.id); // week 1 Move = biome-ns-ultra
    expect(ids.filter(i => i === 'biome-ns-ultra')).toHaveLength(1);
    expect(ids).toHaveLength(5);
  });

  it('appends a non-standing Move (week 4 = pantry purge)', () => {
    const ids = todaysSchema(4).actions.map(a => a.id);
    expect(ids).toHaveLength(6);
    expect(ids).toContain('move-pantry-purge');
  });

  it('carries the four numeric fields with ranges', () => {
    const f = todaysSchema(1).fields;
    expect(f.map(x => x.id)).toEqual(['sleepHours', 'walkMinutes', 'proteinGrams', 'strengthMinutes']);
    expect(f[0]).toMatchObject({ min: 3, max: 12, step: 0.5 });
    expect(f[1]).toMatchObject({ min: 0, max: 180 });
    expect(f[2]).toMatchObject({ min: 0, max: 120 });
  });
});

describe('parseDayLog', () => {
  it('POSTs text + date + schema to the log-parse endpoint', async () => {
    (fetch as any).mockResolvedValue(ok({ actions: {}, fields: {}, notes: '', unclear: [] }));
    await parseDayLog('walked 30', '2026-09-15', schema);
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe(LOG_PARSE_URL);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.text).toBe('walked 30');
    expect(body.date).toBe('2026-09-15');
    expect(body.actions).toHaveLength(5);
    expect(body.fields).toHaveLength(4);
  });

  it('normalises actions to true / false / null for every schema action', async () => {
    (fetch as any).mockResolvedValue(ok({
      actions: { 'fasted-walk': true, strength: false, junk: true },
      fields: { walkMinutes: 30 },
      notes: 'felt good',
      unclear: ['protein'],
    }));
    const r = await parseDayLog('x', '2026-09-15', schema);
    expect(r.actions['fasted-walk']).toBe(true);
    expect(r.actions['strength']).toBe(false);
    expect(r.actions['biome-ns-ultra']).toBeNull();
    expect(r.actions).not.toHaveProperty('junk');
    expect(r.notes).toBe('felt good');
    expect(r.unclear).toEqual(['protein']);
  });

  it('clamps numbers into range and nulls unusable values', async () => {
    (fetch as any).mockResolvedValue(ok({
      actions: {}, fields: { sleepHours: 99, walkMinutes: -5, proteinGrams: 'abc', strengthMinutes: 45 },
      notes: '', unclear: [],
    }));
    const r = await parseDayLog('x', '2026-09-15', schema);
    expect(r.fields.sleepHours).toBe(12);
    expect(r.fields.walkMinutes).toBe(0);
    expect(r.fields.proteinGrams).toBeNull();
    expect(r.fields.strengthMinutes).toBe(45);
  });

  it('throws kind "empty" without calling the network', async () => {
    await expect(parseDayLog('   ', '2026-09-15', schema)).rejects.toMatchObject({ kind: 'empty' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('throws kind "http" on a non-2xx response', async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });
    const err = await parseDayLog('x', '2026-09-15', schema).catch(e => e);
    expect(err).toBeInstanceOf(LogParseError);
    expect(err.kind).toBe('http');
    expect(err.status).toBe(502);
  });

  it('throws kind "network" when fetch rejects', async () => {
    (fetch as any).mockRejectedValue(new TypeError('offline'));
    await expect(parseDayLog('x', '2026-09-15', schema)).rejects.toMatchObject({ kind: 'network' });
  });

  it('throws kind "timeout" when the request is aborted', async () => {
    (fetch as any).mockImplementation((_u: string, init: any) => new Promise((_res, rej) => {
      init.signal.addEventListener('abort', () => {
        const e = new Error('aborted');
        e.name = 'AbortError';
        rej(e);
      });
    }));
    vi.useFakeTimers();
    const p = parseDayLog('x', '2026-09-15', schema);
    const assertion = expect(p).rejects.toMatchObject({ kind: 'timeout' });
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it('throws kind "bad-response" when the body is not JSON', async () => {
    (fetch as any).mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('nope'); } });
    await expect(parseDayLog('x', '2026-09-15', schema)).rejects.toMatchObject({ kind: 'bad-response' });
  });
});
