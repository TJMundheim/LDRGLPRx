import { describe, it, expect, vi, beforeEach } from 'vitest';

const ssmSend = vi.hoisted(() => vi.fn());
vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: vi.fn().mockImplementation(() => ({ send: ssmSend })),
  GetParameterCommand: vi.fn().mockImplementation((input) => ({ input })),
}));

import { resolveTestPrice, resetTestPriceCache } from './test-price.js';

const TOKEN = 'abcDEF123_-xyz456GHIjkl78';
const future = () => new Date(Date.now() + 86_400_000).toISOString();
const param = (o: object) => ({ Parameter: { Value: JSON.stringify(o) } });

beforeEach(() => {
  vi.clearAllMocks();
  resetTestPriceCache();
  ssmSend.mockResolvedValue(param({ token: TOKEN, expiresAt: future() }));
});

describe('resolveTestPrice', () => {
  it('valid token -> $2.00 price_data named for the blend', async () => {
    const r = await resolveTestPrice('push-patch-bpc-nad-ghk', TOKEN);
    expect(r).toEqual({ currency: 'usd', unit_amount: 200, product_data: { name: 'Push Patch — Repair (TEST $2)' } });
  });

  it('reads the SecureString with decryption', async () => {
    await resolveTestPrice('push-patch-wolverine', TOKEN);
    expect(ssmSend.mock.calls[0][0].input).toEqual({ Name: '/my4mlife/push-patch/test-token', WithDecryption: true });
  });

  it('caches the parameter between calls', async () => {
    await resolveTestPrice('push-patch-wolverine', TOKEN);
    await resolveTestPrice('push-patch-wolverine', TOKEN);
    expect(ssmSend).toHaveBeenCalledTimes(1);
  });

  it('wrong token -> null', async () => {
    expect(await resolveTestPrice('push-patch-wolverine', 'nope')).toBeNull();
  });

  it('same-length wrong token -> null', async () => {
    expect(await resolveTestPrice('push-patch-wolverine', 'x'.repeat(TOKEN.length))).toBeNull();
  });

  it('expired -> null', async () => {
    ssmSend.mockResolvedValue(param({ token: TOKEN, expiresAt: new Date(Date.now() - 1000).toISOString() }));
    expect(await resolveTestPrice('push-patch-wolverine', TOKEN)).toBeNull();
  });

  it('SSM missing / throws -> null (never throws)', async () => {
    ssmSend.mockRejectedValue(Object.assign(new Error('ParameterNotFound'), { name: 'ParameterNotFound' }));
    expect(await resolveTestPrice('push-patch-wolverine', TOKEN)).toBeNull();
  });

  it('malformed parameter JSON -> null', async () => {
    ssmSend.mockResolvedValue({ Parameter: { Value: 'not json' } });
    expect(await resolveTestPrice('push-patch-wolverine', TOKEN)).toBeNull();
  });

  it('non-string / empty token -> null, SSM not read', async () => {
    expect(await resolveTestPrice('push-patch-wolverine', 123)).toBeNull();
    expect(await resolveTestPrice('push-patch-wolverine', '')).toBeNull();
    expect(await resolveTestPrice('push-patch-wolverine', undefined)).toBeNull();
    expect(ssmSend).not.toHaveBeenCalled();
  });

  it('non-patch sku -> null, SSM not read', async () => {
    expect(await resolveTestPrice('biome-ns-ultra', TOKEN)).toBeNull();
    expect(ssmSend).not.toHaveBeenCalled();
  });

  it('never logs the token', async () => {
    const spies = (['log', 'warn', 'error', 'info'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    ssmSend.mockRejectedValue(new Error('boom'));
    await resolveTestPrice('push-patch-wolverine', TOKEN);
    for (const s of spies) expect(JSON.stringify(s.mock.calls)).not.toContain(TOKEN);
    spies.forEach((s) => s.mockRestore());
  });
});
