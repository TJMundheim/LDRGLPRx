import { describe, it, expect, vi } from 'vitest';
import { notifyPushPatchOrder } from './push-patch-notify.js';

const session = { id: 'cs_1', amount_total: 50000, metadata: { skuIds: 'push-patch-kpv-nad-ghk' }, customer_details: { email: 'a@b.co' } };
const html = async (promo?: { promoCode: string; discountUSD: number }) => {
  const send = vi.fn().mockResolvedValue(undefined);
  await notifyPushPatchOrder(session, { send }, promo);
  return send.mock.calls[0][0].html as string;
};

describe('notifyPushPatchOrder promo line', () => {
  it('shows the code and discount when present', async () => {
    expect(await html({ promoCode: 'WOLFPACK', discountUSD: 150 })).toContain('Promo code: WOLFPACK (&minus;$150.00)');
  });
  it('is unchanged without a promo', async () => {
    expect(await html()).not.toContain('Promo code');
  });
});
