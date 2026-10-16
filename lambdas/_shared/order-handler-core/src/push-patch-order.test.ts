import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@aws-sdk/client-lambda', () => ({
  InvokeCommand: class { constructor(public input: unknown) {} },
}));

import { handlePushPatchOrder } from './push-patch-order.js';
import { composeOrderReceived } from './order-received-email.js';

const ccf = () => Object.assign(new Error('CCF'), { name: 'ConditionalCheckFailedException' });
const reply = (o: unknown) => ({ Payload: new TextEncoder().encode(JSON.stringify(o)) });

const ddbSend = vi.fn();
const lambdaSend = vi.fn();
const base = (extra: Record<string, unknown> = {}) => ({
  ddb: { send: ddbSend },
  lambda: { send: lambdaSend },
  emailFn: 'email-fn',
  session: { id: 'cs_1', payment_intent: 'pi_1', customer_details: { email: 'a@b.co' }, metadata: { intakeId: 'int_1' }, ...extra },
  contactId: 'c_1', skuId: 'push-patch-kpv-nad-ghk', email: 'a@b.co', firstName: 'Jane',
});
const calls = (fn: string) => lambdaSend.mock.calls.map((c: any) => c[0].input).filter((i: any) => i.FunctionName === fn);
const payload = (i: any) => JSON.parse(i.Payload.toString());
const markers = () => ddbSend.mock.calls.map((c: any) => c[0].input).filter((i: any) => i?.Item?.sk?.startsWith('PUSH_PATCH_PENDING#'));

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.PUSH_PATCH_INTAKE_FN;
  ddbSend.mockResolvedValue({});
});

describe('handlePushPatchOrder', () => {
  it('legacy (no intakeId): no finalize, marker without intakeSubmittedAt, finish-form email', async () => {
    lambdaSend.mockResolvedValue({});
    await handlePushPatchOrder(base({ metadata: {} }));
    expect(calls('my4mlife-push-patch-intake')).toHaveLength(0);
    expect(markers()).toHaveLength(1);
    expect(markers()[0].Item).not.toHaveProperty('intakeSubmittedAt');
    expect(payload(calls('email-fn')[0]).subject).toContain('one 2-minute step left');
  });

  it('finalized order: finalize invoked synchronously, marker has intakeSubmittedAt, receipt sent', async () => {
    lambdaSend.mockResolvedValueOnce(reply({ result: 'ok' })).mockResolvedValue({});
    await handlePushPatchOrder(base());
    const fin = calls('my4mlife-push-patch-intake')[0] as any;
    expect(fin.InvocationType).toBe('RequestResponse');
    expect(payload(fin)).toEqual({ mode: 'finalize', sessionId: 'cs_1', intakeId: 'int_1' });
    expect(markers()).toHaveLength(1);
    expect(typeof markers()[0].Item.intakeSubmittedAt).toBe('string');
    expect(markers()[0].ConditionExpression).toBe('attribute_not_exists(sk)');
    expect(payload(calls('email-fn')[0]).subject).toBe('Your Push Patch order is in');
  });

  it('PUSH_PATCH_INTAKE_FN overrides the function name', async () => {
    process.env.PUSH_PATCH_INTAKE_FN = 'custom-intake';
    lambdaSend.mockResolvedValueOnce(reply({ result: 'ok' })).mockResolvedValue({});
    await handlePushPatchOrder(base());
    expect(calls('custom-intake')).toHaveLength(1);
  });

  it("replay ('already' + marker exists): no second email, no throw", async () => {
    lambdaSend.mockResolvedValueOnce(reply({ result: 'already' })).mockResolvedValue({});
    ddbSend.mockRejectedValue(ccf());
    await expect(handlePushPatchOrder(base())).resolves.toBeUndefined();
    expect(calls('email-fn')).toHaveLength(0);
  });

  it.each([
    ['FunctionError', { FunctionError: 'Unhandled' }],
    ['non-ok result', reply({ result: 'error' })],
    ['invoke rejection', new Error('boom')],
  ])('finalize failure (%s) rejects and writes no marker', async (_n, r) => {
    if (r instanceof Error) lambdaSend.mockRejectedValueOnce(r); else lambdaSend.mockResolvedValueOnce(r);
    await expect(handlePushPatchOrder(base())).rejects.toThrow();
    expect(markers()).toHaveLength(0);
    expect(calls('email-fn')).toHaveLength(0);
  });

  it("'missing' falls back to the legacy path exactly", async () => {
    lambdaSend.mockResolvedValueOnce(reply({ result: 'missing' })).mockResolvedValue({});
    await handlePushPatchOrder(base());
    expect(markers()).toHaveLength(1);
    expect(markers()[0].Item).not.toHaveProperty('intakeSubmittedAt');
    expect(payload(calls('email-fn')[0]).subject).toContain('one 2-minute step left');
  });
});

describe('composeOrderReceived kinds', () => {
  it('receipt has no questionnaire link/action and no PHI, with verbatim copy', () => {
    const { subject, html } = composeOrderReceived('cs_secret', 'Jane', 'receipt');
    expect(subject).toBe('Your Push Patch order is in');
    expect(html).toContain('Hi Jane,');
    expect(html).toContain('Thank you for your order. A licensed physician in our network is reviewing it now');
    expect(html).toContain('If you are not cleared, your payment is refunded in full within 10 business days.');
    expect(html).toContain('If cleared, your patches are prepared within 1&ndash;3 business days, then ground delivery in 3&ndash;5 business days.');
    expect(html).toContain('Questions? Reply here.');
    expect(html).not.toMatch(/href=|http|questionnaire|cs_secret|session_id/i);
    for (const bad of ['KPV', 'NAD', 'GHK', 'Austin']) expect(html).not.toContain(bad);
  });
  it("receipt falls back to 'Hi there,'", () => {
    expect(composeOrderReceived('cs_1', undefined, 'receipt').html).toContain('Hi there,');
  });
  it('finish-form (default) keeps the link', () => {
    expect(composeOrderReceived('cs_1', 'Jane').html).toContain('thank-you?session_id=cs_1');
  });
});
