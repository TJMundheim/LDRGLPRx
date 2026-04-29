import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBClient,
  PutItemCommand,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';

process.env.USERS_TABLE = 'Users';

// Must mock before importing the handler module.
const ddbMock = mockClient(DynamoDBClient);

const { handler } = await import('../lambdas/auth/post-confirmation.js');

function makeEvent(userName = 'user-123', email = 'test@example.com') {
  return {
    userName,
    request: { userAttributes: { email } },
  } as any;
}

beforeEach(() => {
  ddbMock.reset();
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
});
