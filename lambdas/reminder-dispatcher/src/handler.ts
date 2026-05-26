import { DynamoDBClient, ScanCommand, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { composeReminder, type ReminderKind } from './reminder-compose';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const ddb = new DynamoDBClient({ region: REGION });
const lambda = new LambdaClient({ region: REGION });

async function markReminder(reminderId: string, status: 'sent' | 'failed', extra: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { status, ...(status === 'sent' ? { sentAt: now } : {}), ...extra };
  const exprParts = Object.keys(updates).map((k) => `#${k} = :${k}`);
  const names = Object.fromEntries(Object.keys(updates).map((k) => [`#${k}`, k]));
  const values = marshall(Object.fromEntries(Object.keys(updates).map((k) => [`:${k}`, updates[k]])));
  await ddb.send(new UpdateItemCommand({
    TableName: 'EventReminders',
    Key: marshall({ reminderId }),
    UpdateExpression: `SET ${exprParts.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

export const handler = async () => {
  const now = new Date().toISOString();
  const scan = await ddb.send(new ScanCommand({
    TableName: 'EventReminders',
    FilterExpression: '#s = :sched AND scheduledFor <= :now',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: marshall({ ':sched': 'scheduled', ':now': now }),
  }));

  const reminders = (scan.Items ?? []).map((i) => unmarshall(i));
  let sent = 0, failed = 0;

  for (const rem of reminders) {
    const { reminderId, eventId, contactId, kind } = rem as { reminderId: string; eventId: string; contactId: string; kind: ReminderKind };
    try {
      const [evtRes, ctcRes] = await Promise.all([
        ddb.send(new GetItemCommand({ TableName: 'Events', Key: marshall({ eventId }) })),
        ddb.send(new GetItemCommand({ TableName: 'Contact', Key: marshall({ contactId }) })),
      ]);
      if (!evtRes.Item || !ctcRes.Item) throw new Error(`lookup failed: event=${!!evtRes.Item} contact=${!!ctcRes.Item}`);
      const evt = unmarshall(evtRes.Item) as { title: string; startsAt: string; joinUrl: string };
      const ctc = unmarshall(ctcRes.Item) as { firstName: string; email: string };
      const email = composeReminder({ kind, firstName: ctc.firstName, title: evt.title, startsAt: evt.startsAt, joinUrl: evt.joinUrl });
      await lambda.send(new InvokeCommand({
        FunctionName: 'my4mlife-email-sender',
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify({ kind: 'info', to: ctc.email, subject: email.subject, html: email.html, text: email.text })),
      }));
      await markReminder(reminderId, 'sent');
      sent++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await markReminder(reminderId, 'failed', { error: msg });
      failed++;
      console.error(`reminder ${reminderId} failed:`, msg);
    }
  }

  console.log(`reminder-dispatcher: processed=${reminders.length} sent=${sent} failed=${failed}`);
  return { processed: reminders.length, sent, failed };
};
