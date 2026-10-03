import { describe, it, expect, vi, beforeEach } from 'vitest';

const { ddbSend, lambdaSend, refundsCreate } = vi.hoisted(() => ({ ddbSend: vi.fn(), lambdaSend: vi.fn(), refundsCreate: vi.fn() }));
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class { constructor(_: unknown) {} } }));
vi.mock('@aws-sdk/lib-dynamodb', () => {
  const cmd = (t: string) => class { __t = t; input: any; constructor(i: any) { this.input = i; } };
  return { DynamoDBDocumentClient: { from: () => ({ send: ddbSend }) }, GetCommand: cmd('Get'), UpdateCommand: cmd('Update'), PutCommand: cmd('Put') };
});
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class { constructor(_: unknown) {} send = lambdaSend; },
  InvokeCommand: class { input: any; constructor(i: any) { this.input = i; } },
}));
vi.mock('@my4mlife/stripe-client', () => ({ getStripeClient: async () => ({ refunds: { create: refundsCreate } }) }));

import { refundEncounter, RefundError } from './index';

const ARGS = { contactId: 'c1', encounterId: 'pp-cs_1', actor: 'admin@x.com' };
const ENC = { lane: 'push-patch', state: 'declined', refundStatus: 'pending', sessionId: 'cs_1', paymentIntentId: 'pi_1' };
const REC = { demographics: { email: 'pat@x.com', firstName: 'Pat' } };

function seed(enc: Record<string, unknown> | undefined) {
  ddbSend.mockImplementation(async (c: any) => {
    if (c.__t === 'Get') return { Item: c.input.Key.sk === 'record' ? REC : enc };
    return {};
  });
}
const calls = (t: string) => ddbSend.mock.calls.map((x) => x[0]).filter((c) => c.__t === t);

beforeEach(() => {
  vi.clearAllMocks();
  seed(ENC);
  refundsCreate.mockResolvedValue({ id: 're_1', amount: 24900, status: 'succeeded' });
  lambdaSend.mockResolvedValue({});
});

describe('guards', () => {
  it.each([
    ['encounter missing', undefined, 'not_found'],
    ['wrong lane', { ...ENC, lane: 'glp1' }, 'wrong_lane'],
    ['not declined', { ...ENC, state: 'script-written' }, 'not_declined'],
    ['refundStatus not pending', { ...ENC, refundStatus: 'refunded' }, 'not_pending'],
    ['refundStatus missing', { ...ENC, refundStatus: undefined }, 'not_pending'],
    ['genesis order already sent', { ...ENC, genesisOrderSentAt: '2026-10-02T00:00:00Z' }, 'already_shipped'],
    ['no payment intent', { ...ENC, paymentIntentId: '' }, 'no_payment'],
  ])('rejects %s without touching Stripe or the encounter', async (_n, enc, code) => {
    seed(enc as any);
    await expect(refundEncounter(ARGS)).rejects.toMatchObject({ name: 'RefundError', code });
    expect(refundsCreate).not.toHaveBeenCalled();
    expect(calls('Update')).toHaveLength(0);
  });
});

describe('success path', () => {
  it('claims pending->processing with a conditional update, refunds once, then marks refunded', async () => {
    const res = await refundEncounter(ARGS);
    expect(res).toMatchObject({ ok: true, refundId: 're_1', amountCents: 24900, emailSent: true });
    const [claim, done] = calls('Update');
    expect(claim.input.ConditionExpression).toMatch(/#rs = :pending/);
    expect(claim.input.ConditionExpression).toMatch(/attribute_not_exists\(genesisOrderSentAt\)/);
    expect(claim.input.ExpressionAttributeValues).toMatchObject({ ':pending': 'pending', ':processing': 'processing' });
    expect(refundsCreate).toHaveBeenCalledWith({ payment_intent: 'pi_1' }, { idempotencyKey: 'push-patch-refund-cs_1' });
    expect(done.input.ExpressionAttributeValues).toMatchObject({ ':refunded': 'refunded', ':rid': 're_1', ':by': 'admin@x.com' });
    expect(done.input.UpdateExpression).toMatch(/refundedAt/);
  });

  it('writes an audit row', async () => {
    await refundEncounter(ARGS);
    const put = calls('Put')[0].input.Item;
    expect(put).toMatchObject({ contactId: 'c1', actor: 'admin@x.com' });
    expect(put.sk).toMatch(/^audit#/);
    expect(put.action).toBe('refunded: $249.00');
    expect(put.detail).toContain('re_1');
  });

  it('emails the patient from the info alias with no PHI and no tagline', async () => {
    await refundEncounter(ARGS);
    const p = JSON.parse(Buffer.from(lambdaSend.mock.calls[0][0].input.Payload).toString());
    expect(p).toMatchObject({ kind: 'info', to: 'pat@x.com', from: 'support' });
    expect(p.text).toContain('Your Push Patch refund has been issued. It may take 5–10 business days to appear on your statement.');
    expect(p.text).not.toContain('identity and your dignity');
    expect(p.html).not.toContain('identity and your dignity');
    expect(p.text).not.toMatch(/BPC|declin|physician|did not clear/i);
  });

  it('still succeeds (emailSent false) when the email fails', async () => {
    lambdaSend.mockRejectedValue(new Error('boom'));
    expect(await refundEncounter(ARGS)).toMatchObject({ ok: true, emailSent: false });
  });
});

describe('failure + idempotency', () => {
  it('rolls back processing->pending and rethrows when Stripe fails', async () => {
    refundsCreate.mockRejectedValue(new Error('stripe down'));
    await expect(refundEncounter(ARGS)).rejects.toThrow('stripe down');
    const [claim, rollback] = calls('Update');
    expect(rollback.input.ConditionExpression).toMatch(/#rs = :processing/);
    expect(rollback.input.ExpressionAttributeValues).toMatchObject({ ':pending': 'pending' });
    expect(claim).toBeDefined();
    expect(lambdaSend).not.toHaveBeenCalled();
    expect(calls('Put')).toHaveLength(0);
  });

  it('a lost claim race (conditional check fails) never reaches Stripe', async () => {
    ddbSend.mockImplementation(async (c: any) => {
      if (c.__t === 'Get') return { Item: c.input.Key.sk === 'record' ? REC : ENC };
      if (c.__t === 'Update') throw Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' });
      return {};
    });
    await expect(refundEncounter(ARGS)).rejects.toMatchObject({ code: 'not_pending' });
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it('a second call after success is rejected by the guard and never refunds twice', async () => {
    await refundEncounter(ARGS);
    seed({ ...ENC, refundStatus: 'refunded' });
    await expect(refundEncounter(ARGS)).rejects.toBeInstanceOf(RefundError);
    expect(refundsCreate).toHaveBeenCalledTimes(1);
  });

  it('leaves status processing (no rollback) and throws finalize_failed if the DB write fails AFTER Stripe refunded', async () => {
    let updates = 0;
    ddbSend.mockImplementation(async (c: any) => {
      if (c.__t === 'Get') return { Item: c.input.Key.sk === 'record' ? REC : ENC };
      if (c.__t === 'Update' && ++updates === 2) throw new Error('ddb down');
      return {};
    });
    await expect(refundEncounter(ARGS)).rejects.toMatchObject({ code: 'finalize_failed' });
    expect(updates).toBe(2);
  });
});
