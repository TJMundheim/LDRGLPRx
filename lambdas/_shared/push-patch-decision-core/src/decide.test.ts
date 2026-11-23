// Shared decide path, driven the way the admin lambda drives it (decidedBy 'admin:<username>').
import { describe, it, expect, beforeEach, vi } from 'vitest';

const ddbSend = vi.fn();
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: any[]) => ddbSend(...a) }) },
  GetCommand: class { __t = 'Get'; constructor(public input: any) {} },
  UpdateCommand: class { __t = 'Update'; constructor(public input: any) {} },
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class { constructor(_: any) {} } }));
const lambdaSend = vi.fn();
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class { constructor(_: any) {} send = (...a: any[]) => lambdaSend(...a); },
  InvokeCommand: class { constructor(public input: any) {} },
}));
const ssmSend = vi.fn();
vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: class { constructor(_: any) {} send = (...a: any[]) => ssmSend(...a); },
  GetParameterCommand: class { constructor(public input: any) {} },
}));
const retrieve = vi.fn();
const subCancel = vi.fn();
vi.mock('@my4mlife/stripe-client', () => ({ getStripeClient: async () => ({ checkout: { sessions: { retrieve } }, subscriptions: { cancel: subCancel } }) }));

const loadRoster = vi.fn();
vi.mock('@my4mlife/provider-roster', () => ({
  loadRoster: (...a: any[]) => loadRoster(...a),
  resolveProvider: (r: any[], id?: string) => r.find((p) => p.id === id) ?? r.find((p) => p.default),
}));

import { decide, resetPracticeCache } from './index';
import { PDFDocument } from 'pdf-lib';

const ROSTER = [
  { id: 'molina', name: 'Oscar Molina', credentials: 'MD', inbox: 'a@x.com', default: true },
  { id: 'lee', name: 'Ann Lee', credentials: 'DO', inbox: 'b@x.com' },
];
const orderPdf = async () => {
  const m = emails().find((e) => e.attachments?.length);
  return (await PDFDocument.load(Buffer.from(m.attachments[0].contentBase64, 'base64'))).getForm().getTextField('clinician').getText();
};

const ARGS = { contactId: 'c1', encounterId: 'pp-cs_1', decidedBy: 'admin:tj' };
const enc = (state: string, lane = 'push-patch') => ({ lane, state, sku: 'push-patch-bpc-nad-ghk', sessionId: 'cs_1' });
const seed = (state: string, reject = false, lane = 'push-patch') => ddbSend.mockImplementation(async (cmd: any) => {
  if (cmd.__t === 'Get') return { Item: cmd.input.Key.sk === 'record' ? { demographics: { firstName: 'Jane', lastName: 'Doe', email: 'j@example.com' } } : cmd.input.Key.sk === 'encounter#pp-cs_1' ? enc(state, lane) : undefined };
  if (reject) throw Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' });
  return {};
});
const updates = () => ddbSend.mock.calls.map((c) => c[0]).filter((c) => c.__t === 'Update').map((c) => c.input);
const emails = () => lambdaSend.mock.calls.map((c) => JSON.parse(Buffer.from(c[0].input.Payload).toString()));

