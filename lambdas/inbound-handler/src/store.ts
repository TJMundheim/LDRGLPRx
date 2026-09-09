// DynamoDB helpers for the concierge inbound flow (Contact lookup + Conversations rw).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';
const CONV_TABLE = process.env.CONVERSATIONS_TABLE ?? 'Conversations';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export interface HistoryItem { direction: string; body?: string }

export async function resolveContact(email: string): Promise<{ contactId: string; isProspect: boolean }> {
  const res = await ddb.send(new QueryCommand({
    TableName: CONTACT_TABLE,
    IndexName: 'byEmail',
    KeyConditionExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
    Limit: 1,
  }));
  const contactId = res.Items?.[0]?.contactId as string | undefined;
  if (contactId) return { contactId, isProspect: false };
  return { contactId: `prospect#${email}`, isProspect: true };
}

// Idempotent on sk — safe to call again if the Lambda retries.
export async function writeInbound(item: Record<string, unknown>): Promise<void> {
  await ddb.send(new PutCommand({ TableName: CONV_TABLE, Item: item, ConditionExpression: 'attribute_not_exists(sk)' }))
    .catch((e: any) => { if (e.name !== 'ConditionalCheckFailedException') throw e; });
}

export async function loadHistory(contactId: string): Promise<HistoryItem[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: CONV_TABLE,
    KeyConditionExpression: 'contactId = :c',
    ExpressionAttributeValues: { ':c': contactId },
    ScanIndexForward: false,
    Limit: 20,
  }));
  return ((res.Items ?? []) as HistoryItem[]).filter((m) => m.direction === 'in' || m.direction === 'out').reverse();
}

export async function writeItem(item: Record<string, unknown>): Promise<void> {
  await ddb.send(new PutCommand({ TableName: CONV_TABLE, Item: item }));
}
