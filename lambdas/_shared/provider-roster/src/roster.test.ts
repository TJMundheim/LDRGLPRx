import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadRoster, resolveProvider, validateRoster, resetRosterCache } from './index';

const MOLINA = { id: 'molina', name: 'Oscar Molina', credentials: 'MD', inbox: 'drtj@mdspecialtygroup.com', default: true };
const OTHER = { id: 'smith', name: 'Jane Smith', credentials: 'DO', inbox: 'drtj@mdspecialtygroup.com' };
const param = (v: unknown) => ({ Parameter: { Value: typeof v === 'string' ? v : JSON.stringify(v) } });
const notFound = () => Object.assign(new Error('nf'), { name: 'ParameterNotFound' });

// fake ssm: map of parameter name -> value (or Error)
const fakeSsm = (store: Record<string, unknown>) => ({
  send: vi.fn(async (cmd: { input: { Name: string } }) => {
    const v = store[cmd.input.Name];
    if (v === undefined) throw notFound();
    if (v instanceof Error) throw v;
    return param(v);
  }),
});

beforeEach(() => { resetRosterCache(); vi.spyOn(console, 'error').mockImplementation(() => {}); });

describe('validateRoster', () => {
  it('parses a valid roster object', () => {
    expect(validateRoster({ providers: [MOLINA, OTHER] })).toEqual([MOLINA, { ...OTHER, default: false }]);
  });
  it('parses a JSON string', () => {
    expect(validateRoster(JSON.stringify({ providers: [MOLINA] }))).toHaveLength(1);
  });
  it('rejects non-JSON, missing providers, and empty list', () => {
    expect(() => validateRoster('{nope')).toThrow(/json/i);
    expect(() => validateRoster({})).toThrow(/providers/i);
    expect(() => validateRoster({ providers: [] })).toThrow(/providers/i);
  });
  it('rejects duplicate ids', () => {
    expect(() => validateRoster({ providers: [MOLINA, { ...OTHER, id: 'molina' }] })).toThrow(/unique/i);
  });
  it('rejects zero or multiple defaults', () => {
    expect(() => validateRoster({ providers: [{ ...MOLINA, default: false }, OTHER] })).toThrow(/default/i);
    expect(() => validateRoster({ providers: [MOLINA, { ...OTHER, default: true }] })).toThrow(/default/i);
  });
  it('rejects empty ids and names', () => {
    expect(() => validateRoster({ providers: [{ ...MOLINA, name: '  ' }] })).toThrow(/name/i);
    expect(() => validateRoster({ providers: [{ ...MOLINA, id: '' }] })).toThrow(/id/i);
  });
});

describe('loadRoster', () => {
  it('reads /my4mlife/providers in us-east-2-style GetParameter and returns the roster', async () => {
    const ssm = fakeSsm({ '/my4mlife/providers': { providers: [MOLINA, OTHER] } });
    const r = await loadRoster(ssm);
    expect(ssm.send.mock.calls[0][0].input).toEqual({ Name: '/my4mlife/providers' });
    expect(r.map((p) => p.id)).toEqual(['molina', 'smith']);
  });
  it('caches across calls', async () => {
    const ssm = fakeSsm({ '/my4mlife/providers': { providers: [MOLINA] } });
    await loadRoster(ssm); await loadRoster(ssm);
    expect(ssm.send).toHaveBeenCalledTimes(1);
  });
  it('resetRosterCache forces a re-read', async () => {
    const ssm = fakeSsm({ '/my4mlife/providers': { providers: [MOLINA] } });
    await loadRoster(ssm); resetRosterCache(); await loadRoster(ssm);
    expect(ssm.send).toHaveBeenCalledTimes(2);
  });
  it('falls back to the practice clinician when the param is missing', async () => {
    const ssm = fakeSsm({ '/my4mlife/genesis/practice': { clinician: 'Oscar Molina', practice: 'x' } });
    expect(await loadRoster(ssm)).toEqual([{ id: 'default', name: 'Oscar Molina', credentials: '', inbox: '', default: true }]);
  });
  it('falls back when the param is invalid', async () => {
    const ssm = fakeSsm({ '/my4mlife/providers': '{bad', '/my4mlife/genesis/practice': { clinician: 'Oscar Molina' } });
    const r = await loadRoster(ssm);
    expect(r).toEqual([{ id: 'default', name: 'Oscar Molina', credentials: '', inbox: '', default: true }]);
  });
  it('falls back when the param fails validation (two defaults)', async () => {
    const ssm = fakeSsm({
      '/my4mlife/providers': { providers: [MOLINA, { ...OTHER, default: true }] },
      '/my4mlife/genesis/practice': { clinician: 'Fallback Doc' },
    });
    expect((await loadRoster(ssm))[0].name).toBe('Fallback Doc');
  });
  it('throws a clear error when both are missing', async () => {
    await expect(loadRoster(fakeSsm({}))).rejects.toThrow(/provider roster unavailable/i);
  });
  it('throws when practice has no clinician', async () => {
    await expect(loadRoster(fakeSsm({ '/my4mlife/genesis/practice': { clinician: ' ' } }))).rejects.toThrow(/provider roster unavailable/i);
  });
  it('re-reads after a fallback so adding the param needs no redeploy', async () => {
    const store: Record<string, unknown> = { '/my4mlife/genesis/practice': { clinician: 'Oscar Molina' } };
    const ssm = fakeSsm(store);
    expect((await loadRoster(ssm))[0].id).toBe('default');
    store['/my4mlife/providers'] = { providers: [MOLINA] };
    expect((await loadRoster(ssm))[0].id).toBe('molina');
  });
});

describe('resolveProvider', () => {
  const roster = validateRoster({ providers: [OTHER, MOLINA] });
  it('returns the matching provider', () => { expect(resolveProvider(roster, 'smith').id).toBe('smith'); });
  it('returns the default for empty, undefined, or unknown ids', () => {
    expect(resolveProvider(roster).id).toBe('molina');
    expect(resolveProvider(roster, '').id).toBe('molina');
    expect(resolveProvider(roster, 'nobody').id).toBe('molina');
  });
});
