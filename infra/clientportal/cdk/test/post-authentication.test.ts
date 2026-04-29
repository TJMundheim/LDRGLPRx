import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';

process.env.USERS_TABLE = 'Users';

const ddbMock = mockClient(DynamoDBClient);

const { handler } = await import('../lambdas/auth/post-authentication.js');

function makeEvent(userName = 'user-123', email = 'test@example.com') {
  return {
    userName,
    request: { userAttributes: { email } },
  } as any;
}

beforeEach(() => {
  ddbMock.reset();
});

describe('post-authentication handler', () => {
  it('does nothing when email is unchanged', async () => {
    ddbMock.on(GetItemCommand).resolves({
      Item: { id: { S: 'user-123' }, primaryEmail: { S: 'test@example.com' } },
    });

    const event = makeEvent();
    const result = await handler(event, {} as any, {} as any);
    expect(result).toBe(event);

    expect(ddbMock.commandCalls(UpdateItemCommand)).toHaveLength(0);
    expect(ddbMock.commandCalls(PutItemCommand)).toHaveLength(0);
  });

  it('calls UpdateItem when email has changed', async () => {
    ddbMock.on(GetItemCommand).resolves({
      Item: { id: { S: 'user-123' }, primaryEmail: { S: 'old@example.com' } },
    });
    ddbMock.on(UpdateItemCommand).resolves({});

    const event = makeEvent('user-123', 'new@example.com');
    await handler(event, {} as any, {} as any);

    const calls = ddbMock.commandCalls(UpdateItemCommand);
    expect(calls).toHaveLength(1);

    const input = calls[0].args[0].input;
    expect(input.TableName).toBe('Users');
    expect(input.Key?.id).toEqual({ S: 'user-123' });
    expect(input.ExpressionAttributeValues?.[':e']).toEqual({ S: 'new@example.com' });
  });

  it('calls PutItem when user row is missing (defense-in-depth)', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: undefined });
    ddbMock.on(PutItemCommand).resolves({});

    const event = makeEvent();
    await handler(event, {} as any, {} as any);

    const calls = ddbMock.commandCalls(PutItemCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input.Item?.primaryEmail).toEqual({ S: 'test@example.com' });
  });
});
