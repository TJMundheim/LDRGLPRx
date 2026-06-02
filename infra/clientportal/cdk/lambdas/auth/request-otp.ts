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
      const userAttributes: Array<{ Name: string; Value: string }> = [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ];
      if (firstName) userAttributes.push({ Name: 'given_name', Value: firstName });
      const created = await cognito.send(new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: userAttributes,
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
    if (!auth.Session) {
      console.error(JSON.stringify({ event: 'initiate_auth_no_session', email }));
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ status: 'error', message: 'Auth service did not return a session. Please try again in a moment.' }) };
    }
    console.log(JSON.stringify({ event: 'otp_initiated', email }));
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ status: 'sent', session: auth.Session }) };
  } catch (authErr: unknown) {
    const name = (authErr as { name?: string }).name ?? '';
    const msg = authErr instanceof Error ? authErr.message : String(authErr);
    console.error(JSON.stringify({ event: 'initiate_auth_error', email, name, error: msg }));
    // Cognito rate-limit (too many in-flight challenges for this user). NEVER auto-retry:
    // a retry triggers a second InitiateAuth → second code → duplicate OTPs in user's inbox.
    if (name === 'LimitExceededException' || msg.includes('LimitExceededException')) {
      return { statusCode: 429, headers: CORS, body: JSON.stringify({ status: 'rate_limited', message: 'A code was recently sent. Please check your inbox (and spam folder) before requesting another.' }) };
    }
    if (name === 'NotAuthorizedException' || msg.includes('NotAuthorizedException')) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ status: 'error', message: 'Account not allowed to sign in. Contact support.' }) };
    }
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ status: 'error', message: 'Failed to send code. Please try again in a moment.' }) };
  }
};
