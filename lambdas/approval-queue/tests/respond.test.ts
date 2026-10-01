import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
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

// HTTP API payload v2: GET carries ?token=, POST carries the confirm form body token=.
const get = (token?: string) => ({
  requestContext: { http: { method: 'GET' } },
  queryStringParameters: token ? { token } : {},
});
const post = (token: string, base64 = false) => {
  const body = new URLSearchParams({ token }).toString();
  return {
    requestContext: { http: { method: 'POST' } },
    queryStringParameters: { token },
    body: base64 ? Buffer.from(body).toString('base64') : body,
    isBase64Encoded: base64,
  };
};
const pending = (id: string, extra: Record<string, any> = {}) =>
  ({ Item: { approvalId: { S: id }, status: { S: 'pending' }, ...extra } });

describe('respond-handler', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockSm.send.mockResolvedValue({ SecretString: JSON.stringify({ key: SECRET }) });
  });

  describe('GET (email link — scanners prefetch this, so it must never act)', () => {
    it('approve link: renders a confirm page with a POST form and touches no DDB', async () => {
      const { handler } = await import('../src/respond-handler.js');
      const token = signToken('r1', 'approve', SECRET);
      const res = await handler(get(token), {} as any, () => {}) as any;
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('<form method="post"');
      expect(res.body).toContain(`name="token" value="${token}"`);
      expect(res.body).toContain('Confirm approve');
      expect(res.headers['cache-control']).toBe('no-store');
      expect(mockDdb.send).not.toHaveBeenCalled();
    });

    it('deny link: renders a deny confirm page and touches no DDB', async () => {
      const { handler } = await import('../src/respond-handler.js');
      const res = await handler(get(signToken('r2', 'deny', SECRET)), {} as any, () => {}) as any;
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Confirm deny');
      expect(mockDdb.send).not.toHaveBeenCalled();
    });

    it('invalid token: returns 400', async () => {
      const { handler } = await import('../src/respond-handler.js');
      const res = await handler(get('garbage-token'), {} as any, () => {}) as any;
      expect(res.statusCode).toBe(400);
      expect(res.body).toContain('Invalid Token');
    });

    it('missing token: returns 400', async () => {
      const { handler } = await import('../src/respond-handler.js');
      const res = await handler(get(), {} as any, () => {}) as any;
      expect(res.statusCode).toBe(400);
    });

    it('treats a missing method as GET (never acts by default)', async () => {
      const { handler } = await import('../src/respond-handler.js');
      const res = await handler({ queryStringParameters: { token: signToken('r1', 'approve', SECRET) } }, {} as any, () => {}) as any;
      expect(res.statusCode).toBe(200);
      expect(mockDdb.send).not.toHaveBeenCalled();
    });
  });

  describe('POST (confirm form submit — performs the action)', () => {
    it('approve: updates DDB and returns 200 Approved', async () => {
      mockDdb.send.mockResolvedValueOnce(pending('r1')).mockResolvedValueOnce({});
      const { handler } = await import('../src/respond-handler.js');
      const res = await handler(post(signToken('r1', 'approve', SECRET)), {} as any, () => {}) as any;
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Approved');
      expect(mockDdb.send).toHaveBeenCalledTimes(2);
      expect(mockDdb.send.mock.calls[1][0].input.ExpressionAttributeValues[':s']).toEqual({ S: 'approved' });
    });

    it('deny: updates DDB and returns 200 Denied (base64 body)', async () => {
      mockDdb.send.mockResolvedValueOnce(pending('r2')).mockResolvedValueOnce({});
      const { handler } = await import('../src/respond-handler.js');
      const res = await handler(post(signToken('r2', 'deny', SECRET), true), {} as any, () => {}) as any;
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Denied');
      expect(mockDdb.send.mock.calls[1][0].input.ExpressionAttributeValues[':s']).toEqual({ S: 'denied' });
    });

    it('ignores the query-string token on POST (body token required)', async () => {
      const { handler } = await import('../src/respond-handler.js');
      const evt = { ...post(signToken('r1', 'approve', SECRET)), body: '' };
      const res = await handler(evt, {} as any, () => {}) as any;
      expect(res.statusCode).toBe(400);
      expect(mockDdb.send).not.toHaveBeenCalled();
    });

    it('invalid token: returns 400 and does not touch DDB', async () => {
      const { handler } = await import('../src/respond-handler.js');
      const res = await handler(post('garbage-token'), {} as any, () => {}) as any;
      expect(res.statusCode).toBe(400);
      expect(mockDdb.send).not.toHaveBeenCalled();
    });

    it('not found: returns 404', async () => {
      mockDdb.send.mockResolvedValueOnce({ Item: undefined });
      const { handler } = await import('../src/respond-handler.js');
      const res = await handler(post(signToken('nope', 'approve', SECRET)), {} as any, () => {}) as any;
      expect(res.statusCode).toBe(404);
    });

    it('already approved: returns friendly HTML without re-processing', async () => {
      mockDdb.send.mockResolvedValueOnce({
        Item: { approvalId: { S: 'r3' }, status: { S: 'approved' }, respondedAt: { S: '2026-05-24T12:00:00.000Z' } },
      });
      const { handler } = await import('../src/respond-handler.js');
      const res = await handler(post(signToken('r3', 'approve', SECRET)), {} as any, () => {}) as any;
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Already approved');
      expect(mockDdb.send).toHaveBeenCalledTimes(1);
    });

    it('already denied: returns friendly HTML', async () => {
      mockDdb.send.mockResolvedValueOnce({
        Item: { approvalId: { S: 'r4' }, status: { S: 'denied' }, respondedAt: { S: '2026-05-24T11:00:00.000Z' } },
      });
      const { handler } = await import('../src/respond-handler.js');
      const res = await handler(post(signToken('r4', 'deny', SECRET)), {} as any, () => {}) as any;
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Already denied');
      expect(mockDdb.send).toHaveBeenCalledTimes(1);
    });

    it('expired (past expiresAt): returns 410 and does not update', async () => {
      mockDdb.send.mockResolvedValueOnce(pending('r5', { expiresAt: { S: '2020-01-01T00:00:00.000Z' } }));
      const { handler } = await import('../src/respond-handler.js');
      const res = await handler(post(signToken('r5', 'approve', SECRET)), {} as any, () => {}) as any;
      expect(res.statusCode).toBe(410);
      expect(res.body).toContain('Link Expired');
      expect(mockDdb.send).toHaveBeenCalledTimes(1);
    });

    it('race: conditional update fails → Already decided page, not a 500', async () => {
      mockDdb.send
        .mockResolvedValueOnce(pending('r6'))
        .mockRejectedValueOnce(new ConditionalCheckFailedException({ message: 'x', $metadata: {} }));
      const { handler } = await import('../src/respond-handler.js');
      const res = await handler(post(signToken('r6', 'approve', SECRET)), {} as any, () => {}) as any;
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Already decided');
    });
  });
});
