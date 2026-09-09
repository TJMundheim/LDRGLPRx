// DynamoDB read/update for a draft item + the email-sender invoke that
// delivers it to the member once TJ approves.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONV_TABLE = process.env.CONVERSATIONS_TABLE ?? 'Conversations';
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const lambda = new LambdaClient({ region: REGION });

export interface DraftItem {
  contactId: string;
  sk: string;
  status: string;
  toEmail: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  sentAt?: string;
}

export async function getDraft(contactId: string, sk: string): Promise<DraftItem | null> {
  const res = await ddb.send(new GetCommand({ TableName: CONV_TABLE, Key: { contactId, sk } }));
  return (res.Item as DraftItem) ?? null;
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]);

export async function sendApprovedReply(item: DraftItem): Promise<string> {
  const html = item.body.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const res = await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ kind: 'info', to: item.toEmail, subject: item.subject, html, text: item.body })),
  }));
  const payload = res.Payload ? JSON.parse(new TextDecoder().decode(res.Payload)) : {};
  return payload?.id ?? '';
}

// Conditional on status still 'pending' — if TJ (or another request) already
// approved this draft, the condition fails and we treat it as already-sent
// rather than double-writing the 'out' record.
export async function markSentAndLog(item: DraftItem, sentMessageId: string): Promise<boolean> {
  const sentAt = new Date().toISOString();
  try {
    await ddb.send(new UpdateCommand({
      TableName: CONV_TABLE,
      Key: { contactId: item.contactId, sk: item.sk },
      UpdateExpression: 'SET #s = :sent, sentAt = :ts, sentMessageId = :mid',
      ConditionExpression: '#s = :pending',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':sent': 'sent', ':pending': 'pending', ':ts': sentAt, ':mid': sentMessageId },
    }));
  } catch (e: any) {
    if (e.name === 'ConditionalCheckFailedException') return false;
    throw e;
  }
  await ddb.send(new PutCommand({
    TableName: CONV_TABLE,
    Item: {
      contactId: item.contactId, sk: `${sentAt}#out#${sentMessageId || item.sk}`, direction: 'out', channel: 'email',
      subject: item.subject, body: item.body, inReplyTo: item.inReplyTo, approvedBy: 'tj', ts: sentAt,
    },
  }));
  return true;
}
