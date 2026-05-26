import type { Handler } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { verifyToken } from './sign.js';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const TABLE = 'ApprovalRequests';
const HMAC_SECRET_ID = 'approval-queue-hmac-key';

const ddb = new DynamoDBClient({ region: REGION });
const sm = new SecretsManagerClient({ region: REGION });

let hmacSecret: string | null = null;
async function getHmacSecret(): Promise<string> {
  if (hmacSecret) return hmacSecret;
  const res = await sm.send(new GetSecretValueCommand({ SecretId: HMAC_SECRET_ID }));
  const val = JSON.parse(res.SecretString!);
  hmacSecret = typeof val === 'string' ? val : (val.key ?? Object.values(val)[0] as string);
  return hmacSecret!;
}

const html = (title: string, body: string, color = '#111') =>
  `<!doctype html><html><head><meta charset=utf-8><title>${title}</title></head><body style="font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;padding:24px;text-align:center"><h1 style="color:${color};font-size:24px">${title}</h1><p style="color:#555">${body}</p></body></html>`;

const resp = (statusCode: number, body: string) => ({
  statusCode, headers: { 'content-type': 'text/html; charset=utf-8' }, body,
});

export const handler: Handler = async (event: any) => {
  const qs = event.queryStringParameters ?? {};
  const token: string | undefined = qs.token;

  if (!token) return resp(400, html('Missing Token', 'No token provided.'));

  let approvalId: string, action: 'approve' | 'deny';
  try {
    const secret = await getHmacSecret();
    ({ approvalId, action } = verifyToken(token, secret));
  } catch {
    return resp(400, html('Invalid Token', 'This link is invalid or has been tampered with.', '#dc2626'));
  }

  const row = await ddb.send(new GetItemCommand({ TableName: TABLE, Key: { approvalId: { S: approvalId } } }));
  if (!row.Item) return resp(404, html('Not Found', 'Approval request not found.'));

  const currentStatus = row.Item.status?.S ?? 'pending';
  if (currentStatus !== 'pending') {
    const respondedAt = row.Item.respondedAt?.S ?? 'unknown time';
    const label = currentStatus === 'approved' ? 'approved' : 'denied';
    return resp(200, html(
      `Already ${label}`,
      `This approval was already ${label} at ${respondedAt}.`,
      currentStatus === 'approved' ? '#16a34a' : '#dc2626',
    ));
  }

  const now = new Date().toISOString();
  await ddb.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { approvalId: { S: approvalId } },
    UpdateExpression: 'SET #s = :s, respondedAt = :t, respondedVia = :v',
    ConditionExpression: '#s = :pending',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':s': { S: action === 'approve' ? 'approved' : 'denied' },
      ':t': { S: now },
      ':v': { S: 'email-link' },
      ':pending': { S: 'pending' },
    },
  }));

  if (action === 'approve') {
    return resp(200, html('&#x2705; Approved', 'The agent will continue with this action.', '#16a34a'));
  }
  return resp(200, html('&#x274C; Denied', 'The agent will not proceed.', '#dc2626'));
};
