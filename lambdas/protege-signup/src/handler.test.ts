import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v5 as uuidv5 } from 'uuid';

const { cognitoSend, ddbSend, lambdaSend } = vi.hoisted(() => ({
  cognitoSend: vi.fn(),
  ddbSend: vi.fn(),
  lambdaSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: class { send = cognitoSend; },
  AdminGetUserCommand: class { constructor(public input: any) {} },
  AdminCreateUserCommand: class { constructor(public input: any) {} },
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: ddbSend }) },
  UpdateCommand: class { constructor(public input: any) {} },
  GetCommand: class { constructor(public input: any) {} },
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class { constructor(_: any) {} },
}));

vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class { send = lambdaSend; },
  InvokeCommand: class { constructor(public input: any) {} },
}));

import { handler, NAMESPACE } from './handler';

// Minimal in-memory Contact table: applies `SET a = :v | if_not_exists(a, :v)` and honors the
// promote ConditionExpression, so tests assert what survives rather than expression strings.
const store = new Map<string, any>();
const contactWrites = () =>
  ddbSend.mock.calls.map((c) => c[0]).filter((c) => c.input?.TableName === 'Contact' && c.input.UpdateExpression);

function fakeDdb(cmd: any) {
  const { TableName, Key, UpdateExpression: ux, ExpressionAttributeNames: n = {}, ExpressionAttributeValues: v = {}, ConditionExpression: cond } = cmd.input;
  if (TableName !== 'Contact') return {};
  const row = store.get(Key.contactId);
  if (!ux) return { Item: row };
  if (cond) {
    const allowed = Object.entries(v).filter(([k]) => k.startsWith(':from')).map(([, x]) => x);
    if (row?.lifecycleStage && !allowed.includes(row.lifecycleStage)) {
      throw Object.assign(new Error('cond'), { name: 'ConditionalCheckFailedException' });
    }
  }
  const next = { ...(row ?? {}) };
  const set = /SET (.*?)( ADD |$)/.exec(ux)![1].split(/, (?=#)/);
  for (const part of set) {
    const [lhs, rhs] = part.split(' = ');
    const attr = n[lhs] ?? lhs;
    const m = /^if_not_exists\((.+?), (:.+?)\)$/.exec(rhs);
    if (m) { if (next[attr] === undefined) next[attr] = v[m[2]]; } else next[attr] = v[rhs];
  }
  store.set(Key.contactId, next);
  return {};
}

function evt(body: any) {
  return { body: JSON.stringify(body), headers: {}, requestContext: { http: { method: 'POST' } } } as any;
}

const validBody = {
  firstName: 'TJ',
  email: 'tj@example.com',
  phone: '+15551234567',
  consent: { ai: true, protege: true },
};

beforeEach(() => {
  cognitoSend.mockReset();
  ddbSend.mockReset();
  lambdaSend.mockReset();
  // Default: user not found → create. AdminCreateUser returns User with sub attribute.
  cognitoSend.mockRejectedValueOnce(Object.assign(new Error('not found'), { name: 'UserNotFoundException' }));
  cognitoSend.mockResolvedValue({ User: { Attributes: [{ Name: 'sub', Value: 'sub-abc-123' }] } });
  store.clear();
  ddbSend.mockReset();
  ddbSend.mockImplementation(async (cmd: any) => fakeDdb(cmd));
  lambdaSend.mockResolvedValue({});
});

describe('protege-signup handler', () => {
  it('returns 400 when email missing', async () => {
    const res: any = await handler(evt({ firstName: 'TJ', phone: '+15551234567', consent: { ai: true, protege: true } }));
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when firstName missing', async () => {
    const res: any = await handler(evt({ email: 'tj@example.com', phone: '+15551234567', consent: { ai: true, protege: true } }));
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when phone is not E.164', async () => {
    const res: any = await handler(evt({ ...validBody, phone: '555-1212' }));
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when consent.ai is false', async () => {
    const res: any = await handler(evt({ ...validBody, consent: { ai: false, protege: true } }));
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when consent.protege is false', async () => {
    const res: any = await handler(evt({ ...validBody, consent: { ai: true, protege: false } }));
    expect(res.statusCode).toBe(400);
  });

  it('returns 200 ok for valid new user', async () => {
    const res: any = await handler(evt(validBody));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.alreadyExists).toBeUndefined();
  });

  it('returns 200 with alreadyExists=true when cognito user exists', async () => {
    cognitoSend.mockReset();
    cognitoSend.mockResolvedValue({ Username: 'tj@example.com', UserAttributes: [{ Name: 'sub', Value: 'sub-existing' }] });
    ddbSend.mockResolvedValue({});
    const res: any = await handler(evt(validBody));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.alreadyExists).toBe(true);
  });

  it('fires welcome email asynchronously for new user', async () => {
    await handler(evt(validBody));
    expect(lambdaSend).toHaveBeenCalledOnce();
    const cmd = lambdaSend.mock.calls[0][0];
    expect(cmd.input.InvocationType).toBe('Event');
  });

  it('does NOT re-send the welcome email when the Cognito user already existed (audit #15)', async () => {
    cognitoSend.mockReset();
    cognitoSend.mockResolvedValue({ Username: 'tj@example.com', UserAttributes: [{ Name: 'sub', Value: 'sub-existing' }] });
    ddbSend.mockResolvedValue({});
    lambdaSend.mockReset();
    await handler(evt(validBody));
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('handles OPTIONS preflight', async () => {
    const res: any = await handler({ body: null, requestContext: { http: { method: 'OPTIONS' } } } as any);
    expect(res.statusCode).toBe(204);
  });

  describe('Contact write (non-clobbering)', () => {
    const id = uuidv5('tj@example.com', NAMESPACE);

    it('creates a protege Contact with identity, consent map, and protege-signup source/event', async () => {
      await handler(evt(validBody));
      const row = store.get(id);
      expect(row).toMatchObject({ email: 'tj@example.com', firstName: 'TJ', phone: '+15551234567', lifecycleStage: 'protege' });
      expect(row.lastEvent).toMatchObject({ type: 'protege-signup', source: 'protege-signup' });
      expect(row.consent.ai.v).toBe('consent-ai-v1');
      expect(row.consent.protege.v).toBe('consent-protege-v1');
    });

    it('second signup keeps existing firstName, phone, consent timestamps, and marketingConsent', async () => {
      const consent = { ai: { v: 'consent-ai-v1', at: 'T0' }, protege: { v: 'consent-protege-v1', at: 'T0' } };
      const marketingConsent = { status: 'opted_in', source: 'blog', at: 'T0' };
      store.set(id, { contactId: id, email: 'tj@example.com', firstName: 'Thomas', phone: '+15559998888',
        lifecycleStage: 'lead', consent, marketingConsent });
      await handler(evt({ ...validBody, firstName: 'TJ', phone: '+15551234567' }));
      const row = store.get(id);
      expect(row.firstName).toBe('Thomas');
      expect(row.phone).toBe('+15559998888');
      expect(row.consent).toEqual(consent);
      expect(row.marketingConsent).toEqual(marketingConsent);
      expect(row.lifecycleStage).toBe('protege');
    });

    it('stamps protegeSince on a new signup and keeps the original value on a repeat', async () => {
      await handler(evt(validBody));
      const first = store.get(id).protegeSince;
      expect(typeof first).toBe('string');
      store.get(id).protegeSince = 'T0';
      await handler(evt(validBody));
      expect(store.get(id).protegeSince).toBe('T0');
    });

    it('allows a customer to sign up: Contact is updated but stage is not demoted, and protegeSince is set', async () => {
      store.set(id, { contactId: id, email: 'tj@example.com', lifecycleStage: 'customer' });
      const res: any = await handler(evt(validBody));
      expect(res.statusCode).toBe(200);
      expect(typeof store.get(id).protegeSince).toBe('string');
      expect(contactWrites().length).toBeGreaterThan(0);
      expect(store.get(id).lifecycleStage).toBe('customer');
      expect(store.get(id).lastEvent.type).toBe('protege-signup');
    });

    it('refuses to touch a banned Contact (no Contact writes) but still returns 200 as before', async () => {
      store.set(id, { contactId: id, email: 'tj@example.com', lifecycleStage: 'banned' });
      const before = JSON.stringify(store.get(id));
      const res: any = await handler(evt(validBody));
      expect(res.statusCode).toBe(200);
      expect(contactWrites()).toHaveLength(0);
      expect(JSON.stringify(store.get(id))).toBe(before);
    });

    it('signup without phone succeeds: no phone on Contact upsert, Cognito, or Users seed', async () => {
      const { phone, ...noPhone } = validBody;
      const res: any = await handler(evt(noPhone));
      expect(res.statusCode).toBe(200);
      const row = store.get(id);
      expect(row.firstName).toBe('TJ');
      expect('phone' in row).toBe(false);
      for (const c of contactWrites()) expect(JSON.stringify(c.input)).not.toContain('phone');
      const create = cognitoSend.mock.calls.map((c) => c[0].input).find((i) => i.UserAttributes);
      expect(create.UserAttributes.map((a: any) => a.Name)).not.toContain('phone_number');
      const users = ddbSend.mock.calls.map((c) => c[0]).filter((c) => c.input?.TableName === 'Users');
      expect(users.length).toBe(1);
      expect(JSON.stringify(users[0].input)).not.toContain('phone');
    });

    it('returns 500 write failed when a Contact write errors unexpectedly', async () => {
      ddbSend.mockImplementation(async (cmd: any) => {
        if (cmd.input?.UpdateExpression && cmd.input.TableName === 'Contact') throw new Error('ddb down');
        return {};
      });
      const res: any = await handler(evt(validBody));
      expect(res.statusCode).toBe(500);
    });
  });
});
