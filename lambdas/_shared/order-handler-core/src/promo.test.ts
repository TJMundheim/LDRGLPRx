import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePromo, promoLine } from './promo.js';

const retrieve = vi.fn();
const stripe = { promotionCodes: { retrieve } } as never;
const withDiscount = (extra: Record<string, unknown> = {}) => ({
  discounts: [{ coupon: 'push-patch-150', promotion_code: 'promo_1' }],
  total_details: { amount_discount: 15000 },
  ...extra,
});

beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); });

describe('resolvePromo', () => {
  it('returns undefined and never calls Stripe when there is no discount', async () => {
    expect(await resolvePromo(stripe, {})).toBeUndefined();
    expect(await resolvePromo(stripe, { discounts: [], total_details: { amount_discount: 0 } })).toBeUndefined();
    expect(await resolvePromo(stripe, { discounts: [{ coupon: 'c', promotion_code: null }] })).toBeUndefined();
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('resolves the id to the uppercased code text and dollars off', async () => {
    retrieve.mockResolvedValue({ code: 'wolfpack' });
    expect(await resolvePromo(stripe, withDiscount())).toEqual({ promoCode: 'WOLFPACK', discountUSD: 150 });
    expect(retrieve).toHaveBeenCalledWith('promo_1');
  });

  it('uses an expanded promotion_code object without a retrieve', async () => {
    const s = withDiscount({ discounts: [{ coupon: 'c', promotion_code: { id: 'promo_1', code: 'Alpha' } }] });
    expect(await resolvePromo(stripe, s)).toEqual({ promoCode: 'ALPHA', discountUSD: 150 });
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('falls back to the id when the retrieve fails, logging only the error name', async () => {
    retrieve.mockRejectedValue(Object.assign(new Error('boom a@b.co'), { name: 'StripeError' }));
    expect(await resolvePromo(stripe, withDiscount())).toEqual({ promoCode: 'promo_1', discountUSD: 150 });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('a@b.co');
  });

  it('tolerates a Stripe client with no promotionCodes resource', async () => {
    expect(await resolvePromo({} as never, withDiscount())).toEqual({ promoCode: 'promo_1', discountUSD: 150 });
  });
});

describe('promoLine', () => {
  it('formats the internal-email line, empty without a promo', () => {
    expect(promoLine({ promoCode: 'WOLFPACK', discountUSD: 150 })).toBe('Promo code: WOLFPACK (&minus;$150.00)');
    expect(promoLine(undefined)).toBe('');
  });
});
