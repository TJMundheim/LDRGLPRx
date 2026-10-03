import { describe, it, expect, vi, beforeEach } from 'vitest';

const { decide } = vi.hoisted(() => ({ decide: vi.fn() }));
vi.mock('@my4mlife/push-patch-decision-core', () => ({ decide }));
import { handler } from './handler';

const ev = (action = 'approve', groups: string[] | undefined = ['Admins']) => ({
  arguments: { contactId: 'c1', encounterId: 'pp-cs_1', action },
  identity: { groups, username: 'tj-admin' },
});

beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); });

describe('push-patch-decide-admin', () => {
  it('rejects non-admins without deciding', async () => {
    await expect(handler(ev('approve', ['Protege']))).rejects.toThrow('Unauthorized');
    await expect(handler({ arguments: ev().arguments })).rejects.toThrow('Unauthorized');
    expect(decide).not.toHaveBeenCalled();
  });

  it('rejects any action other than approve/decline', async () => {
    expect(await handler(ev('refund'))).toMatchObject({ ok: false, code: 'invalid_action' });
    expect(decide).not.toHaveBeenCalled();
  });

  it('approve: calls the shared decide with decidedBy admin:<username>', async () => {
    decide.mockResolvedValue({ kind: 'approved', mailOk: true });
    expect(await handler(ev('approve'))).toEqual({ ok: true, state: 'script-written', mailOk: true });
    expect(decide).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'pp-cs_1', action: 'approve', decidedBy: 'admin:tj-admin' });
  });

  it('decline maps to declined and surfaces a failed patient email', async () => {
    decide.mockResolvedValue({ kind: 'declined', mailOk: false });
    expect(await handler(ev('decline'))).toEqual({ ok: true, state: 'declined', mailOk: false });
    expect(decide.mock.calls[0][0]).toMatchObject({ action: 'decline' });
  });

  it('already decided → ok:false code already_decided with the current state', async () => {
    decide.mockResolvedValue({ kind: 'already-decided', state: 'script-written' });
    expect(await handler(ev())).toMatchObject({ ok: false, code: 'already_decided', state: 'script-written' });
  });

  it('not found → ok:false code not_found', async () => {
    decide.mockResolvedValue({ kind: 'not-found' });
    expect(await handler(ev())).toMatchObject({ ok: false, code: 'not_found' });
  });

  it('unexpected errors → ok:false decision_failed, message not leaked', async () => {
    decide.mockRejectedValue(new Error('stripe key sk_live_secret'));
    const r = await handler(ev());
    expect(r).toMatchObject({ ok: false, code: 'decision_failed' });
    expect(JSON.stringify(r)).not.toMatch(/sk_live/);
  });

  it('falls back to admin:admin when username is absent', async () => {
    decide.mockResolvedValue({ kind: 'approved', mailOk: true });
    await handler({ arguments: ev().arguments, identity: { groups: ['Admins'] } });
    expect(decide.mock.calls[0][0].decidedBy).toBe('admin:admin');
  });
});
