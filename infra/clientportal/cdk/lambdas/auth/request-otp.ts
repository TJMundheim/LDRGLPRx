import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminCreateUserCommand,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const cognito = new CognitoIdentityProviderClient({});
const dynamo = new DynamoDBClient({});

const USER_POOL_ID = process.env.USER_POOL_ID ?? '';
const APP_CLIENT_ID = process.env.APP_CLIENT_ID ?? '';
const USERS_TABLE = process.env.USERS_TABLE ?? 'Users';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const handler = async (event: { body?: string; email?: string; firstName?: string }) => {
  let body: { email?: string; firstName?: string };
  try {
    body = event.body ? JSON.parse(event.body) : event;
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ status: 'error', message: 'Invalid JSON' }) };
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const firstName = (body.firstName ?? '').trim();

  if (!isValidEmail(email)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ status: 'error', message: 'Invalid email address' }) };
  }

  // Ensure user exists in Cognito
  let userSub: string | undefined;
  try {
    const existing = await cognito.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: email }));
    userSub = existing.UserAttributes?.find((a) => a.Name === 'sub')?.Value;
  } catch (err: unknown) {
    const code = (err as { name?: string }).name;
    if (code !== 'UserNotFoundException') {
      console.error(JSON.stringify({ event: 'admin_get_user_error', email, error: String(err) }));
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ status: 'error', message: 'Auth service error' }) };
    }
    // User does not exist — create them
    try {
      const created = await cognito.send(new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
        ],
        MessageAction: 'SUPPRESS',
      }));
      userSub = created.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;
      console.log(JSON.stringify({ event: 'user_created', email, sub: userSub }));

      // Write to DynamoDB Users table (idempotent)
      if (userSub) {
        await dynamo.send(new PutItemCommand({
          TableName: USERS_TABLE,
          Item: {
            id: { S: userSub },
            primaryEmail: { S: email },
            name: { S: firstName },
            createdAt: { S: new Date().toISOString() },
          },
          ConditionExpression: 'attribute_not_exists(id)',
        })).catch((dbErr: unknown) => {
          // ConditionalCheckFailed = already exists, safe to ignore
          if ((dbErr as { name?: string }).name !== 'ConditionalCheckFailedException') {
            console.error(JSON.stringify({ event: 'dynamo_put_error', email, error: String(dbErr) }));
          }
        });
      }
    } catch (createErr: unknown) {
      console.error(JSON.stringify({ event: 'admin_create_user_error', email, error: String(createErr) }));
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ status: 'error', message: 'Could not create account' }) };
    }
  }

  // Trigger OTP via CUSTOM_AUTH
  try {
    const auth = await cognito.send(new InitiateAuthCommand({
      AuthFlow: 'CUSTOM_AUTH',
      ClientId: APP_CLIENT_ID,
      AuthParameters: { USERNAME: email },
    }));
    if (!auth.Session) throw new Error('No session returned');
    console.log(JSON.stringify({ event: 'otp_initiated', email }));
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ status: 'sent', session: auth.Session }) };
  } catch (authErr: unknown) {
    const msg = authErr instanceof Error ? authErr.message : String(authErr);
    console.error(JSON.stringify({ event: 'initiate_auth_error', email, error: msg }));
    // SES sandbox / unverified recipient — Cognito still creates the challenge but OTP may not deliver
    if (msg.includes('LimitExceededException') || msg.includes('NotAuthorized')) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ status: 'queued' }) };
    }
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ status: 'error', message: 'Failed to send code' }) };
  }
};