beforeEach(() => {
  vi.clearAllMocks(); resetPracticeCache();
  loadRoster.mockResolvedValue(ROSTER);
  ssmSend.mockRejectedValue(Object.assign(new Error('nf'), { name: 'ParameterNotFound' }));
  lambdaSend.mockResolvedValue({ StatusCode: 200 });
  retrieve.mockResolvedValue({ metadata: {}, shipping_details: { name: 'Jane Doe', address: { line1: '1 A St', city: 'Austin', state: 'TX', postal_code: '78701' } } });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('decide (shared by physician link + admin app)', () => {
  it('approve: claims script-written with decidedBy, emails welcome + order, stamps genesisOrderSentAt', async () => {
    seed('sent-to-provider');
    expect(await decide({ ...ARGS, action: 'approve' })).toEqual({ kind: 'approved', mailOk: true });
    const u = updates();
    expect(u[0].ExpressionAttributeValues).toMatchObject({ ':from': 'sent-to-provider', ':to': 'script-written', ':decidedBy': 'admin:tj' });
    expect(u[1].UpdateExpression).toMatch(/genesisOrderSentAt/);
    expect(emails().map((m) => m.subject).join('|')).toMatch(/Welcome/);
    expect(emails()).toHaveLength(2);
  });

  describe('default refills', () => {
    // Encounter reads sent-to-provider until the claim lands, then script-written (what grantRefills needs).
    const seedStateful = () => {
      let claimed = false;
      ddbSend.mockImplementation(async (cmd: any) => {
        if (cmd.__t === 'Get') return { Item: cmd.input.Key.sk === 'record' ? { demographics: { firstName: 'Jane', lastName: 'Doe', email: 'j@example.com' } } : { ...enc(claimed ? 'script-written' : 'sent-to-provider') } };
        if (cmd.input.ExpressionAttributeValues?.[':from'] === 'sent-to-provider') claimed = true;
        return {};
      });
    };
    const refillUpdates = () => updates().filter((u) => /refillAuth/.test(u.UpdateExpression));

    it('approve grants 8 refills by default, with provider, partnerRef, and records the shipment', async () => {
      seedStateful();
      retrieve.mockResolvedValue({ metadata: { partnerRef: 'ACME' }, shipping_details: { name: 'Jane Doe', address: { line1: '1 A St', city: 'Austin', state: 'TX', postal_code: '78701' } } });
      await decide({ ...ARGS, action: 'approve' });
      expect(retrieve).toHaveBeenCalledWith('cs_1', {}); // unchanged one-time path: no expand
      const [grant, ship] = refillUpdates();
      expect(grant.ExpressionAttributeValues[':a']).toMatchObject({ refillsAuthorized: 8, refillsUsed: 0, sku: 'push-patch-bpc-nad-ghk', authorizedBy: 'Oscar Molina', signedByProviderId: 'molina', partnerRef: 'ACME', mode: 'on-demand', status: 'active' });
      expect(ship.UpdateExpression).toMatch(/refillAuth.lastShippedAt/);
      expect(ship.ExpressionAttributeValues).toMatchObject({ ':zero': 0 });
      expect(ship.ExpressionAttributeValues[':due']).toBeTruthy();
    });

    it('refills: 3 is honored; refills: 0 writes no refillAuth at all', async () => {
      seedStateful();
      await decide({ ...ARGS, action: 'approve', refills: 3 });
      expect(refillUpdates()[0].ExpressionAttributeValues[':a'].refillsAuthorized).toBe(3);
      vi.clearAllMocks(); seedStateful(); lambdaSend.mockResolvedValue({ StatusCode: 200 });
      retrieve.mockResolvedValue({ metadata: {}, shipping_details: { name: 'Jane Doe', address: { line1: '1 A St', city: 'Austin', state: 'TX', postal_code: '78701' } } });
      expect(await decide({ ...ARGS, action: 'approve', refills: 0 })).toEqual({ kind: 'approved', mailOk: true });
      expect(refillUpdates()).toHaveLength(0);
    });

    it('a failed grant never fails the approval', async () => {
      seed('sent-to-provider'); // grantRefills sees a non-script-written encounter and throws
      expect(await decide({ ...ARGS, action: 'approve' })).toEqual({ kind: 'approved', mailOk: true });
      expect(refillUpdates()).toHaveLength(0);
    });
  });

  it('approve with providerId: clinician field and encounter stamp carry the chosen provider', async () => {
    seed('sent-to-provider');
    await decide({ ...ARGS, action: 'approve', providerId: 'lee' });
    const claim = updates()[0];
    expect(claim.UpdateExpression).toMatch(/signedByProviderId = :signedByProviderId/);
    expect(claim.UpdateExpression).toMatch(/signedByName = :signedByName/);
    expect(claim.ExpressionAttributeValues).toMatchObject({ ':signedByProviderId': 'lee', ':signedByName': 'Ann Lee' });
    expect(await orderPdf()).toBe('Ann Lee');
  });

  it('approve without providerId: default provider is stamped and signs', async () => {
    seed('sent-to-provider');
    await decide({ ...ARGS, action: 'approve' });
    expect(updates()[0].ExpressionAttributeValues).toMatchObject({ ':signedByProviderId': 'molina', ':signedByName': 'Oscar Molina' });
    expect(await orderPdf()).toBe('Oscar Molina');
  });

  it('roster rejects: approve still succeeds, no clinicianName, no signedBy stamp (existing missing-config path)', async () => {
    seed('sent-to-provider');
    loadRoster.mockRejectedValue(new Error('no clinician and no providers'));
    expect(await decide({ ...ARGS, action: 'approve', providerId: 'lee' })).toEqual({ kind: 'approved', mailOk: true });
    const claim = updates()[0];
    expect(claim.UpdateExpression).not.toMatch(/signedBy/);
    expect(Object.keys(claim.ExpressionAttributeValues).join()).not.toMatch(/signedBy/);
    expect(await orderPdf()).toBeFalsy(); // practice SSM is missing in this test: clinician stays blank, order goes to TJ only
    expect(emails().find((e) => e.attachments?.length).subject).toMatch(/ACTION NEEDED/);
  });

  it('decline ignores the roster and providerId: no signedBy fields', async () => {
    seed('sent-to-provider');
    await decide({ ...ARGS, action: 'decline', providerId: 'lee' });
    expect(loadRoster).not.toHaveBeenCalled();
    expect(updates()[0].UpdateExpression).not.toMatch(/signedBy/);
  });

  it('decline: declined + pending refund + decidedBy; one patient email; no Stripe, no genesisOrderSentAt', async () => {
    seed('sent-to-provider');
    expect(await decide({ ...ARGS, action: 'decline' })).toEqual({ kind: 'declined', mailOk: true });
    const u = updates();
    expect(u).toHaveLength(1);
    expect(u[0].ExpressionAttributeValues).toMatchObject({ ':to': 'declined', ':refundStatus': 'pending', ':decidedBy': 'admin:tj' });
    expect(u[0].ExpressionAttributeValues[':refundDueBy']).toMatch(/^\d{4}-\d\d-\d\d$/);
    expect(retrieve).not.toHaveBeenCalled();
    expect(emails()).toHaveLength(1);
  });

  it.each(['script-written', 'declined', 'new'])('already decided/other state (%s): no update, no email', async (state) => {
    seed(state);
    expect(await decide({ ...ARGS, action: 'approve' })).toEqual({ kind: 'already-decided', state });
    expect(updates()).toHaveLength(0);
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('race: conditional claim fails → already-decided, no email', async () => {
    seed('sent-to-provider', true);
    expect((await decide({ ...ARGS, action: 'decline' })).kind).toBe('already-decided');
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('encounter of another lane is never decidable (not-found, no update, no email)', async () => {
    seed('sent-to-provider', false, 'gut-brain-rx');
    expect(await decide({ ...ARGS, action: 'decline' })).toEqual({ kind: 'not-found' });
    expect(updates()).toHaveLength(0);
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('unknown encounter → not-found', async () => {
    ddbSend.mockResolvedValue({});
    expect(await decide({ ...ARGS, action: 'approve' })).toEqual({ kind: 'not-found' });
  });

  describe('glp1 lane', () => {
    const G = { contactId: 'c1', encounterId: 'g1-cs_1', decidedBy: 'admin:tj' };
    const SESSION = (mode = 'payment') => ({ mode, ...(mode === 'subscription' && { subscription: 'sub_1' }), metadata: {}, shipping_details: { name: 'Jane Doe', address: { line1: '1 A St', city: 'Austin', state: 'TX', postal_code: '78701' } } });
    const seedG = (reject = false) => {
      let claimed = false;
      ddbSend.mockImplementation(async (cmd: any) => {
        if (cmd.__t === 'Get') return { Item: cmd.input.Key.sk === 'record' ? { demographics: { firstName: 'Jane', lastName: 'Doe', email: 'j@example.com', phone: '555-1', dob: '1980-01-02' } }
          : { lane: 'glp1', state: claimed ? 'script-written' : 'sent-to-provider', sku: 'glp1-sema', sessionId: 'cs_1' } };
        if (reject) throw Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' });
        if (cmd.input.ExpressionAttributeValues?.[':from'] === 'sent-to-provider') claimed = true;
        return {};
      });
    };
    beforeEach(() => retrieve.mockResolvedValue(SESSION()));

    it('approve without a dose: refused, nothing written or sent', async () => {
      seedG();
      for (const dose of [undefined, '', '  ']) {
        const out = await decide({ ...G, action: 'approve', ...(dose !== undefined && { dose }) });
        expect(out).toMatchObject({ kind: 'dose-required' });
      }
      expect(updates()).toHaveLength(0);
      expect(lambdaSend).not.toHaveBeenCalled();
    });

    it('approve: records dose, grants 8 refills at 28 days, welcome + TJ order email only, stamps genesisOrderSentAt, nothing to Genesis/pharmacy', async () => {
      seedG();
      expect(await decide({ ...G, action: 'approve', dose: '0.5 mg' })).toEqual({ kind: 'approved', mailOk: true });
      const u = updates();
      expect(u[0].ExpressionAttributeValues).toMatchObject({ ':to': 'script-written', ':dose': '0.5 mg' });
      const grant = u.find((x) => /refillAuth = :a/.test(x.UpdateExpression));
      expect(grant.ExpressionAttributeValues[':a']).toMatchObject({ refillsAuthorized: 8, sku: 'glp1-sema', product: 'glp1-sema', fulfillment: 'manual', intervalDays: 28 });
      const stamp = u.find((x) => /genesisOrderSentAt/.test(x.UpdateExpression));
      expect(stamp.UpdateExpression).not.toMatch(/genesisOrderTo/);
      const m = emails();
      expect(m).toHaveLength(2);
      expect(m.find((e) => e.to === 'j@example.com').subject).toMatch(/GLP-1/);
      const tj = m.find((e) => e.to === 'drtj@my4mlife.com');
      expect(tj.subject).toBe('[ACTION NEEDED] Place pharmacy order: Jane D. · GLP-1 · Sema (semaglutide) · 0.5 mg');
      expect(tj.text).toMatch(/Auto-ship: no/);
      expect(m.some((e) => e.attachments?.length)).toBe(false);
      expect(JSON.stringify(m)).not.toMatch(/genesis/i);
    });

    it('auto-ship comes from the Stripe session mode (subscription = yes) and suppresses reminders', async () => {
      seedG();
      retrieve.mockResolvedValue(SESSION('subscription'));
      await decide({ ...G, action: 'approve', dose: '1 mg' });
      expect(emails().find((e) => e.to === 'drtj@my4mlife.com').text).toMatch(/Auto-ship: yes/);
      expect(updates().find((x) => /lastShippedAt/.test(x.UpdateExpression)).UpdateExpression).toMatch(/REMOVE refillDueAt/);
    });

    it('decline: refund pending, GLP-1 decline email, no dose needed, no TJ order email, no stamp', async () => {
      seedG();
      expect(await decide({ ...G, action: 'decline' })).toEqual({ kind: 'declined', mailOk: true });
      expect(updates()).toHaveLength(1);
      expect(updates()[0].ExpressionAttributeValues).toMatchObject({ ':to': 'declined', ':refundStatus': 'pending' });
      expect(emails()).toHaveLength(1);
      expect(emails()[0].subject).toMatch(/GLP-1/);
    });

    it('auto-ship approve: refill auth is mode auto with the subscription id (no reorder reminders, refund can find it)', async () => {
      seedG();
      retrieve.mockResolvedValue(SESSION('subscription'));
      await decide({ ...G, action: 'approve', dose: '1 mg' });
      const grant = updates().find((x) => /refillAuth = :a/.test(x.UpdateExpression));
      expect(grant.ExpressionAttributeValues[':a']).toMatchObject({ mode: 'auto', subscriptionId: 'sub_1' });
    });

    it('auto-ship decline: cancels the subscription so no renewal bills', async () => {
      seedG();
      retrieve.mockResolvedValue(SESSION('subscription'));
      subCancel.mockResolvedValue({});
      expect(await decide({ ...G, action: 'decline' })).toEqual({ kind: 'declined', mailOk: true });
      expect(subCancel).toHaveBeenCalledWith('sub_1');
    });

    it('auto-ship decline: a failed cancel never blocks the decline (the admin refund cancels it too)', async () => {
      seedG();
      retrieve.mockResolvedValue(SESSION('subscription'));
      subCancel.mockRejectedValue(new Error('stripe down'));
      expect(await decide({ ...G, action: 'decline' })).toEqual({ kind: 'declined', mailOk: true });
    });

    it('one-time decline: no subscription to cancel', async () => {
      seedG();
      await decide({ ...G, action: 'decline' });
      expect(subCancel).not.toHaveBeenCalled();
    });

    it('unknown lanes are still not decidable', async () => {
      seed('sent-to-provider', false, 'trt');
      expect(await decide({ ...ARGS, action: 'decline' })).toEqual({ kind: 'not-found' });
    });
  });
});
