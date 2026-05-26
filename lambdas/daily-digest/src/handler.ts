import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { composeDigest, AgentRun, ApprovalRequest, Contact, Event } from './compose.js';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';
const TO_EMAIL = process.env.DIGEST_TO ?? 'drtj@my4mlife.com';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const lambda = new LambdaClient({ region: REGION });

async function scan<T>(TableName: string, FilterExpression: string, ExpressionAttributeNames: Record<string, string>, ExpressionAttributeValues: Record<string, unknown>): Promise<T[]> {
  const res = await ddb.send(new ScanCommand({ TableName, FilterExpression, ExpressionAttributeNames, ExpressionAttributeValues }));
  return (res.Items ?? []) as T[];
}

export const handler = async (): Promise<void> => {
  const now = new Date();
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const sevenDays = new Date(now.getTime() + 7 * 86_400_000).toISOString();

  const [runs, approvals, newProteges, upcomingEvents] = await Promise.all([
    scan<AgentRun>('AgentRuns', '#s >= :since', { '#s': 'startedAt' }, { ':since': since }),
    scan<ApprovalRequest>('ApprovalRequests', '#st = :pending', { '#st': 'status' }, { ':pending': 'pending' }),
    scan<Contact>('Contact', '#ls = :protege AND #ca >= :since', { '#ls': 'lifecycleStage', '#ca': 'createdAt' }, { ':protege': 'protege', ':since': since }),
    scan<Event>('Events', '#st = :scheduled AND #sa <= :week', { '#st': 'status', '#sa': 'startsAt' }, { ':scheduled': 'scheduled', ':week': sevenDays }),
  ]);

  const { markdown, html } = composeDigest(runs, approvals, newProteges, upcomingEvents, now);
  const dateLabel = now.toISOString().slice(0, 10);

  const payload = {
    kind: 'info',
    to: TO_EMAIL,
    subject: `My4MLife Daily Digest — ${dateLabel}`,
    html,
    text: markdown,
  };

  await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'Event',
    Payload: Buffer.from(JSON.stringify(payload)),
  }));
};
