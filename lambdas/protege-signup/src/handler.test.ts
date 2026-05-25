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
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class { constructor(_: any) {} },
}));

vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class { send = lambdaSend; },
  InvokeCommand: class { constructor(public input: any) {} },
}));

import { handler, NAMESPACE } from './handler';

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
  // Default: user not found → create
  cognitoSend.mockRejectedValueOnce(Object.assign(new Error('not found'), { name: 'UserNotFoundException' }));
  cognitoSend.mockResolvedValue({});
  ddbSend.mockResolvedValue({});
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

  it('returns 400 when phone missing', async () => {
    const res: any = await handler(evt({ firstName: 'TJ', email: 'tj@example.com', consent: { ai: true, protege: true } }));
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
    cognitoSend.mockResolvedValue({ Username: 'tj@example.com' }); // AdminGetUser succeeds
    ddbSend.mockResolvedValue({});
    const res: any = await handler(evt(validBody));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.alreadyExists).toBe(true);
  });

  it('writes Contact with lifecycleStage=protege and correct fields', async () => {
    await handler(evt(validBody));
    const cmd = ddbSend.mock.calls[0][0];
    const vals = cmd.input.ExpressionAttributeValues;
    expect(vals[':protege']).toBe('protege');
    expect(vals[':email']).toBe('tj@example.com');
    expect(vals[':firstName']).toBe('TJ');
    expect(vals[':phone']).toBe('+15551234567');
    expect(vals[':consent'].ai.v).toBe('consent-ai-v1');
    expect(vals[':consent'].protege.v).toBe('consent-protege-v1');
  });

  it('contactId is deterministic UUIDv5 of lowercased email', async () => {
    await handler(evt({ ...validBody, email: '  TJ@Example.COM  ' }));
    const cmd = ddbSend.mock.calls[0][0];
    expect(cmd.input.Key.contactId).toBe(uuidv5('tj@example.com', NAMESPACE));
  });

  it('fires welcome email asynchronously for new user', async () => {
    await handler(evt(validBody));
    expect(lambdaSend).toHaveBeenCalledOnce();
    const cmd = lambdaSend.mock.calls[0][0];
    expect(cmd.input.InvocationType).toBe('Event');
  });

  it('does NOT fire welcome email when user already existed', async () => {
    cognitoSend.mockReset();
    cognitoSend.mockResolvedValue({ Username: 'tj@example.com' });
    ddbSend.mockResolvedValue({});
    await handler(evt(validBody));
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('handles OPTIONS preflight', async () => {
    const res: any = await handler({ body: null, requestContext: { http: { method: 'OPTIONS' } } } as any);
    expect(res.statusCode).toBe(204);
  });
});
