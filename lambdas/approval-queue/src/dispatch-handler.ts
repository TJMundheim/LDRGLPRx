import type { Handler } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { signToken } from './sign.js';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const TABLE = 'ApprovalRequests';
const BASE_URL = process.env.APPROVAL_BASE_URL ?? 'https://api.my4mlife.com';
const APPROVAL_TO = process.env.APPROVAL_TO ?? 'drtj@my4mlife.com';
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';
const HMAC_SECRET_ID = 'approval-queue-hmac-key';

const ddb = new DynamoDBClient({ region: REGION });
const sm = new SecretsManagerClient({ region: REGION });
const lambda = new LambdaClient({ region: REGION });

let hmacSecret: string | null = null;
async function getHmacSecret(): Promise<string> {
  if (hmacSecret) return hmacSecret;
  const res = await sm.send(new GetSecretValueCommand({ SecretId: HMAC_SECRET_ID }));
  const val = JSON.parse(res.SecretString!);
  hmacSecret = typeof val === 'string' ? val : (val.key ?? Object.values(val)[0] as string);
  return hmacSecret!;
}

function approvalEmail(summary: string, preview: string, approveUrl: string, denyUrl: string): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c: string) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]!);
  return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#111;font-size:20px">Action Required: Approval Needed</h2>
  <p style="color:#333">${esc(summary)}</p>
  <div style="background:#f4f4f5;border-left:4px solid #666;padding:16px;margin:16px 0;white-space:pre-wrap;font-size:13px;color:#444">${esc(preview)}</div>
  <div style="margin-top:24px">
    <a href="${approveUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:12px">&#x2705; Approve</a>
    <a href="${denyUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">&#x274C; Deny</a>
  </div>
  <p style="color:#888;font-size:12px;margin-top:24px">This link expires in 24 hours. — My4MLife Ops Agent</p>
</div>`;
}

export const handler: Handler = async (event: any) => {
  const { approvalId, summary, preview, channel = 'email', expiresInHours = 24 } = event;
  if (!approvalId || !summary || !preview) throw new Error('approvalId, summary, preview required');

  // Load row (must exist)
  const row = await ddb.send(new GetItemCommand({ TableName: TABLE, Key: { approvalId: { S: approvalId } } }));
  if (!row.Item) throw new Error(`ApprovalRequests row not found: ${approvalId}`);

  const secret = await getHmacSecret();
  const expiresAt = new Date(Date.now() + expiresInHours * 3600_000).toISOString();
  const approveUrl = `${BASE_URL}/api/approve?token=${signToken(approvalId, 'approve', secret)}`;
  const denyUrl    = `${BASE_URL}/api/approve?token=${signToken(approvalId, 'deny', secret)}`;

  // Resolve channel (v1: email only; sms falls back to email)
  let resolvedChannel = channel;
  if (channel === 'sms' && !process.env.SMS_ENDPOINT) {
    console.warn('[approval-queue] SMS requested but SMS_ENDPOINT not configured — falling back to email');
    resolvedChannel = 'email';
  }

  if (resolvedChannel === 'email') {
    const html = approvalEmail(summary, preview, approveUrl, denyUrl);
    await lambda.send(new InvokeCommand({
      FunctionName: EMAIL_SENDER_FN,
      Payload: Buffer.from(JSON.stringify({ kind: 'info', to: APPROVAL_TO, subject: '[My4MLife] Approval Needed', html })),
    }));
  }

  // Update ApprovalRequests row
  await ddb.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { approvalId: { S: approvalId } },
    UpdateExpression: 'SET sentTo = :to, expiresAt = :exp',
    ExpressionAttributeValues: { ':to': { S: APPROVAL_TO }, ':exp': { S: expiresAt } },
  }));

  return { ok: true, channel: resolvedChannel, sentTo: APPROVAL_TO, expiresAt };
};
