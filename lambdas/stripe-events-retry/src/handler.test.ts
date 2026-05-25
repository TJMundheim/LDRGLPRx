import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted so they're available in vi.mock factories
const {
  orderProcessEvent,
  refundProcessEvent,
  subscriptionProcessEvent,
  sqsSend,
  schedulerSend,
  ddbSend,
} = vi.hoisted(() => ({
  orderProcessEvent: vi.fn(),
  refundProcessEvent: vi.fn(),
  subscriptionProcessEvent: vi.fn(),
  sqsSend: vi.fn().mockResolvedValue({}),
  schedulerSend: vi.fn().mockResolvedValue({}),
  ddbSend: vi.fn().mockResolvedValue({}),
}));

vi.mock('@my4mlife/order-handler-core', () => ({ processEvent: orderProcessEvent }));
vi.mock('@my4mlife/refund-dispute-handler-core', () => ({ processEvent: refundProcessEvent }));
vi.mock('@my4mlife/subscription-handler-core', () => ({ processEvent: subscriptionProcessEvent }), { virtual: true });

// Mock stripe-client
vi.mock('@my4mlife/stripe-client', () => ({ getStripeClient: vi.fn().mockResolvedValue({}) }));

vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: vi.fn().mockImplementation(() => ({ send: sqsSend })),
  DeleteMessageCommand: vi.fn().mockImplementation((i) => ({ ...i, _cmd: 'DeleteMessage' })),
  SendMessageCommand: vi.fn().mockImplementation((i) => ({ ...i, _cmd: 'SendMessage' })),
}));

vi.mock('@aws-sdk/client-scheduler', () => ({
  SchedulerClient: vi.fn().mockImplementation(() => ({ send: schedulerSend })),
  CreateScheduleCommand: vi.fn().mockImplementation((i) => ({ ...i, _cmd: 'CreateSchedule' })),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({ send: ddbSend })),
  PutItemCommand: vi.fn().mockImplementation((i) => ({ ...i, _cmd: 'PutItem' })),
  DeleteItemCommand: vi.fn().mockImplementation((i) => ({ ...i, _cmd: 'DeleteItem' })),
  GetItemCommand: vi.fn().mockImplementation((i) => ({ ...i, _cmd: 'GetItem' })),
}));

import { handler, BACKOFF_LADDER } from './handler.js';

