import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signToken } from '../src/sign.js';

const SECRET = 'test-secret-32-bytes-padded-xxxx';

const mockDdb = { send: vi.fn() };
const mockSm  = { send: vi.fn() };

vi.mock('@aws-sdk/client-dynamodb', async () => {
  const actual = await vi.importActual('@aws-sdk/client-dynamodb');
  return { ...actual, DynamoDBClient: vi.fn(() => mockDdb) };
});
vi.mock('@aws-sdk/client-secrets-manager', async () => {
  const actual = await vi.importActual('@aws-sdk/client-secrets-manager');
  return { ...actual, SecretsManagerClient: vi.fn(() => mockSm) };
});

const makeEvent = (token?: string) => ({ queryStringParameters: token ? { token } : {} });

describe('respond-handler', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockSm.send.mockResolvedValue({ SecretString: JSON.stringify({ key: SECRET }) });
  });

  it('approve: updates DDB and returns 200 HTML', async () => {
    mockDdb.send
      .mockResolvedValueOnce({ Item: { approvalId: { S: 'r1' }, status: { S: 'pending' } } })
      .mockResolvedValueOnce({});
    const { handler } = await import('../src/respond-handler.js');
    const token = signToken('r1', 'approve', SECRET);
    const res = await handler(makeEvent(token), {} as any, () => {}) as any;
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Approved');
    expect(mockDdb.send).toHaveBeenCalledTimes(2);
  });

  it('deny: updates DDB and returns 200 denied HTML', async () => {
    mockDdb.send
      .mockResolvedValueOnce({ Item: { approvalId: { S: 'r2' }, status: { S: 'pending' } } })
      .mockResolvedValueOnce({});
    const { handler } = await import('../src/respond-handler.js');
    const token = signToken('r2', 'deny', SECRET);
    const res = await handler(makeEvent(token), {} as any, () => {}) as any;
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Denied');
  });

  it('invalid token: returns 400', async () => {
    const { handler } = await import('../src/respond-handler.js');
    const res = await handler(makeEvent('garbage-token'), {} as any, () => {}) as any;
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('Invalid Token');
  });

  it('already approved: returns friendly HTML without re-processing', async () => {
    mockDdb.send.mockResolvedValueOnce({
      Item: { approvalId: { S: 'r3' }, status: { S: 'approved' }, respondedAt: { S: '2026-05-24T12:00:00.000Z' } }
    });
    const { handler } = await import('../src/respond-handler.js');
    const token = signToken('r3', 'approve', SECRET);
    const res = await handler(makeEvent(token), {} as any, () => {}) as any;
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Already approved');
    // no UpdateItem
    expect(mockDdb.send).toHaveBeenCalledTimes(1);
  });

  it('already denied: returns friendly HTML', async () => {
    mockDdb.send.mockResolvedValueOnce({
      Item: { approvalId: { S: 'r4' }, status: { S: 'denied' }, respondedAt: { S: '2026-05-24T11:00:00.000Z' } }
    });
    const { handler } = await import('../src/respond-handler.js');
    const token = signToken('r4', 'deny', SECRET);
    const res = await handler(makeEvent(token), {} as any, () => {}) as any;
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Already denied');
    expect(mockDdb.send).toHaveBeenCalledTimes(1);
  });

  it('missing token: returns 400', async () => {
    const { handler } = await import('../src/respond-handler.js');
    const res = await handler(makeEvent(), {} as any, () => {}) as any;
    expect(res.statusCode).toBe(400);
  });
});
