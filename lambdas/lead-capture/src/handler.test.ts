import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v5 as uuidv5 } from 'uuid';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: sendMock }) },
  PutCommand: class PutCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  },
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class DynamoDBClient { constructor(_: any) {} },
}));

import { handler, NAMESPACE } from './handler';

function evt(body: any) {
  return { body: JSON.stringify(body), headers: {}, requestContext: {} } as any;
}

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({});
});

describe('lead-capture handler', () => {
  it('rejects missing email', async () => {
    const res: any = await handler(evt({ firstName: 'TJ' }));
    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects malformed email', async () => {
    const res: any = await handler(evt({ firstName: 'TJ', email: 'not-an-email' }));
    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects malformed phone (non-E.164)', async () => {
    const res: any = await handler(evt({ firstName: 'TJ', email: 'a@b.co', phone: '555-1212' }));
    expect(res.statusCode).toBe(400);
  });

  it('accepts E.164 phone (optional)', async () => {
    const res: any = await handler(evt({ firstName: 'TJ', email: 'a@b.co', phone: '+15551234567' }));
    expect(res.statusCode).toBe(200);
    const item = sendMock.mock.calls[0][0].input.Item;
    expect(item.phone).toBe('+15551234567');
  });

  it('accepts when phone omitted', async () => {
    const res: any = await handler(evt({ firstName: 'TJ', email: 'a@b.co' }));
    expect(res.statusCode).toBe(200);
    const item = sendMock.mock.calls[0][0].input.Item;
    expect(item.phone).toBeUndefined();
  });

  it('computes deterministic contactId via UUIDv5 from normalized lowercased email', async () => {
    const res: any = await handler(evt({ firstName: 'TJ', email: '  DrTJ@Essential.com ' }));
    expect(res.statusCode).toBe(200);
    const expected = uuidv5('drtj@essential.com', NAMESPACE);
    const body = JSON.parse(res.body);
    expect(body.contactId).toBe(expected);
    const item = sendMock.mock.calls[0][0].input.Item;
    expect(item.contactId).toBe(expected);
    expect(item.email).toBe('drtj@essential.com');
    expect(item.emailRaw).toBe('  DrTJ@Essential.com ');
  });

  it('writes Contact row with lifecycleStage=lead, consent.protege, timestamps, firstName', async () => {
    await handler(evt({ firstName: 'TJ', email: 'a@b.co' }));
    const cmd = sendMock.mock.calls[0][0];
    const item = cmd.input.Item;
    expect(item.lifecycleStage).toBe('lead');
    expect(item.firstName).toBe('TJ');
    expect(item.consent.protege.v).toBe('consent-protege-v1');
    expect(typeof item.consent.protege.at).toBe('string');
    expect(new Date(item.consent.protege.at).toISOString()).toBe(item.consent.protege.at);
    expect(typeof item.createdAt).toBe('string');
    expect(typeof item.updatedAt).toBe('string');
  });

  it('uses ConditionExpression that allows re-writing existing leads but not paid customers', async () => {
    await handler(evt({ firstName: 'TJ', email: 'a@b.co' }));
    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.ConditionExpression).toBe(
      'attribute_not_exists(contactId) OR lifecycleStage = :lead'
    );
    expect(cmd.input.ExpressionAttributeValues).toEqual({ ':lead': 'lead' });
  });
});
