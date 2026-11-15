import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('./mailer', () => ({ send: h.send }));
vi.mock('./genesis-config', () => ({ loadPractice: async () => ({ practice: { clinician: 'Dr X' }, missing: [] }) }));
vi.mock('./genesis-form', () => ({ buildFields: () => ({}), fillOrderForm: async () => new Uint8Array([1]), QTY_FIELD: { 'push-patch-enhanced-glow': 'qty_push1' } }));

import { sendGenesisOrder } from './genesis-order';

const args = { signedAt: '2026-11-15T00:00:00Z', sku: 'push-patch-enhanced-glow', sessionId: 'in_1', name: 'A B', lastName: 'B', phone: '1' } as any;
beforeEach(() => h.send.mockReset().mockResolvedValue(undefined));

describe('sendGenesisOrder', () => {
  it('complete config + known blend goes to Genesis, cc TJ', async () => {
    expect(await sendGenesisOrder(args)).toEqual({ to: 'orders@novobioalliance.com', toGenesis: true });
    expect(h.send.mock.calls[0][0]).toMatchObject({ to: 'orders@novobioalliance.com', cc: 'drtj@my4mlife.com' });
  });

  it('tjOnly (Stripe test mode) never addresses Genesis', async () => {
    expect(await sendGenesisOrder({ ...args, tjOnly: true, testOrder: true })).toEqual({ to: 'drtj@my4mlife.com', toGenesis: false });
    const m = h.send.mock.calls[0][0];
    expect(m.to).toBe('drtj@my4mlife.com');
    expect(m.cc).toBeUndefined();
    expect(m.subject).toMatch(/^\[TEST ORDER — DO NOT FILL\] Push Patch order \(Stripe test mode, not sent to Genesis\)/);
    expect(m.text).toMatch(/NOT SENT TO GENESIS \(Stripe test mode\)/);
  });
});
