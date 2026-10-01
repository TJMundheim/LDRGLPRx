// /api/approve — TJ's Approve / Deny, two-step.
// GET ?token=<t>  → confirm page only (NO side effects). Email link scanners (Outlook Safe Links,
//                   Gmail previews, corporate gateways) prefetch GET links; a GET must never act.
// POST token=<t>  → the confirm page's form submit records the decision.
import type { Handler } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { verifyToken } from './sign.js';
import { pages } from './pages.js';

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

const resp = (statusCode: number, body: string) => ({
  statusCode,
  headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  body,
});

function formToken(event: any): string | undefined {
  if (!event.body) return undefined;
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  return new URLSearchParams(raw).get('token') ?? undefined;
}

export const handler: Handler = async (event: any) => {
  const isPost = event.requestContext?.http?.method === 'POST';
  const token: string | undefined = isPost ? formToken(event) : event.queryStringParameters?.token;
  if (!token) return resp(400, pages.missing());

  let approvalId: string, action: 'approve' | 'deny';
  try {
    ({ approvalId, action } = verifyToken(token, await getHmacSecret()));
  } catch {
    return resp(400, pages.invalid());
  }
  if (!isPost) return resp(200, pages.confirm(action, token));

  const row = await ddb.send(new GetItemCommand({ TableName: TABLE, Key: { approvalId: { S: approvalId } } }));
  if (!row.Item) return resp(404, pages.notFound());

  const currentStatus = row.Item.status?.S ?? 'pending';
  if (currentStatus !== 'pending') return resp(200, pages.already(currentStatus, row.Item.respondedAt?.S ?? ''));

  const expiresAt = row.Item.expiresAt?.S;
  if (expiresAt && Date.parse(expiresAt) < Date.now()) return resp(410, pages.expired());

  try {
    await ddb.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: { approvalId: { S: approvalId } },
      UpdateExpression: 'SET #s = :s, respondedAt = :t, respondedVia = :v',
      ConditionExpression: '#s = :pending',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':s': { S: action === 'approve' ? 'approved' : 'denied' },
        ':t': { S: new Date().toISOString() },
        ':v': { S: 'email-link' },
        ':pending': { S: 'pending' },
      },
    }));
  } catch (e) {
    if (e instanceof ConditionalCheckFailedException) return resp(200, pages.raced());
    throw e;
  }
  return resp(200, action === 'approve' ? pages.approved() : pages.denied());
};
