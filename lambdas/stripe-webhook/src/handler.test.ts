import { describe, it, expect, beforeEach, vi } from 'vitest';

const ddbSendMock = vi.fn();
const snsSendMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...args: any[]) => ddbSendMock(...args) }) },
  PutCommand: class { input: any; constructor(input: any) { this.input = input; } },
  UpdateCommand: class { input: any; constructor(input: any) { this.input = input; } },
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class { constructor(_: any) {} } }));
vi.mock('@aws-sdk/client-sns', () => ({
  SNSClient: class { send(...args: any[]) { return snsSendMock(...args); } },
  PublishCommand: class { input: any; constructor(input: any) { this.input = input; } },
}));

vi.mock('stripe', () => {
  const StripeMock: any = class {
    webhooks = {
      constructEvent: (body: string) => JSON.parse(body),
    };
  };
  return { default: StripeMock };
});

vi.stubGlobal('fetch', fetchMock);

import { handler } from './handler';

function evt(body: any) {
  return {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'stripe-signature': 'sig' },
    requestContext: { http: { method: 'POST' } },
  } as any;
}

function consultEvent(eventId = 'evt_1') {
  return {
    id: eventId,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_1',
        customer: 'cus_1',
        payment_intent: 'pi_1',
        subscription: null,
        amount_subtotal: 50000,
        amount_total: 50000,
        currency: 'usd',
        total_details: { amount_discount: 0 },
        metadata: { contactId: 'c_1', skuIds: 'comprehensive-consult' },
        customer_details: { email: 'a@b.com', phone: '+15555550100' },
      },
    },
  };
}

beforeEach(() => {
  ddbSendMock.mockReset();
  snsSendMock.mockReset();
  fetchMock.mockReset();
  ddbSendMock.mockResolvedValue({});
  snsSendMock.mockResolvedValue({ MessageId: 'sns-1' });
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'mg-1' }) });
  process.env.STRIPE_SECRET_KEY = 'sk_test';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  process.env.MAILGUN_DOMAIN = 'mg.example.com';
  process.env.MAILGUN_API_KEY = 'key-x';
  process.env.MAILGUN_FROM = 'no-reply@example.com';
  process.env.ONBOARDING_BOOKING_URL = 'https://book.example.com/tj';
});

describe('stripe-webhook consult confirmation', () => {
  it('sends exactly one mailgun email + one SNS publish on consult purchase', async () => {
    const res: any = await handler(evt(consultEvent('evt_1')));
    expect(res.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(snsSendMock).toHaveBeenCalledTimes(1);
    const mgCall = fetchMock.mock.calls[0];
    expect(mgCall[0]).toContain('mg.example.com/messages');
    const snsInput = snsSendMock.mock.calls[0][0].input;
    expect(snsInput.PhoneNumber).toBe('+15555550100');
    expect(snsInput.Message).toContain('https://book.example.com/tj');
  });

  it('is idempotent: rerunning same stripe event sends zero additional', async () => {
    await handler(evt(consultEvent('evt_dup')));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(snsSendMock).toHaveBeenCalledTimes(1);

    // Now: sentinel put fails conditional check (second run)
    ddbSendMock.mockReset();
    fetchMock.mockClear();
    snsSendMock.mockClear();
    ddbSendMock.mockImplementation((cmd: any) => {
      if (cmd.input?.ConditionExpression && cmd.input?.Item?.eventType === 'consult-confirmation') {
        const err: any = new Error('exists'); err.name = 'ConditionalCheckFailedException';
        return Promise.reject(err);
      }
      return Promise.resolve({});
    });
    const res: any = await handler(evt(consultEvent('evt_dup')));
    expect(res.statusCode).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(snsSendMock).not.toHaveBeenCalled();
  });

  it('skips email+sms when no consult sku in metadata', async () => {
    const ev = consultEvent('evt_no_consult');
    ev.data.object.metadata.skuIds = 'biome-ns-ultra';
    const res: any = await handler(evt(ev));
    expect(res.statusCode).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(snsSendMock).not.toHaveBeenCalled();
  });
});
