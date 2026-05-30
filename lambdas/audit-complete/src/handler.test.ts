import { describe, it, expect, beforeEach, vi } from 'vitest';

const sendMock = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...args: any[]) => sendMock(...args) }) },
  UpdateCommand: class UpdateCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  },
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class DynamoDBClient { constructor(_: any) {} },
}));

const sqsSendMock = vi.fn();
vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: class { send = (...a: any[]) => sqsSendMock(...a); },
  SendMessageCommand: class { input: any; constructor(i: any) { this.input = i; } },
}));

const lambdaSendMock = vi.fn();
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class { send = (...a: any[]) => lambdaSendMock(...a); },
  InvokeCommand: class { input: any; constructor(i: any) { this.input = i; } },
}));

import { handler } from './handler';

function evt(body: any) {
  return {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {},
    requestContext: { http: { method: 'POST' } },
  } as any;
}

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({});
  sqsSendMock.mockReset();
  sqsSendMock.mockResolvedValue({ MessageId: 'm1' });
  lambdaSendMock.mockReset();
  lambdaSendMock.mockResolvedValue({});
  delete process.env.NURTURE_QUEUE_URL;
});

describe('audit-complete handler', () => {
  it('rejects missing contactId/email with 400', async () => {
    const res: any = await handler(evt({ scores: { gut: 3 }, top3: ['gut'] }));
    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects invalid json with 400', async () => {
    const res: any = await handler(evt('{not json'));
    expect(res.statusCode).toBe(400);
  });

  it('writes UpdateCommand with correct expression on valid body (contactId path)', async () => {
    const scores = { gut: 4, weight: 2, hormones: 3 };
    const top3 = ['gut', 'hormones', 'weight'];
    const res: any = await handler(evt({ contactId: 'abc-123', scores, top3 }));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ ok: true });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.TableName).toBe('Contact');
    expect(cmd.input.Key).toEqual({ contactId: 'abc-123' });
    expect(cmd.input.UpdateExpression).toBe(
      'SET auditCompletedAt = :ts, intakeAnswers = :scores, auditTop3 = :top3, updatedAt = :ts'
    );
    expect(cmd.input.ExpressionAttributeValues[':scores']).toEqual(scores);
    expect(cmd.input.ExpressionAttributeValues[':top3']).toEqual(top3);
  });

  it('derives contactId from email and invokes email-sender with correct payload', async () => {
    const top3 = [
      { id: 'gut-microbiome', label: 'Gut health / leaky gut', slug: 'gut', score: 5 },
      { id: 'sleep', label: 'Sleep / sleep optimization', slug: 'sleep', score: 4 },
      { id: 'cognitive', label: 'Cognitive / brain fog', slug: 'cognitive', score: 3 },
    ];
    const res: any = await handler(evt({
      email: 'Test-Debug@my4mlife.com',
      firstName: 'Sam',
      phone: '+15551234567',
      scores: { 'gut-microbiome': 5 },
      top3,
    }));
    expect(res.statusCode).toBe(200);

    // DDB write happened
    expect(sendMock).toHaveBeenCalledTimes(1);
    const ddbCmd = sendMock.mock.calls[0][0];
    expect(typeof ddbCmd.input.Key.contactId).toBe('string');
    expect(ddbCmd.input.Key.contactId.length).toBeGreaterThan(10);

    // Email-sender invoked
    expect(lambdaSendMock).toHaveBeenCalledTimes(1);
    const invokeCmd = lambdaSendMock.mock.calls[0][0];
    expect(invokeCmd.input.FunctionName).toBe('my4mlife-email-sender');
    expect(invokeCmd.input.InvocationType).toBe('Event');
    const payload = JSON.parse(Buffer.from(invokeCmd.input.Payload).toString('utf8'));
    expect(payload.kind).toBe('info');
    expect(payload.to).toBe('test-debug@my4mlife.com');
    expect(payload.subject).toContain('4M Assessment Results');
    expect(payload.subject).toContain('Sam');
    expect(payload.html).toContain('Gut health');
    expect(payload.html).toContain('protege-signup');
    expect(payload.html).not.toContain('consult-comprehensive');
  });

  it('does not fail the request when email-sender invoke throws', async () => {
    lambdaSendMock.mockRejectedValueOnce(new Error('boom'));
    const res: any = await handler(evt({
      email: 'x@example.com',
      firstName: 'X',
      top3: [],
    }));
    expect(res.statusCode).toBe(200);
  });

  it('skips email invoke when only contactId provided (no email)', async () => {
    const res: any = await handler(evt({ contactId: 'cid-only', top3: [] }));
    expect(res.statusCode).toBe(200);
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });

  it('returns permissive CORS headers', async () => {
    const res: any = await handler(evt({ contactId: 'x', scores: {}, top3: [] }));
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  it('enqueues SQS nurture stage-1 with DelaySeconds 900 when NURTURE_QUEUE_URL set', async () => {
    process.env.NURTURE_QUEUE_URL = 'https://sqs.us-east-2.amazonaws.com/123/my4mlife-nurture-queue';
    const res: any = await handler(evt({ contactId: 'cid-1', scores: {}, top3: [] }));
    expect(res.statusCode).toBe(200);
    expect(sqsSendMock).toHaveBeenCalledTimes(1);
    const cmd = sqsSendMock.mock.calls[0][0];
    expect(cmd.input.QueueUrl).toBe(process.env.NURTURE_QUEUE_URL);
    expect(cmd.input.DelaySeconds).toBe(900);
    expect(JSON.parse(cmd.input.MessageBody)).toEqual({ contactId: 'cid-1', stage: 1 });
  });

  it('skips SQS enqueue gracefully when NURTURE_QUEUE_URL unset', async () => {
    const res: any = await handler(evt({ contactId: 'cid-2', scores: {}, top3: [] }));
    expect(res.statusCode).toBe(200);
    expect(sqsSendMock).not.toHaveBeenCalled();
  });

  it('handles OPTIONS preflight without writing', async () => {
    const res: any = await handler({
      headers: {},
      requestContext: { http: { method: 'OPTIONS' } },
    } as any);
    expect(res.statusCode).toBe(204);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
