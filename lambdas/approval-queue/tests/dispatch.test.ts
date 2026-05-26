import { describe, it, expect, vi, beforeEach } from 'vitest';

const SECRET = 'test-secret-32-bytes-padded-xxxx';

// --- mocks ---
const mockDdb = { send: vi.fn() };
const mockSm  = { send: vi.fn() };
const mockLambda = { send: vi.fn() };

vi.mock('@aws-sdk/client-dynamodb', async () => {
  const actual = await vi.importActual('@aws-sdk/client-dynamodb');
  return {
    ...actual,
    DynamoDBClient: vi.fn(() => mockDdb),
  };
});
vi.mock('@aws-sdk/client-secrets-manager', async () => {
  const actual = await vi.importActual('@aws-sdk/client-secrets-manager');
  return {
    ...actual,
    SecretsManagerClient: vi.fn(() => mockSm),
  };
});
vi.mock('@aws-sdk/client-lambda', async () => {
  const actual = await vi.importActual('@aws-sdk/client-lambda');
  return {
    ...actual,
    LambdaClient: vi.fn(() => mockLambda),
  };
});

describe('dispatch-handler', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockSm.send.mockResolvedValue({ SecretString: JSON.stringify({ key: SECRET }) });
    mockDdb.send
      .mockResolvedValueOnce({ Item: { approvalId: { S: 'approval-1' }, status: { S: 'pending' } } }) // GetItem
      .mockResolvedValueOnce({}); // UpdateItem
    mockLambda.send.mockResolvedValue({ StatusCode: 200 });
  });

  it('happy path: sends email and updates DDB', async () => {
    const { handler } = await import('../src/dispatch-handler.js');
    const result = await handler(
      { approvalId: 'approval-1', summary: 'Send mass email?', preview: 'Dear members...' },
      {} as any, () => {}
    ) as any;

    expect(result.ok).toBe(true);
    expect(result.channel).toBe('email');
    expect(result.sentTo).toBeDefined();
    // Lambda (email-sender) was invoked
    expect(mockLambda.send).toHaveBeenCalledOnce();
    // DDB updated
    expect(mockDdb.send).toHaveBeenCalledTimes(2);
  });

  it('falls back to email when channel=sms and no SMS_ENDPOINT', async () => {
    delete process.env.SMS_ENDPOINT;
    const { handler } = await import('../src/dispatch-handler.js');
    const result = await handler(
      { approvalId: 'approval-1', summary: 'test', preview: 'body', channel: 'sms' },
      {} as any, () => {}
    ) as any;
    expect(result.channel).toBe('email');
    expect(mockLambda.send).toHaveBeenCalledOnce();
  });

  it('throws if row not found', async () => {
    mockDdb.send.mockReset();
    mockDdb.send.mockResolvedValueOnce({ Item: undefined });
    const { handler } = await import('../src/dispatch-handler.js');
    await expect(handler(
      { approvalId: 'missing', summary: 's', preview: 'p' },
      {} as any, () => {}
    )).rejects.toThrow('not found');
  });
});
