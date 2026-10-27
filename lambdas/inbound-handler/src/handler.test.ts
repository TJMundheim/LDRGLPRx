import { describe, it, expect, vi, beforeEach } from 'vitest';

const send = vi.hoisted(() => vi.fn());
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class { send = send; },
  GetObjectCommand: class { constructor(public input: unknown) {} },
}));
vi.mock('./parse', () => ({
  parseInbound: vi.fn(async () => ({ fromEmail: 'a@b.c', subject: 's', body: 'b', messageId: 'm' })),
  shouldSkip: vi.fn(() => 'test-skip'),
}));
vi.mock('./store', () => ({ resolveContact: vi.fn(), writeInbound: vi.fn(), loadHistory: vi.fn(), writeItem: vi.fn() }));
vi.mock('./draft', () => ({ draftReply: vi.fn() }));
vi.mock('./notify', () => ({ notifyTJ: vi.fn(), sendMail: vi.fn() }));

import { handler } from './handler';

const lambdaEvent = (action: Record<string, unknown>) => ({
  Records: [{ ses: { mail: { messageId: 'abc123', commonHeaders: {} }, receipt: { action } } }],
});
const LAMBDA_ACTION = { type: 'Lambda', functionArn: 'arn:aws:lambda:us-east-2:1:function:f', invocationType: 'Event' };

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ Body: { transformToString: async () => 'raw' } });
  delete process.env.INBOUND_BUCKET;
  delete process.env.INBOUND_PREFIX;
});

describe('inbound-handler S3 location', () => {
  it('uses env bucket + default mail/ prefix + messageId for the Lambda action shape', async () => {
    process.env.INBOUND_BUCKET = 'my4mlife-inbound-mail';
    await handler(lambdaEvent(LAMBDA_ACTION) as any);
    expect((send.mock.calls[0][0] as any).input).toEqual({ Bucket: 'my4mlife-inbound-mail', Key: 'mail/abc123' });
  });

  it('honors INBOUND_PREFIX override', async () => {
    process.env.INBOUND_BUCKET = 'bkt';
    process.env.INBOUND_PREFIX = 'in/';
    await handler(lambdaEvent(LAMBDA_ACTION) as any);
    expect((send.mock.calls[0][0] as any).input).toEqual({ Bucket: 'bkt', Key: 'in/abc123' });
  });

  it('prefers bucketName/objectKey when present on the action', async () => {
    process.env.INBOUND_BUCKET = 'ignored';
    await handler(lambdaEvent({ bucketName: 'b1', objectKey: 'k/1' }) as any);
    expect((send.mock.calls[0][0] as any).input).toEqual({ Bucket: 'b1', Key: 'k/1' });
  });

  it('logs one clear error and returns without throwing when INBOUND_BUCKET is missing', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(handler(lambdaEvent(LAMBDA_ACTION) as any)).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalledTimes(1);
    expect(String(err.mock.calls[0][0])).toContain('INBOUND_BUCKET');
    err.mockRestore();
  });
});
