// Provider picker on the physician confirm page. decide + roster are mocked (separate file so the
// main handler.test.ts keeps exercising the real decide).
import { createHmac } from 'crypto';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: class { send = async () => ({ Parameter: { Value: 'k' } }); },
  GetParameterCommand: class { constructor(public input: any) {} },
}));
const decideMock = vi.fn();
vi.mock('@my4mlife/push-patch-decision-core', () => ({ decide: (...a: any[]) => decideMock(...a), rxProduct: (id?: string) => (id?.startsWith('glp1-') ? { intervalDays: 28 } : undefined) }));
const loadRosterMock = vi.fn();
vi.mock('@my4mlife/provider-roster', () => ({ loadRoster: (...a: any[]) => loadRosterMock(...a) }));

const skuMock = vi.fn();
vi.mock('./glp1', async (orig) => ({ ...(await orig<any>()), lookupSku: (...a: any[]) => skuMock(...a) }));
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
    expect(b).not.toContain('<select name="provider"');
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

describe('refills select', () => {
  it('approve page renders the select 0-8, default 8, with helper text; decline has none', async () => {
    const b = String((await handler(getEvt(tokenFor('approve'))) as any).body);
    expect(b).toContain('Refills authorized (6-week boxes)');
    expect(b).toMatch(/<select name="refills">/);
    expect(b).toContain('<option value="8" selected>8</option>');
    expect(b).toContain('<option value="0">0</option>');
    expect(b).toContain('8 = one year. 0 = no refills; the patient comes back for review.');
    expect(String((await handler(getEvt(tokenFor('decline'))) as any).body)).not.toContain('refills');
  });
  it('POST passes refills through to decide(); 0 is preserved', async () => {
    await handler(postEvt(tokenFor('approve'), '&refills=0'));
    expect(decideMock.mock.calls[0][0].refills).toBe(0);
    await handler(postEvt(tokenFor('approve'), '&refills=5'));
    expect(decideMock.mock.calls[1][0].refills).toBe(5);
  });
  it('absent refills leaves decide() default; invalid value is rejected without deciding', async () => {
    await handler(postEvt(tokenFor('approve')));
    expect('refills' in decideMock.mock.calls[0][0]).toBe(false);
    const res: any = await handler(postEvt(tokenFor('approve'), '&refills=99'));
    expect(res.statusCode).toBe(400);
    expect(decideMock).toHaveBeenCalledTimes(1);
  });
});

describe('glp1 dose picker', () => {
  const g1 = (action: string) => {
    const p = `c1.g1-s1.${action}`;
    return Buffer.from(`${p}.${createHmac('sha256', 'k').update(p).digest('hex')}`).toString('base64url');
  };
  beforeEach(() => skuMock.mockResolvedValue('glp1-tirzep'));

  it('approve page for a g1- encounter shows the product dose list + Other, required', async () => {
    const b = String((await handler(getEvt(g1('approve'))) as any).body);
    expect(b).toMatch(/<select name="dose" required>/);
    for (const d of ['2.5 mg', '5 mg', '7.5 mg', '10 mg', '12.5 mg', '15 mg']) expect(b).toContain(`<option value="${d}">${d}</option>`);
    expect(b).not.toContain('0.25 mg');
    expect(b).toContain('Other (type it)');
    expect(b).toContain('name="dose_other"');
  });
  it('reta and sema lists', async () => {
    skuMock.mockResolvedValue('glp1-reta');
    expect(String((await handler(getEvt(g1('approve'))) as any).body)).toContain('<option value="12 mg">12 mg</option>');
    skuMock.mockResolvedValue('glp1-sema');
    expect(String((await handler(getEvt(g1('approve'))) as any).body)).toContain('<option value="0.25 mg">0.25 mg</option>');
  });
  it('unknown sku falls back to all three lists; decline and push-patch pages have no dose', async () => {
    skuMock.mockResolvedValue(undefined);
    const b = String((await handler(getEvt(g1('approve'))) as any).body);
    expect(b).toContain('0.25 mg'); expect(b).toContain('15 mg');
    expect(String((await handler(getEvt(g1('decline'))) as any).body)).not.toContain('name="dose"');
    expect(String((await handler(getEvt(tokenFor('approve'))) as any).body)).not.toContain('name="dose"');
  });
  it('glp1 approve page words refills as months every 4 weeks, not Push Patch boxes; push-patch page unchanged', async () => {
    const b = String((await handler(getEvt(g1('approve'))) as any).body);
    expect(b).toContain('Refills authorized (one month each, every 4 weeks)');
    expect(b).not.toMatch(/6-week|six-week|\bboxes?\b/i);
    expect(String((await handler(getEvt(tokenFor('approve'))) as any).body)).toContain('Refills authorized (6-week boxes)');
  });
  it('POST passes the chosen dose; Other uses the typed text', async () => {
    await handler(postEvt(g1('approve'), '&dose=5%20mg'));
    expect(decideMock.mock.calls[0][0].dose).toBe('5 mg');
    await handler(postEvt(g1('approve'), '&dose=other&dose_other=%20three%20mg%20'));
    expect(decideMock.mock.calls[1][0].dose).toBe('three mg');
  });
  it('POST without a dose is refused with 400 when decide says dose-required (token still checked)', async () => {
    decideMock.mockResolvedValue({ kind: 'dose-required', message: 'A dose is required to approve a GLP-1 order.' });
    const res: any = await handler(postEvt(g1('approve')));
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('dose');
    expect((await handler(postEvt('bad', '&dose=5%20mg')) as any).statusCode).toBe(403);
  });
  it('push-patch POST sends no dose key', async () => {
    await handler(postEvt(tokenFor('approve')));
    expect('dose' in decideMock.mock.calls[0][0]).toBe(false);
  });
});
