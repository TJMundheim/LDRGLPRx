import { describe, it, expect, beforeEach, vi } from 'vitest';

const ddbSend = vi.fn();
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: any[]) => ddbSend(...a) }) },
  GetCommand: class { __t = 'Get'; constructor(public input: any) {} },
  UpdateCommand: class { __t = 'Update'; constructor(public input: any) {} },
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class { constructor(_: any) {} } }));

import { buildRefillAuth, grantRefills, getRefillAuth, claimRefillSlot, setRefillAuthFields, setRefillShipTo, partnerRefFromSession, recordShipment } from './refill-auth';

const NOW = new Date('2026-11-15T12:00:00.000Z');
const mk = (o: any = {}) => buildRefillAuth({ refills: 3, sku: 'push-patch-nad-ghk', authorizedBy: 'admin:tj', now: NOW, ...o });
const ccf = () => Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' });
beforeEach(() => ddbSend.mockReset());

describe('buildRefillAuth', () => {
  it('is pure with 12 month expiry and defaults', () => {
    const a = mk({ partnerRef: 'ABC', signedByProviderId: 'molina' });
    expect(a).toMatchObject({ refillsAuthorized: 3, refillsUsed: 0, sku: 'push-patch-nad-ghk', intervalWeeks: 6, authorizedBy: 'admin:tj', signedByProviderId: 'molina', partnerRef: 'ABC', mode: 'on-demand', status: 'active' });
    expect(a.authorizedAt).toBe(NOW.toISOString());
    expect(a.expiresAt).toBe('2027-11-15T12:00:00.000Z');
  });
  it('omits optional keys when absent', () => {
    expect('partnerRef' in mk()).toBe(false);
    expect('signedByProviderId' in mk()).toBe(false);
  });
});

describe('grantRefills', () => {
  const enc = (o: any = {}) => ({ lane: 'push-patch', state: 'script-written', ...o });
  it('writes refillAuth map on the encounter when script-written', async () => {
    ddbSend.mockResolvedValueOnce({ Item: enc() }).mockResolvedValueOnce({});
    await grantRefills('c1', 'pp-cs_1', mk());
    const u = ddbSend.mock.calls[1][0].input;
    expect(u.Key).toEqual({ contactId: 'c1', sk: 'encounter#pp-cs_1' });
    expect(u.UpdateExpression).toContain('refillAuth = :a');
    expect(u.ExpressionAttributeValues[':a'].refillsAuthorized).toBe(3);
  });
  for (const [label, item] of [
    ['missing', undefined], ['other lane', enc({ lane: 'trt' })], ['not approved', enc({ state: 'sent-to-provider' })],
    ['declined', enc({ state: 'declined', refundStatus: 'pending' })], ['refunded', enc({ refundStatus: 'refunded' })],
  ] as const) {
    it(`refuses: ${label}`, async () => {
      ddbSend.mockResolvedValueOnce({ Item: item });
      await expect(grantRefills('c1', 'pp-cs_1', mk())).rejects.toThrow();
      expect(ddbSend).toHaveBeenCalledTimes(1);
    });
  }
});

describe('getRefillAuth', () => {
  it('returns auth + encounter, null when none', async () => {
    const a = mk();
    ddbSend.mockResolvedValueOnce({ Item: { refillAuth: a, sku: 'x' } });
    expect(await getRefillAuth('c1', 'e')).toEqual({ auth: a, encounter: { refillAuth: a, sku: 'x' } });
    ddbSend.mockResolvedValueOnce({ Item: { sku: 'x' } });
    expect(await getRefillAuth('c1', 'e')).toBeNull();
    ddbSend.mockResolvedValueOnce({});
    expect(await getRefillAuth('c1', 'e')).toBeNull();
  });
});

