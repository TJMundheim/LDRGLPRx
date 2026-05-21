import { describe, it, expect, beforeEach, vi } from 'vitest';

const ddbSend = vi.fn();
const snsSend = vi.fn();
const fetchMock = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: any[]) => ddbSend(...a) }) },
  GetCommand: class { input: any; constructor(i: any) { this.input = i; } },
  UpdateCommand: class { input: any; constructor(i: any) { this.input = i; } },
  PutCommand: class { input: any; constructor(i: any) { this.input = i; } },
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class { constructor(_: any) {} },
}));
vi.mock('@aws-sdk/client-sns', () => ({
  SNSClient: class { send = (...a: any[]) => snsSend(...a); },
  PublishCommand: class { input: any; constructor(i: any) { this.input = i; } },
}));

vi.stubGlobal('fetch', (...a: any[]) => fetchMock(...a));

import { handler } from './handler';

function sqsEvent(contactId: string) {
  return { Records: [{ body: JSON.stringify({ contactId }) }] } as any;
}

beforeEach(() => {
  ddbSend.mockReset();
  snsSend.mockReset();
  fetchMock.mockReset();
  snsSend.mockResolvedValue({ MessageId: 'sns-1' });
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' });
  process.env.CONTACT_TABLE = 'Contact';
  process.env.TOUCHPOINTS_TABLE = 'Touchpoints';
  process.env.MAILGUN_DOMAIN = 'mg.my4mlife.com';
  process.env.MAILGUN_API_KEY = 'key-xxx';
  process.env.MAILGUN_FROM = 'concierge@my4mlife.com';
  process.env.INTRO_ZOOM_URL = 'https://zoom.example/intro';
});

describe('nurture-worker handler', () => {
  it('noops when contact lifecycle is consult-paid', async () => {
    ddbSend.mockResolvedValueOnce({ Item: { contactId: 'c1', lifecycleStage: 'consult-paid', email: 'a@b.com', phone: '+15551234567' } });
    const res = await handler(sqsEvent('c1'));
    expect(res).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(snsSend).not.toHaveBeenCalled();
    expect(ddbSend).toHaveBeenCalledTimes(1); // only GET
  });

  it('sends email + sms when lead with auditCompletedAt and not yet sent', async () => {
    ddbSend.mockResolvedValueOnce({
      Item: {
        contactId: 'c2', lifecycleStage: 'lead',
        email: 'lead@example.com', phone: '+15551112222',
        auditCompletedAt: '2026-05-19T00:00:00.000Z',
      },
    });
    ddbSend.mockResolvedValue({});
    const res = await handler(sqsEvent('c2'));
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('mg.my4mlife.com/messages');
    expect(snsSend).toHaveBeenCalledTimes(1);
    const cmds = ddbSend.mock.calls.map(c => c[0]);
    const update = cmds.find((c: any) => c.input.UpdateExpression);
    expect(update.input.UpdateExpression).toContain('nurtureSent');
    const puts = cmds.filter((c: any) => c.input.Item && c.input.Item.eventType);
    expect(puts.length).toBe(2);
    const types = puts.map((p: any) => p.input.Item.eventType).sort();
    expect(types).toEqual(['email-out', 'sms-out']);
  });

  it('noops when this stage has already fired (dedup via nurtureStage1Sent)', async () => {
    ddbSend.mockResolvedValueOnce({
      Item: { contactId: 'c3', lifecycleStage: 'lead', email: 'x@y.com', phone: '+15551234567', nurtureStage1Sent: true },
    });
    const res = await handler(sqsEvent('c3'));
    expect(res).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(snsSend).not.toHaveBeenCalled();
  });

  it('noops when contact missing', async () => {
    ddbSend.mockResolvedValueOnce({});
    const res = await handler(sqsEvent('missing'));
    expect(res).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('noops when contact banned', async () => {
    ddbSend.mockResolvedValueOnce({ Item: { contactId: 'c4', lifecycleStage: 'banned', email: 'b@b.com' } });
    const res = await handler(sqsEvent('c4'));
    expect(res).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(snsSend).not.toHaveBeenCalled();
  });
});
