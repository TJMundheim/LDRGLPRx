import type { PostAuthenticationTriggerHandler } from 'aws-lambda';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';

const ddb = new DynamoDBClient({});
const TABLE = process.env.USERS_TABLE!;

export const handler: PostAuthenticationTriggerHandler = async (event) => {
  const { userName, request } = event;
  const email = request.userAttributes.email;

  const { Item } = await ddb.send(
    new GetItemCommand({ TableName: TABLE, Key: { id: { S: userName } } }),
  );

  if (!Item) {
    // Defense-in-depth: create the row if it was somehow missed.
    await ddb.send(
      new PutItemCommand({
        TableName: TABLE,
        Item: {
          id: { S: userName },
          primaryEmail: { S: email },
          createdAt: { S: new Date().toISOString() },
        },
        ConditionExpression: 'attribute_not_exists(id)',
      }),
    );
  } else if (Item.primaryEmail?.S !== email) {
    await ddb.send(
      new UpdateItemCommand({
        TableName: TABLE,
        Key: { id: { S: userName } },
        UpdateExpression: 'SET primaryEmail = :e',
        ExpressionAttributeValues: { ':e': { S: email } },
      }),
    );
  }

  return event;
};