describe('claimRefillSlot', () => {
  it('uses one conditional increment', async () => {
    ddbSend.mockResolvedValueOnce({ Attributes: { refillAuth: { ...mk(), refillsUsed: 1 } } });
    const r = await claimRefillSlot('c1', 'e', NOW);
    expect(r).toMatchObject({ ok: true, refillNumber: 1 });
    expect(ddbSend).toHaveBeenCalledTimes(1);
    const u = ddbSend.mock.calls[0][0].input;
    expect(u.UpdateExpression).toMatch(/refillAuth\.refillsUsed = refillAuth\.refillsUsed \+ :one/);
    expect(u.ConditionExpression).toMatch(/refillsUsed < refillAuth\.refillsAuthorized/);
    expect(u.ConditionExpression).toMatch(/expiresAt > :now/);
    expect(u.ConditionExpression).toMatch(/#st = :active/);
    expect(u.ReturnValues).toBe('ALL_NEW');
  });
  it('marks exhausted when the last slot is taken', async () => {
    ddbSend.mockResolvedValueOnce({ Attributes: { refillAuth: { ...mk(), refillsUsed: 3 } } }).mockResolvedValueOnce({});
    const r: any = await claimRefillSlot('c1', 'e', NOW);
    expect(r.ok).toBe(true);
    expect(r.refillNumber).toBe(3);
    expect(r.auth.status).toBe('exhausted');
    const u = ddbSend.mock.calls[1][0].input;
    expect(u.ExpressionAttributeValues[':exhausted']).toBe('exhausted');
  });
  const reread = async (auth: any) => {
    ddbSend.mockRejectedValueOnce(ccf()).mockResolvedValueOnce({ Item: auth ? { refillAuth: auth } : {} });
    return claimRefillSlot('c1', 'e', NOW);
  };
  it('reason exhausted', async () => expect(await reread({ ...mk(), refillsUsed: 3 })).toEqual({ ok: false, reason: 'exhausted' }));
  it('reason exhausted by status', async () => expect(await reread({ ...mk(), status: 'exhausted' })).toEqual({ ok: false, reason: 'exhausted' }));
  it('reason expired', async () => expect(await reread({ ...mk(), expiresAt: '2026-11-01T00:00:00.000Z' })).toEqual({ ok: false, reason: 'expired' }));
  it('reason inactive (paused)', async () => expect(await reread({ ...mk(), status: 'paused' })).toEqual({ ok: false, reason: 'inactive' }));
  it('reason inactive (no auth)', async () => expect(await reread(null)).toEqual({ ok: false, reason: 'inactive' }));
  it('rethrows other errors', async () => {
    ddbSend.mockRejectedValueOnce(new Error('boom'));
    await expect(claimRefillSlot('c1', 'e', NOW)).rejects.toThrow('boom');
  });
});

describe('setRefillAuthFields', () => {
  it('sets only given fields, never counters', async () => {
    ddbSend.mockResolvedValueOnce({});
    await setRefillAuthFields('c1', 'e', { mode: 'auto', subscriptionId: 'sub_1', status: 'paused' });
    const u = ddbSend.mock.calls[0][0].input;
    expect(u.UpdateExpression).toMatch(/refillAuth\.#mode = :mode/);
    expect(u.UpdateExpression).toMatch(/refillAuth\.#status = :status/);
    expect(u.ConditionExpression).toContain('attribute_exists(refillAuth)');
    expect(u.ExpressionAttributeValues[':subscriptionId']).toBe('sub_1');
  });
  it('no-ops on empty', async () => { await setRefillAuthFields('c1', 'e', {}); expect(ddbSend).not.toHaveBeenCalled(); });
  it('refuses to touch refillsUsed', async () => {
    await expect(setRefillAuthFields('c1', 'e', { refillsUsed: 0 })).rejects.toThrow();
  });
});

describe('setRefillShipTo', () => {
  const st = { name: 'Paul M', line1: '1 Main', line2: '', city: 'Austin', state: 'TX', postalCode: '78701' };
  it('stores shipTo + timestamp on refillAuth, conditional on refillAuth existing', async () => {
    ddbSend.mockResolvedValueOnce({});
    await setRefillShipTo('c1', 'e', st);
    const u = ddbSend.mock.calls[0][0].input;
    expect(u.Key).toEqual({ contactId: 'c1', sk: 'encounter#e' });
    expect(u.UpdateExpression).toContain('refillAuth.shipTo = :st');
    expect(u.UpdateExpression).toContain('refillAuth.shipToUpdatedAt = :now');
    expect(u.ConditionExpression).toContain('attribute_exists(refillAuth)');
    expect(u.ExpressionAttributeValues[':st']).toEqual(st);
  });
});

describe('partnerRefFromSession', () => {
  it('prefers metadata.partnerRef', async () => expect(await partnerRefFromSession({ metadata: { partnerRef: 'AB' }, discounts: [{ promotion_code: { code: 'Z', metadata: { partner: 'true' } } }] } as any)).toBe('AB'));
  it('falls back to an expanded partner promo code (uppercased)', async () => expect(await partnerRefFromSession({ metadata: {}, discounts: [{ promotion_code: 'promo_1' }, { promotion_code: { code: 'heritage', metadata: { partner: 'true' } } }] } as any)).toBe('HERITAGE'));
  it('looks up a promo id via stripe when given', async () => {
    const retrieve = vi.fn().mockResolvedValue({ code: 'ACME', metadata: { partner: 'true' } });
    expect(await partnerRefFromSession({ discounts: [{ promotion_code: 'promo_1' }] }, { promotionCodes: { retrieve } })).toBe('ACME');
    expect(retrieve).toHaveBeenCalledWith('promo_1');
  });
  it('a failed promo lookup never throws', async () => {
    const retrieve = vi.fn().mockRejectedValue(new Error('down'));
    expect(await partnerRefFromSession({ discounts: [{ promotion_code: 'promo_1' }] }, { promotionCodes: { retrieve } })).toBeUndefined();
  });
  it('undefined otherwise', async () => {
    expect(await partnerRefFromSession({ discounts: [{ promotion_code: { code: 'X', metadata: {} } }] } as any)).toBeUndefined();
    expect(await partnerRefFromSession({} as any)).toBeUndefined();
  });
});

describe('recordShipment', () => {
  it('stamps lastShippedAt, remindersSent 0 and refillDueAt = +35 days', async () => {
    ddbSend.mockResolvedValue({});
    await recordShipment('c1', 'pp-cs_1', NOW, true);
    const u = ddbSend.mock.calls[0][0].input;
    expect(u.UpdateExpression).toMatch(/refillAuth.lastShippedAt = :now.*refillAuth.remindersSent = :zero.*refillDueAt = :due/);
    expect(u.ExpressionAttributeValues[':due']).toBe('2026-12-20T12:00:00.000Z');
    expect(u.ConditionExpression).toBe('attribute_exists(refillAuth)');
  });
  it('auto-ship: lastShippedAt only, and clears any reminder schedule', async () => {
    ddbSend.mockResolvedValue({});
    await recordShipment('c1', 'pp-cs_1', NOW, false);
    const u = ddbSend.mock.calls[0][0].input;
    expect(u.UpdateExpression).toMatch(/REMOVE refillDueAt/);
    expect(u.ExpressionAttributeValues[':due']).toBeUndefined();
  });
});
