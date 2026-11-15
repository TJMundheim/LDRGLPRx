import { describe, it, expect, beforeEach, vi } from 'vitest';

const { createMock, getClientMock } = vi.hoisted(() => ({ createMock: vi.fn(), getClientMock: vi.fn() }));
vi.mock('@my4mlife/stripe-client', () => ({ getStripeClient: getClientMock }));

import { issueCode } from './reward';

const NOW = new Date('2026-11-20T18:00:00Z');
const dupErr = () => Object.assign(new Error('Invalid request'), { type: 'StripeInvalidRequestError', code: 'resource_already_exists' });
const dupMsgErr = () => Object.assign(new Error('Promotion code PULLUP-AAAAAA already exists'), { type: 'StripeInvalidRequestError' });
const CODE_RE = /^PULLUP-[A-HJKMNP-Z2-9]{6}$/;

beforeEach(() => {
  createMock.mockReset(); getClientMock.mockReset();
  process.env.PULLUP_COUPON_ID = 'coupon_abc';
  process.env.STRIPE_MODE = 'live';
  getClientMock.mockResolvedValue({ promotionCodes: { create: createMock } });
  createMock.mockImplementation(async (a: any) => ({ id: 'promo_1', code: a.code }));
});

describe('issueCode', () => {
  it('creates a single-use, 90-day promo code on the pullup coupon', async () => {
    const r = await issueCode('start', NOW);
    expect(r.promoId).toBe('promo_1');
    expect(r.code).toMatch(CODE_RE);
    expect(getClientMock).toHaveBeenCalledWith({ modeOverride: 'live' });
    expect(createMock).toHaveBeenCalledTimes(1);
    const arg = createMock.mock.calls[0][0];
    expect(arg).toEqual({
      coupon: 'coupon_abc', code: r.code, max_redemptions: 1,
      expires_at: Math.floor(NOW.getTime() / 1000) + 90 * 86400,
      metadata: { source: 'pullup-challenge', round: 'start' },
    });
  });
  it('metadata never carries email or name (only source + round)', async () => {
    await issueCode('final', NOW);
    expect(Object.keys(createMock.mock.calls[0][0].metadata).sort()).toEqual(['round', 'source']);
    expect(createMock.mock.calls[0][0].metadata.round).toBe('final');
  });
  it('generates different codes across calls', async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) codes.add((await issueCode('start', NOW)).code);
    expect(codes.size).toBeGreaterThan(15);
  });
  it('retries on a duplicate-code error (code field) with a fresh code', async () => {
    createMock.mockRejectedValueOnce(dupErr());
    const r = await issueCode('start', NOW);
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock.mock.calls[1][0].code).toBe(r.code);
    expect(r.code).toMatch(CODE_RE);
  });
  it('retries on a duplicate-code error (message contains "already exists")', async () => {
    createMock.mockRejectedValueOnce(dupMsgErr());
    await issueCode('start', NOW);
    expect(createMock).toHaveBeenCalledTimes(2);
  });
  it('gives up after 3 total attempts on repeated duplicates', async () => {
    createMock.mockRejectedValue(dupErr());
    await expect(issueCode('start', NOW)).rejects.toBeTruthy();
    expect(createMock).toHaveBeenCalledTimes(3);
  });
  it('does not retry on other Stripe errors', async () => {
    createMock.mockRejectedValue(Object.assign(new Error('rate limited'), { type: 'StripeRateLimitError' }));
    await expect(issueCode('start', NOW)).rejects.toThrow('rate limited');
    expect(createMock).toHaveBeenCalledTimes(1);
  });
  it('propagates a client-construction failure', async () => {
    getClientMock.mockRejectedValue(new Error('no secret'));
    await expect(issueCode('start', NOW)).rejects.toThrow('no secret');
  });
});
