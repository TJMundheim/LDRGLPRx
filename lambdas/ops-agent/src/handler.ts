import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';
import { runAgentLoop } from './agent-loop.js';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const BEDROCK_REGION = process.env.BEDROCK_REGION ?? 'us-east-2';
const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });
const ddb = new DynamoDBClient({ region: REGION });

const SYSTEM_PROMPT =
  'You are the My4MLife Ops Agent. You schedule Zooms, send reminders, manage event logistics. ' +
  'You have these tools: zoom_create_meeting, zoom_list_meetings, zoom_get_attendance, ddb_get_item, ddb_put_item, ddb_query, request_approval, send_email_via_email_sender. ' +
  'Before doing anything member-facing (mass emails, mass SMS), use the request_approval tool. ' +
  'Be concise. Log every decision.';

export interface OpsAgentEvent {
  intent: string;
  trigger: 'schedule' | 'intent' | 'webhook';
  context?: Record<string, unknown>;
}

export const handler = async (event: OpsAgentEvent) => {
  const runId = randomUUID();
  const startedAt = new Date().toISOString();

  await ddb.send(new PutItemCommand({
    TableName: 'AgentRuns',
    Item: marshall({
      runId,
      agentName: 'ops',
      status: 'running',
      startedAt,
      intent: event.intent,
      trigger: event.trigger,
      context: event.context ?? {},
    }),
  }));

  try {
    const result = await runAgentLoop({
      client: bedrock,
      modelId: MODEL_ID,
      systemPrompt: SYSTEM_PROMPT,
      intent: event.intent,
    });

    const completedAt = new Date().toISOString();
    await ddb.send(new UpdateItemCommand({
      TableName: 'AgentRuns',
      Key: marshall({ runId }),
      UpdateExpression: 'SET #s = :s, summary = :sum, toolCalls = :tc, completedAt = :ca',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: marshall({
        ':s': result.status,
        ':sum': result.finalText,
        ':tc': result.toolCalls,
        ':ca': completedAt,
      }),
    }));

    return { runId, status: result.status, summary: result.finalText };
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    await ddb.send(new UpdateItemCommand({
      TableName: 'AgentRuns',
      Key: marshall({ runId }),
      UpdateExpression: 'SET #s = :s, #err = :err, completedAt = :ca',
      ExpressionAttributeNames: { '#s': 'status', '#err': 'error' },
      ExpressionAttributeValues: marshall({ ':s': 'failed', ':err': err, ':ca': new Date().toISOString() }),
    }));
    throw e;
  }
};
