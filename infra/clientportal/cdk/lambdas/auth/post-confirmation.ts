import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import {
  DynamoDBClient,
  PutItemCommand,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { upsertContact } from '../../../../../lambdas/_shared/contact-upsert/src/index';

const ddb = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddb);
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

  // Contact capture is best-effort: never block Cognito sign-up on it.
  try {
    const { given_name, phone_number } = request.userAttributes;
    await upsertContact(docClient, {
      email,
      ...(given_name ? { firstName: given_name } : {}),
      ...(phone_number ? { phone: phone_number } : {}),
      source: 'app-signup',
      stage: 'protege',
      protege: true,
      event: { type: 'app-signup' },
    });
  } catch (err) {
    console.error(JSON.stringify({
      event: 'contact_upsert_failed',
      handler: 'post-confirmation',
      error: err instanceof Error ? err.name : 'unknown',
    }));
  }

  return event;
};
