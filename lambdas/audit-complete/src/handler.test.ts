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
  delete process.env.NURTURE_QUEUE_URL;
});

describe('audit-complete handler', () => {
  it('rejects missing contactId with 400', async () => {
    const res: any = await handler(evt({ scores: { gut: 3 }, top3: ['gut'] }));
    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects empty-string contactId with 400', async () => {
    const res: any = await handler(evt({ contactId: '   ', scores: {}, top3: [] }));
    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects invalid json with 400', async () => {
    const res: any = await handler(evt('{not json'));
    expect(res.statusCode).toBe(400);
  });

  it('writes UpdateCommand with correct expression on valid body', async () => {
    const scores = { gut: 4, weight: 2, hormones: 3 };
    const top3 = ['gut', 'hormones', 'weight'];
    const res: any = await handler(evt({ contactId: 'abc-123', scores, top3 }));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.TableName).toBe('Contact');
    expect(cmd.input.Key).toEqual({ contactId: 'abc-123' });
    expect(cmd.input.UpdateExpression).toBe(
      'SET auditCompletedAt = :ts, intakeAnswers = :scores, auditTop3 = :top3, updatedAt = :ts'
    );
    const vals = cmd.input.ExpressionAttributeValues;
    expect(vals[':scores']).toEqual(scores);
    expect(vals[':top3']).toEqual(top3);
    expect(typeof vals[':ts']).toBe('string');
    expect(new Date(vals[':ts']).toISOString()).toBe(vals[':ts']);
  });

  it('returns permissive CORS headers', async () => {
    const res: any = await handler(evt({ contactId: 'x', scores: {}, top3: [] }));
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  it('enqueues SQS nurture stage-1 message with DelaySeconds 900 (SQS max) when NURTURE_QUEUE_URL set', async () => {
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
