import { describe, it, expect, vi, beforeEach } from 'vitest';

const { refundEncounter } = vi.hoisted(() => ({ refundEncounter: vi.fn() }));
vi.mock('@my4mlife/encounter-refund', () => ({
  refundEncounter,
  RefundError: class RefundError extends Error { constructor(public code: string, m: string) { super(m); } },
}));
import { RefundError } from '@my4mlife/encounter-refund';
import { handler } from './handler';

const ev = (groups: string[] | undefined = ['Admins']) => ({
  arguments: { contactId: 'c1', encounterId: 'pp-cs_1' },
  identity: { groups, username: 'tj-admin' },
});

beforeEach(() => vi.clearAllMocks());

describe('refund-encounter-admin', () => {
  it('rejects non-admins without calling refundEncounter', async () => {
    await expect(handler(ev(['Protege']))).rejects.toThrow('Unauthorized');
    await expect(handler({ arguments: ev().arguments })).rejects.toThrow('Unauthorized');
    expect(refundEncounter).not.toHaveBeenCalled();
  });

  it('passes ids + the admin username as actor and maps the result', async () => {
    refundEncounter.mockResolvedValue({ ok: true, refundId: 're_1', amountCents: 24900, emailSent: true });
    expect(await handler(ev())).toEqual({ ok: true, refundId: 're_1', amountCents: 24900, emailSent: true });
    expect(refundEncounter).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'pp-cs_1', actor: 'tj-admin' });
  });

  it('turns guard failures into ok:false with a code', async () => {
    refundEncounter.mockRejectedValue(new (RefundError as any)('already_shipped', 'Order was already sent'));
    expect(await handler(ev())).toEqual({ ok: false, error: 'Order was already sent', code: 'already_shipped' });
  });

  it('turns unexpected/Stripe errors into ok:false code refund_failed', async () => {
    refundEncounter.mockRejectedValue(new Error('stripe down'));
    expect(await handler(ev())).toEqual({ ok: false, error: 'stripe down', code: 'refund_failed' });
  });

  it('falls back to "admin" actor when username is absent', async () => {
    refundEncounter.mockResolvedValue({ ok: true, refundId: 're_1', amountCents: 1, emailSent: false });
    await handler({ arguments: ev().arguments, identity: { groups: ['Admins'] } });
    expect(refundEncounter.mock.calls[0][0].actor).toBe('admin');
  });
});
