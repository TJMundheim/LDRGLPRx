// Provider picker on the physician confirm page. decide + roster are mocked (separate file so the
// main handler.test.ts keeps exercising the real decide).
import { createHmac } from 'crypto';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: class { send = async () => ({ Parameter: { Value: 'k' } }); },
  GetParameterCommand: class { constructor(public input: any) {} },
}));
const decideMock = vi.fn();
vi.mock('@my4mlife/push-patch-decision-core', () => ({ decide: (...a: any[]) => decideMock(...a) }));
const loadRosterMock = vi.fn();
vi.mock('@my4mlife/provider-roster', () => ({ loadRoster: (...a: any[]) => loadRosterMock(...a) }));

import { handler } from './handler';

const P1 = { id: 'molina', name: 'Oscar Molina', credentials: 'MD', inbox: 'a@x.test', default: true };
const P2 = { id: 'lee', name: 'Ann Lee', credentials: 'DO', inbox: 'b@x.test' };
const tokenFor = (action: string) => {
  const p = `c1.e1.${action}`;
  return Buffer.from(`${p}.${createHmac('sha256', 'k').update(p).digest('hex')}`).toString('base64url');
};
const getEvt = (t: string) => ({ requestContext: { http: { method: 'GET' } }, queryStringParameters: { t } });
const postEvt = (t: string, extra = '') => ({ requestContext: { http: { method: 'POST' } }, body: `t=${t}${extra}` });

beforeEach(() => {
  vi.clearAllMocks();
  loadRosterMock.mockResolvedValue([P1, P2]);
  decideMock.mockResolvedValue({ kind: 'approved', mailOk: true });
});

describe('confirm page picker (GET)', () => {
  it('approve with 2+ providers: "Signing as" select, "Name, Credentials", default preselected, id values', async () => {
    const b = String((await handler(getEvt(tokenFor('approve'))) as any).body);
    expect(b).toContain('Signing as');
    expect(b).toMatch(/<select name="provider"/);
    expect(b).toMatch(/<option value="molina" selected>Oscar Molina, MD<\/option>/);
    expect(b).toMatch(/<option value="lee">Ann Lee, DO<\/option>/);
  });

  it('approve with one provider: read-only line + hidden input, no select', async () => {
    loadRosterMock.mockResolvedValue([P1]);
    const b = String((await handler(getEvt(tokenFor('approve'))) as any).body);
    expect(b).toContain('Signing as: Oscar Molina, MD');
    expect(b).toContain('<input type="hidden" name="provider" value="molina">');
    expect(b).not.toContain('<select');
  });

  it('decline shows no picker and does not load the roster', async () => {
    const b = String((await handler(getEvt(tokenFor('decline'))) as any).body);
    expect(b).not.toContain('Signing as');
    expect(b).not.toContain('provider');
    expect(loadRosterMock).not.toHaveBeenCalled();
  });

  it('HTML-escapes provider names and ids', async () => {
    loadRosterMock.mockResolvedValue([{ ...P1, id: 'a"><b>', name: '<script>x</script>' }, P2]);
    const b = String((await handler(getEvt(tokenFor('approve'))) as any).body);
    expect(b).not.toContain('<script>x');
    expect(b).not.toContain('a"><b>');
    expect(b).toContain('&lt;script&gt;');
  });

  it('roster load failure: approve page still renders 200 with no picker', async () => {
    loadRosterMock.mockRejectedValue(new Error('ssm down'));
    const res: any = await handler(getEvt(tokenFor('approve')));
    expect(res.statusCode).toBe(200);
    expect(String(res.body)).not.toContain('Signing as');
    expect(String(res.body)).not.toContain('name="provider"');
    expect(String(res.body)).toMatch(/<form[^>]*method="post"/i);
  });

  it('empty credentials: prints just the name, no trailing comma', async () => {
    loadRosterMock.mockResolvedValue([{ ...P1, credentials: '' }]);
    const one = String((await handler(getEvt(tokenFor('approve'))) as any).body);
    expect(one).toContain('Signing as: Oscar Molina<');
    loadRosterMock.mockResolvedValue([{ ...P1, credentials: '' }, P2]);
    const many = String((await handler(getEvt(tokenFor('approve'))) as any).body);
    expect(many).toContain('>Oscar Molina</option>');
    expect(many).not.toContain('Oscar Molina,');
  });

  it('keeps the token field unchanged', async () => {
    const t = tokenFor('approve');
    expect(String((await handler(getEvt(t)) as any).body)).toContain(`name="t" value="${t}"`);
  });
});

describe('POST', () => {
  it('passes the chosen providerId to decide', async () => {
    const res: any = await handler(postEvt(tokenFor('approve'), '&provider=lee'));
    expect(res.statusCode).toBe(200);
    expect(decideMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'approve', providerId: 'lee', decidedBy: 'physician-link' }));
  });

  it('rejects an id not in the roster with 400 and does not decide', async () => {
    const res: any = await handler(postEvt(tokenFor('approve'), '&provider=nobody'));
    expect(res.statusCode).toBe(400);
    expect(decideMock).not.toHaveBeenCalled();
  });

  it('roster load failure while validating a submitted id: no 400, decide gets no providerId', async () => {
    loadRosterMock.mockRejectedValue(new Error('ssm down'));
    const res: any = await handler(postEvt(tokenFor('approve'), '&provider=lee'));
    expect(res.statusCode).toBe(200);
    expect(decideMock).toHaveBeenCalledTimes(1);
    expect(decideMock.mock.calls[0][0].providerId).toBeUndefined();
  });

  it('no provider field: decide gets no providerId (default applies)', async () => {
    await handler(postEvt(tokenFor('approve')));
    expect(decideMock.mock.calls[0][0].providerId).toBeUndefined();
  });

  it('decline ignores provider and never touches the roster', async () => {
    await handler(postEvt(tokenFor('decline'), '&provider=nobody'));
    expect(loadRosterMock).not.toHaveBeenCalled();
    expect(decideMock.mock.calls[0][0].providerId).toBeUndefined();
  });
});
