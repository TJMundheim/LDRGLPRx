import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBClient,
  PutItemCommand,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';

process.env.USERS_TABLE = 'Users';

const upsertContact = vi.fn();
vi.mock('../../../../lambdas/_shared/contact-upsert/src/index', () => ({
  upsertContact: (...args: unknown[]) => upsertContact(...args),
}));

// Must mock before importing the handler module.
const ddbMock = mockClient(DynamoDBClient);

const { handler } = await import('../lambdas/auth/post-confirmation.js');

function makeEvent(
  userName = 'user-123',
  email = 'test@example.com',
  extra: Record<string, string> = {},
) {
  return {
    userName,
    request: { userAttributes: { email, ...extra } },
  } as any;
}

beforeEach(() => {
  ddbMock.reset();
  upsertContact.mockReset();
  upsertContact.mockResolvedValue(undefined);
});

describe('post-confirmation handler', () => {
  it('calls PutItem with correct TableName and Item fields', async () => {
    ddbMock.on(PutItemCommand).resolves({});

    const event = makeEvent();
    const result = await handler(event, {} as any, {} as any);

    expect(result).toBe(event);

    const calls = ddbMock.commandCalls(PutItemCommand);
    expect(calls).toHaveLength(1);

    const input = calls[0].args[0].input;
    expect(input.TableName).toBe('Users');
    expect(input.Item?.id).toEqual({ S: 'user-123' });
    expect(input.Item?.primaryEmail).toEqual({ S: 'test@example.com' });
    expect(input.Item?.createdAt?.S).toBeTruthy();
    expect(input.ConditionExpression).toBe('attribute_not_exists(id)');
  });

  it('ignores ConditionalCheckFailedException (idempotent re-run)', async () => {
    ddbMock.on(PutItemCommand).rejects(
      new ConditionalCheckFailedException({ message: 'exists', $metadata: {} }),
    );

    const event = makeEvent();
    await expect(handler(event, {} as any, {} as any)).resolves.toBe(event);
  });

  it('re-throws unexpected errors', async () => {
    ddbMock.on(PutItemCommand).rejects(new Error('network error'));

    await expect(handler(makeEvent(), {} as any, {} as any)).rejects.toThrow('network error');
  });

  describe('Contact capture', () => {
    it('upserts a protege Contact with email only when no other attrs', async () => {
      ddbMock.on(PutItemCommand).resolves({});
      await handler(makeEvent(), {} as any, {} as any);

      expect(upsertContact).toHaveBeenCalledTimes(1);
      const input = upsertContact.mock.calls[0][1];
      expect(input).toEqual({
        email: 'test@example.com',
        source: 'app-signup',
        stage: 'protege',
        protege: true,
        event: { type: 'app-signup' },
      });
    });

    it('passes given_name and a real phone_number', async () => {
      ddbMock.on(PutItemCommand).resolves({});
      await handler(
        makeEvent('u', 'a@b.co', { given_name: 'Ada', phone_number: '+15125550123' }),
        {} as any,
        {} as any,
      );
      expect(upsertContact.mock.calls[0][1]).toMatchObject({
        email: 'a@b.co',
        firstName: 'Ada',
        phone: '+15125550123',
        source: 'app-signup',
        stage: 'protege',
        protege: true,
        event: { type: 'app-signup' },
      });
    });

    it('sends no PHI-shaped keys', async () => {
      ddbMock.on(PutItemCommand).resolves({});
      await handler(makeEvent('u', 'a@b.co', { birthdate: '1970-01-01' }), {} as any, {} as any);
      expect(Object.keys(upsertContact.mock.calls[0][1]).sort()).toEqual(
        ['email', 'event', 'protege', 'source', 'stage'].sort(),
      );
    });

    it('still returns the event when upsertContact rejects, without logging the email', async () => {
      ddbMock.on(PutItemCommand).resolves({});
      upsertContact.mockRejectedValue(new Error('boom for test@example.com'));
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const event = makeEvent();
      await expect(handler(event, {} as any, {} as any)).resolves.toBe(event);
      expect(errSpy).toHaveBeenCalled();
      expect(JSON.stringify(errSpy.mock.calls)).not.toContain('test@example.com');
      errSpy.mockRestore();
    });

    it('captures the Contact even when the Users row already exists', async () => {
      ddbMock.on(PutItemCommand).rejects(
        new ConditionalCheckFailedException({ message: 'exists', $metadata: {} }),
      );
      await handler(makeEvent(), {} as any, {} as any);
      expect(upsertContact).toHaveBeenCalledTimes(1);
    });
  });
});