function makeSqsEvent(body: object) {
  return {
    Records: [{
      body: JSON.stringify(body),
      receiptHandle: 'rh-test-123',
    }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sqsSend.mockResolvedValue({});
  schedulerSend.mockResolvedValue({});
  ddbSend.mockResolvedValue({});
  process.env['DLQ_URL'] = 'https://sqs.us-east-2.amazonaws.com/123/dlq';
  process.env['PERMANENT_FAILURES_URL'] = 'https://sqs.us-east-2.amazonaws.com/123/pf';
  process.env['RETRY_STATE_TABLE'] = 'RetryState';
  process.env['SCHEDULER_ROLE_ARN'] = 'arn:aws:iam::123:role/scheduler-role';
  process.env['LAMBDA_ARN'] = 'arn:aws:lambda:us-east-2:123:function:my4mlife-stripe-events-retry';
});

describe('BACKOFF_LADDER', () => {
  it('exports the correct ladder', () => {
    expect(BACKOFF_LADDER).toEqual([60, 300, 1800, 7200, 43200]);
  });
});

describe('dispatch by type prefix', () => {
  it('(a+b+c) routes checkout.session.* to order-handler-core with {id,type,livemode}', async () => {
    orderProcessEvent.mockResolvedValueOnce(undefined);
    await handler(makeSqsEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false, attemptCount: 0 }) as any, {} as any, vi.fn());
    expect(orderProcessEvent).toHaveBeenCalledWith({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
  });

  it('(c) routes charge.refunded to refund-dispute-handler-core', async () => {
    refundProcessEvent.mockResolvedValueOnce(undefined);
    await handler(makeSqsEvent({ id: 'evt_2', type: 'charge.refunded', livemode: false, attemptCount: 0 }) as any, {} as any, vi.fn());
    expect(refundProcessEvent).toHaveBeenCalledWith({ id: 'evt_2', type: 'charge.refunded', livemode: false });
  });

  it('(c) routes charge.dispute.* to refund-dispute-handler-core', async () => {
    refundProcessEvent.mockResolvedValueOnce(undefined);
    await handler(makeSqsEvent({ id: 'evt_3', type: 'charge.dispute.created', livemode: false, attemptCount: 0 }) as any, {} as any, vi.fn());
    expect(refundProcessEvent).toHaveBeenCalledWith({ id: 'evt_3', type: 'charge.dispute.created', livemode: false });
  });
});

describe('(d) on success', () => {
  it('deletes RetryState row and deletes message from DLQ', async () => {
    orderProcessEvent.mockResolvedValueOnce(undefined);
    await handler(makeSqsEvent({ id: 'evt_ok', type: 'checkout.session.completed', livemode: false, attemptCount: 0 }) as any, {} as any, vi.fn());

    // DeleteItem for RetryState
    expect(ddbSend).toHaveBeenCalledWith(expect.objectContaining({ _cmd: 'DeleteItem' }));
    // DeleteMessage from DLQ
    expect(sqsSend).toHaveBeenCalledWith(expect.objectContaining({ _cmd: 'DeleteMessage', ReceiptHandle: 'rh-test-123' }));
    // No SendMessage to permanent failures
    const pfCall = sqsSend.mock.calls.find((c: any[]) => c[0]?.QueueUrl === process.env['PERMANENT_FAILURES_URL']);
    expect(pfCall).toBeUndefined();
  });
});

describe('(e) on failure with attemptCount < 5', () => {
  it('creates Scheduler entry with correct delay and does not re-throw', async () => {
    orderProcessEvent.mockRejectedValueOnce(new Error('core failure'));
    await expect(
      handler(makeSqsEvent({ id: 'evt_fail', type: 'checkout.session.completed', livemode: false, attemptCount: 1 }) as any, {} as any, vi.fn())
    ).resolves.not.toThrow();

    // Scheduler was called
    expect(schedulerSend).toHaveBeenCalledWith(expect.objectContaining({ _cmd: 'CreateSchedule' }));
    // RetryState updated
    expect(ddbSend).toHaveBeenCalledWith(expect.objectContaining({ _cmd: 'PutItem' }));
    // Message deleted from DLQ
    expect(sqsSend).toHaveBeenCalledWith(expect.objectContaining({ _cmd: 'DeleteMessage' }));
    // NOT sent to permanent failures
    const pfCall = sqsSend.mock.calls.find((c: any[]) => c[0]?.QueueUrl === process.env['PERMANENT_FAILURES_URL']);
    expect(pfCall).toBeUndefined();
  });
});

describe('(f) on failure with attemptCount >= 5', () => {
  it('sends to permanent-failures queue, logs, and does not re-throw', async () => {
    orderProcessEvent.mockRejectedValueOnce(new Error('permanent failure'));
    await expect(
      handler(makeSqsEvent({ id: 'evt_perm', type: 'checkout.session.completed', livemode: false, attemptCount: 5 }) as any, {} as any, vi.fn())
    ).resolves.not.toThrow();

    // Sent to permanent failures — check by SendMessage _cmd (QueueUrl isn't spread by mock constructor)
    const pfCall = sqsSend.mock.calls.find((c: any[]) => c[0]?._cmd === 'SendMessage');
    expect(pfCall).toBeDefined();
    // Message deleted from DLQ
    expect(sqsSend).toHaveBeenCalledWith(expect.objectContaining({ _cmd: 'DeleteMessage' }));
    // No scheduler entry
    expect(schedulerSend).not.toHaveBeenCalled();
  });
});
