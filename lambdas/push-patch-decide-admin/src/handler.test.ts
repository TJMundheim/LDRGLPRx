import { describe, it, expect, vi, beforeEach } from 'vitest';

const { decide, loadRoster } = vi.hoisted(() => ({ decide: vi.fn(), loadRoster: vi.fn() }));
vi.mock('@my4mlife/push-patch-decision-core', () => ({ decide }));
vi.mock('@my4mlife/provider-roster', () => ({ loadRoster }));
import { handler } from './handler';

const ev = (action = 'approve', groups: string[] | undefined = ['Admins'], extra: Record<string, unknown> = {}) => ({
  info: { fieldName: 'decidePushPatchAdmin' },
  arguments: { contactId: 'c1', encounterId: 'pp-cs_1', action, ...extra },
  identity: { groups, username: 'tj-admin' },
});
const roster = [
  { id: 'molina', name: 'Oscar Molina', credentials: 'MD', inbox: 'secret@example.com', default: true },
  { id: 'lee', name: 'Ann Lee', credentials: 'DO', inbox: 'lee@example.com' },
];

beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); });

describe('push-patch-decide-admin', () => {
  it('rejects non-admins without deciding', async () => {
    await expect(handler(ev('approve', ['Protege']))).rejects.toThrow('Unauthorized');
    await expect(handler({ info: { fieldName: 'decidePushPatchAdmin' }, arguments: ev().arguments })).rejects.toThrow('Unauthorized');
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
    await handler({ info: { fieldName: 'decidePushPatchAdmin' }, arguments: ev().arguments, identity: { groups: ['Admins'] } });
    expect(decide.mock.calls[0][0].decidedBy).toBe('admin:admin');
  });

  it('approve: passes providerId through to decide', async () => {
    decide.mockResolvedValue({ kind: 'approved', mailOk: true });
    await handler(ev('approve', ['Admins'], { providerId: 'lee' }));
    expect(decide).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'pp-cs_1', action: 'approve', decidedBy: 'admin:tj-admin', providerId: 'lee' });
  });

  it('omits providerId from decide when not supplied (or null)', async () => {
    decide.mockResolvedValue({ kind: 'approved', mailOk: true });
    await handler(ev('approve', ['Admins'], { providerId: null }));
    expect('providerId' in decide.mock.calls[0][0]).toBe(false);
  });
});

describe('pushPatchProviders query', () => {
  const q = (groups: string[] | undefined = ['Admins']) => ({ info: { fieldName: 'pushPatchProviders' }, arguments: {}, identity: { groups, username: 'tj-admin' } });

  it('rejects non-admins without loading the roster', async () => {
    await expect(handler(q(['Protege']))).rejects.toThrow('Unauthorized');
    await expect(handler({ info: { fieldName: 'pushPatchProviders' }, arguments: {} })).rejects.toThrow('Unauthorized');
    expect(loadRoster).not.toHaveBeenCalled();
  });

  it('returns id/name/credentials/default and never the inbox', async () => {
    loadRoster.mockResolvedValue(roster);
    const r = await handler(q());
    expect(r).toEqual([
      { id: 'molina', name: 'Oscar Molina', credentials: 'MD', default: true },
      { id: 'lee', name: 'Ann Lee', credentials: 'DO', default: false },
    ]);
    expect(JSON.stringify(r)).not.toMatch(/inbox|example\.com/);
  });

  it('does not call decide', async () => {
    loadRoster.mockResolvedValue(roster);
    await handler(q());
    expect(decide).not.toHaveBeenCalled();
  });

  it('roster load failure throws a generic error (no leak)', async () => {
    loadRoster.mockRejectedValue(new Error('ssm arn:aws:secret'));
    await expect(handler(q())).rejects.toThrow('Providers unavailable');
  });
});

describe('dispatch', () => {
  it('unknown field throws', async () => {
    await expect(handler({ info: { fieldName: 'nope' }, arguments: {}, identity: { groups: ['Admins'] } })).rejects.toThrow('Unknown field');
  });

  it('no fieldName anywhere (pre-CDK payload) → decide path', async () => {
    decide.mockResolvedValue({ kind: 'approved', mailOk: true });
    const r = await handler({ arguments: ev().arguments, identity: { groups: ['Admins'], username: 'tj-admin' } });
    expect(r).toMatchObject({ ok: true, state: 'script-written' });
    expect(decide).toHaveBeenCalledTimes(1);
  });

  it('top-level fieldName pushPatchProviders → provider list', async () => {
    loadRoster.mockResolvedValue(roster);
    const r = await handler({ fieldName: 'pushPatchProviders', arguments: {}, identity: { groups: ['Admins'] } });
    expect(r).toHaveLength(2);
    expect(decide).not.toHaveBeenCalled();
  });

  it('top-level fieldName decidePushPatchAdmin → decide path', async () => {
    decide.mockResolvedValue({ kind: 'declined', mailOk: true });
    await handler({ fieldName: 'decidePushPatchAdmin', ...ev('decline') });
    expect(decide).toHaveBeenCalledTimes(1);
  });
});
