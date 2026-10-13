import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => { process.env.COGNITO_USER_POOL_ID = 'us-east-2_test'; });

const ddbSend = vi.fn();
const cognitoSend = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: any[]) => ddbSend(...a) }) },
  GetCommand: class GetCommand { input: any; constructor(input: any) { this.input = input; } },
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class { constructor(_: any) {} } }));
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: class { constructor(_: any) {} send = (...a: any[]) => cognitoSend(...a); },
  ListUsersCommand: class ListUsersCommand { input: any; constructor(input: any) { this.input = input; } },
}));

import { loadAssessment } from './assessment';

const USERS_ROW = {
  id: 'sub-1',
  primaryEmail: 'sam@example.com',
  intakeAnswers: JSON.stringify({ sleep: 2, gut: 4 }),
  auditTop3: JSON.stringify(['gut', 'sleep', 'weight']),
  auditCompletedAt: '2026-10-01T00:00:00.000Z',
};
const LEGACY = { intakeAnswers: JSON.stringify({ sleep: 1 }), auditTop3: ['sleep'], auditCompletedAt: '2026-09-01T00:00:00.000Z' };

beforeEach(() => {
  vi.clearAllMocks();
  cognitoSend.mockResolvedValue({ Users: [{ Username: 'sub-1', Attributes: [{ Name: 'sub', Value: 'sub-1' }] }] });
  ddbSend.mockResolvedValue({ Item: USERS_ROW });
});

describe('loadAssessment', () => {
  it('Users hit: looks up sub by email in Cognito, reads Users by id, parses JSON-string fields', async () => {
    const a = await loadAssessment('Sam@Example.com', LEGACY);
    expect(cognitoSend.mock.calls[0][0].input.Filter).toBe('email = "sam@example.com"');
    expect(ddbSend.mock.calls[0][0].input).toMatchObject({ TableName: 'Users', Key: { id: 'sub-1' } });
    expect(a).toEqual({
      intakeAnswers: { sleep: 2, gut: 4 },
      auditTop3: ['gut', 'sleep', 'weight'],
      auditCompletedAt: '2026-10-01T00:00:00.000Z',
    });
  });

  it('accepts already-parsed objects/arrays in Users rows', async () => {
    ddbSend.mockResolvedValue({ Item: { id: 'sub-1', intakeAnswers: { gut: 3 }, auditTop3: ['gut'] } });
    const a = await loadAssessment('sam@example.com', undefined);
    expect(a?.intakeAnswers).toEqual({ gut: 3 });
    expect(a?.auditTop3).toEqual(['gut']);
  });

  it('no Cognito user: falls back to legacy Contact fields without reading Users', async () => {
    cognitoSend.mockResolvedValue({ Users: [] });
    const a = await loadAssessment('sam@example.com', LEGACY);
    expect(ddbSend).not.toHaveBeenCalled();
    expect(a).toEqual({ intakeAnswers: { sleep: 1 }, auditTop3: ['sleep'], auditCompletedAt: '2026-09-01T00:00:00.000Z' });
  });

  it('Users row without assessment fields: falls back to legacy Contact fields', async () => {
    ddbSend.mockResolvedValue({ Item: { id: 'sub-1' } });
    const a = await loadAssessment('sam@example.com', LEGACY);
    expect(a?.intakeAnswers).toEqual({ sleep: 1 });
  });

  it('nothing anywhere: undefined (brief says "not taken")', async () => {
    cognitoSend.mockResolvedValue({ Users: [] });
    expect(await loadAssessment('sam@example.com', undefined)).toBeUndefined();
    expect(await loadAssessment(undefined, {})).toBeUndefined();
  });

  it('Cognito error: does not throw, falls back to legacy, logs error name only', async () => {
    const err = Object.assign(new Error('boom sam@example.com'), { name: 'AccessDeniedException' });
    cognitoSend.mockRejectedValue(err);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const a = await loadAssessment('sam@example.com', LEGACY);
    expect(a?.auditTop3).toEqual(['sleep']);
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain('AccessDeniedException');
    expect(logged).not.toContain('sam@example.com');
    spy.mockRestore();
  });

  it('Users read error: does not throw, falls back', async () => {
    ddbSend.mockRejectedValue(Object.assign(new Error('x'), { name: 'ProvisionedThroughputExceededException' }));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await loadAssessment('sam@example.com', LEGACY))?.auditTop3).toEqual(['sleep']);
    spy.mockRestore();
  });

  it('escapes quotes in the email filter', async () => {
    cognitoSend.mockResolvedValue({ Users: [] });
    await loadAssessment('a"b@example.com', undefined);
    expect(cognitoSend.mock.calls[0][0].input.Filter).toBe('email = "a\\"b@example.com"');
  });
});
