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

  it('sends email + sms when lifecycleStage is protege (assessment completers are Protégés)', async () => {
    ddbSend.mockResolvedValueOnce({
      Item: { contactId: 'c5', lifecycleStage: 'protege', email: 'p@example.com', phone: '+15551112222' },
    });
    ddbSend.mockResolvedValue({});
    const res = await handler(sqsEvent('c5'));
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(snsSend).toHaveBeenCalledTimes(1);
  });

  it('still noops for customers (only lead or protege are nurtured)', async () => {
    ddbSend.mockResolvedValueOnce({ Item: { contactId: 'c6', lifecycleStage: 'customer', email: 'c@example.com', phone: '+15551112222' } });
    await handler(sqsEvent('c6'));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(snsSend).not.toHaveBeenCalled();
  });

  it('noops when contact banned', async () => {
    ddbSend.mockResolvedValueOnce({ Item: { contactId: 'c4', lifecycleStage: 'banned', email: 'b@b.com' } });
    const res = await handler(sqsEvent('c4'));
    expect(res).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(snsSend).not.toHaveBeenCalled();
  });
  describe('topCategories', () => {
    async function run(extra: Record<string, unknown>) {
      ddbSend.mockResolvedValueOnce({ Item: { contactId: 'cx', lifecycleStage: 'lead', email: 'l@e.com', phone: '+15551112222', firstName: 'Sam', ...extra } });
      ddbSend.mockResolvedValue({});
      await handler(sqsEvent('cx'));
      return String(fetchMock.mock.calls[0][1].body);
    }
    const bodyText = (form: string) => new URLSearchParams(form).get('text') ?? '';

    it('derives categories from the tags string set, ignoring non-category tags', async () => {
      const text = bodyText(await run({ tags: new Set(['gut', 'sleep', 'push-patch']) }));
      expect(text).toContain('came back as: Gut, Sleep.');
      expect(text).not.toContain('push-patch');
    });

    it('accepts tags as an array too', async () => {
      const text = bodyText(await run({ tags: ['push-patch', 'weight', 'erectile-dysfunction'] }));
      expect(text).toContain('came back as: Weight, Erectile dysfunction.');
    });

    it('falls back to legacy auditTop3 when tags carry no category', async () => {
      const text = bodyText(await run({ tags: new Set(['push-patch']), auditTop3: ['Gut', 'Hormones'] }));
      expect(text).toContain('came back as: Gut, Hormones.');
    });

    it('still reads legacy auditTop3 with no tags at all', async () => {
      const text = bodyText(await run({ auditTop3: ['Gut', 'Sleep'] }));
      expect(text).toContain('came back as: Gut, Sleep.');
    });

    it('uses the "your priorities" fallback when nothing is known', async () => {
      const text = bodyText(await run({ tags: new Set(['push-patch']) }));
      expect(text).toContain('came back as: your priorities.');
    });
  });
});
