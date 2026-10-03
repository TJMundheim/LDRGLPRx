import { describe, it, expect, beforeEach, vi } from 'vitest';

const ssmSend = vi.fn();
vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: class { send = (...a: any[]) => ssmSend(...a); },
  GetParameterCommand: class { input: any; constructor(i: any) { this.input = i; } },
}));
import { loadPractice, resetPracticeCache } from './genesis-config';

const FULL = {
  clinician: 'c', practice: 'p', practice_phone: '1', payment_email: 'e@x.com', billing: 'b', placer: 'pl', placer_phone: '2', salesrep: 's',
};
const param = (v: unknown) => ({ Parameter: { Value: typeof v === 'string' ? v : JSON.stringify(v) } });

beforeEach(() => { ssmSend.mockReset(); resetPracticeCache(); });

describe('loadPractice', () => {
  it('reads /my4mlife/genesis/practice (plain String, no decryption) and reports complete', async () => {
    ssmSend.mockResolvedValue(param({ ...FULL, physician_signature: 'sig', microneedling_per_order: '2' }));
    const r = await loadPractice();
    expect(ssmSend.mock.calls[0][0].input).toEqual({ Name: '/my4mlife/genesis/practice' });
    expect(r.missing).toEqual([]);
    expect(r.practice).toMatchObject({ clinician: 'c', physician_signature: 'sig', microneedling_per_order: '2' });
  });

  it('caches a complete config across calls', async () => {
    ssmSend.mockResolvedValue(param(FULL));
    await loadPractice(); await loadPractice();
    expect(ssmSend).toHaveBeenCalledTimes(1);
  });

  it('lists every empty / absent required key as missing; optional keys are not required', async () => {
    ssmSend.mockResolvedValue(param({ ...FULL, billing: '  ', salesrep: undefined }));
    expect((await loadPractice()).missing.sort()).toEqual(['billing', 'salesrep']);
  });

  it('missing parameter, bad JSON or SSM error → everything missing, never throws', async () => {
    ssmSend.mockRejectedValueOnce(Object.assign(new Error('nf'), { name: 'ParameterNotFound' }));
    expect((await loadPractice()).missing).toHaveLength(8);
    ssmSend.mockResolvedValueOnce(param('not json'));
    expect((await loadPractice()).missing).toHaveLength(8);
    ssmSend.mockRejectedValueOnce(new Error('throttled'));
    expect((await loadPractice()).missing).toHaveLength(8);
  });

  it('does not cache an incomplete config — fixing the parameter takes effect on the next order', async () => {
    ssmSend.mockResolvedValueOnce(param({ ...FULL, billing: '' }));
    expect((await loadPractice()).missing).toEqual(['billing']);
    ssmSend.mockResolvedValueOnce(param(FULL));
    expect((await loadPractice()).missing).toEqual([]);
  });
});
