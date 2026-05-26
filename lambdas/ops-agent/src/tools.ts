import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const ACCOUNT_ID = process.env.ACCOUNT_ID ?? '879696522760';

const ddb = new DynamoDBClient({ region: REGION });
const lambda = new LambdaClient({ region: REGION });

const ALLOWED_TABLES = ['Events', 'EventRSVPs', 'EventReminders', 'Contact'];

async function invokeLambda(functionName: string, payload: unknown): Promise<unknown> {
  const cmd = new InvokeCommand({
    FunctionName: functionName,
    Payload: Buffer.from(JSON.stringify(payload)),
  });
  const res = await lambda.send(cmd);
  const body = res.Payload ? JSON.parse(Buffer.from(res.Payload).toString()) : null;
  return body;
}

export const toolSchemas = [
  {
    name: 'zoom_create_meeting',
    description: 'Create a Zoom meeting via zoom-ops Lambda',
    inputSchema: { json: { type: 'object', properties: { topic: { type: 'string' }, startTime: { type: 'string' }, duration: { type: 'number' } }, required: ['topic'] } },
  },
  {
    name: 'zoom_list_meetings',
    description: 'List Zoom meetings via zoom-ops Lambda',
    inputSchema: { json: { type: 'object', properties: { userId: { type: 'string' } } } },
  },
  {
    name: 'zoom_get_attendance',
    description: 'Get Zoom meeting attendance via zoom-ops Lambda',
    inputSchema: { json: { type: 'object', properties: { meetingId: { type: 'string' } }, required: ['meetingId'] } },
  },
  {
    name: 'ddb_get_item',
    description: 'Get a DynamoDB item from allowed tables',
    inputSchema: { json: { type: 'object', properties: { tableName: { type: 'string' }, key: { type: 'object' } }, required: ['tableName', 'key'] } },
  },
  {
    name: 'ddb_put_item',
    description: 'Put a DynamoDB item into allowed tables',
    inputSchema: { json: { type: 'object', properties: { tableName: { type: 'string' }, item: { type: 'object' } }, required: ['tableName', 'item'] } },
  },
  {
    name: 'ddb_query',
    description: 'Query a DynamoDB table from allowed tables',
    inputSchema: { json: { type: 'object', properties: { tableName: { type: 'string' }, keyConditionExpression: { type: 'string' }, expressionAttributeValues: { type: 'object' } }, required: ['tableName', 'keyConditionExpression'] } },
  },
  {
    name: 'ddb_update_item',
    description: 'Update a DynamoDB item in allowed tables using UpdateExpression',
    inputSchema: { json: { type: 'object', properties: { tableName: { type: 'string' }, key: { type: 'object' }, updateExpression: { type: 'string' }, expressionAttributeValues: { type: 'object' }, expressionAttributeNames: { type: 'object' } }, required: ['tableName', 'key', 'updateExpression'] } },
  },
  {
    name: 'ddb_scan',
    description: 'Scan a DynamoDB table from allowed tables (max 200 items)',
    inputSchema: { json: { type: 'object', properties: { tableName: { type: 'string' }, filterExpression: { type: 'string' }, expressionAttributeValues: { type: 'object' }, expressionAttributeNames: { type: 'object' } }, required: ['tableName'] } },
  },
  {
    name: 'request_approval',
    description: 'Request TJ approval before member-facing mass actions (mass email, mass SMS, etc.)',
    inputSchema: { json: { type: 'object', properties: { action: { type: 'string' }, reason: { type: 'string' }, context: { type: 'object' } }, required: ['action', 'reason'] } },
  },
  {
    name: 'send_email_via_email_sender',
    description: 'Send an email via my4mlife-email-sender Lambda',
    inputSchema: { json: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } }, required: ['to', 'subject', 'body'] } },
  },
] as const;

function assertAllowedTable(tableName: string) {
  if (!ALLOWED_TABLES.includes(tableName)) {
    throw new Error(`Table "${tableName}" not in allowed list: ${ALLOWED_TABLES.join(', ')}`);
  }
}

export async function dispatchTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'zoom_create_meeting':
      return invokeLambda('my4mlife-zoom-ops', { action: 'createMeeting', input });
    case 'zoom_list_meetings':
      return invokeLambda('my4mlife-zoom-ops', { action: 'listMeetings', input });
    case 'zoom_get_attendance':
      return invokeLambda('my4mlife-zoom-ops', { action: 'getMeetingAttendance', input });
    case 'ddb_get_item': {
      assertAllowedTable(input.tableName as string);
      const res = await ddb.send(new GetItemCommand({ TableName: input.tableName as string, Key: marshall(input.key as Record<string, unknown>) }));
      return res.Item ? unmarshall(res.Item) : null;
    }
    case 'ddb_put_item': {
      assertAllowedTable(input.tableName as string);
      await ddb.send(new PutItemCommand({ TableName: input.tableName as string, Item: marshall(input.item as Record<string, unknown>) }));
      return { ok: true };
    }
    case 'ddb_query': {
      assertAllowedTable(input.tableName as string);
      const res = await ddb.send(new QueryCommand({
        TableName: input.tableName as string,
        KeyConditionExpression: input.keyConditionExpression as string,
        ExpressionAttributeValues: input.expressionAttributeValues ? marshall(input.expressionAttributeValues as Record<string, unknown>) : undefined,
      }));
      return (res.Items ?? []).map(i => unmarshall(i));
    }
    case 'ddb_update_item': {
      assertAllowedTable(input.tableName as string);
      await ddb.send(new UpdateItemCommand({
        TableName: input.tableName as string,
        Key: marshall(input.key as Record<string, unknown>),
        UpdateExpression: input.updateExpression as string,
        ExpressionAttributeValues: input.expressionAttributeValues ? marshall(input.expressionAttributeValues as Record<string, unknown>) : undefined,
        ExpressionAttributeNames: input.expressionAttributeNames as Record<string, string> | undefined,
      }));
      return { ok: true };
    }
    case 'ddb_scan': {
      assertAllowedTable(input.tableName as string);
      const res = await ddb.send(new ScanCommand({
        TableName: input.tableName as string,
        FilterExpression: input.filterExpression as string | undefined,
        ExpressionAttributeValues: input.expressionAttributeValues ? marshall(input.expressionAttributeValues as Record<string, unknown>) : undefined,
        ExpressionAttributeNames: input.expressionAttributeNames as Record<string, string> | undefined,
        Limit: 200,
      }));
      return (res.Items ?? []).map(i => unmarshall(i));
    }
    case 'request_approval': {
      const approvalId = randomUUID();
      const now = new Date().toISOString();
      await ddb.send(new PutItemCommand({
        TableName: 'ApprovalRequests',
        Item: marshall({ approvalId, action: input.action, reason: input.reason, context: input.context ?? {}, status: 'pending', createdAt: now }),
      }));
      try {
        await invokeLambda('my4mlife-approval-queue', { approvalId, action: input.action, reason: input.reason });
      } catch (e: unknown) {
        console.log('approval-queue not found, DDB row written:', approvalId, (e as Error).message);
      }
      return { approvalId, status: 'pending' };
    }
    case 'send_email_via_email_sender':
      return invokeLambda('my4mlife-email-sender', input);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
