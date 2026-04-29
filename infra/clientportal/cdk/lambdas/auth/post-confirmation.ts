import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import {
  DynamoDBClient,
  PutItemCommand,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';

const ddb = new DynamoDBClient({});
const TABLE = process.env.USERS_TABLE!;

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const { userName, request } = event;
  const email = request.userAttributes.email;

  const cmd = new PutItemCommand({
    TableName: TABLE,
    Item: {
      id: { S: userName },
      primaryEmail: { S: email },
      createdAt: { S: new Date().toISOString() },
    },
    ConditionExpression: 'attribute_not_exists(id)',
  });

  try {
    await ddb.send(cmd);
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      // User already exists — idempotent, ignore.
    } else {
      throw err;
    }
  }

  return event;
};
