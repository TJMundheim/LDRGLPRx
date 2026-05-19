import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const sqs = new SQSClient({ region: REGION });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
};

function reply(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(204, {});
  if (!event.body) return reply(400, { error: 'missing body' });

  let parsed: { contactId?: unknown; scores?: unknown; top3?: unknown };
  try {
    parsed = JSON.parse(event.body);
  } catch {
    return reply(400, { error: 'invalid json' });
  }

  const { contactId, scores, top3 } = parsed;
  if (typeof contactId !== 'string' || contactId.trim() === '') {
    return reply(400, { error: 'contactId required' });
  }

  const ts = new Date().toISOString();

  await ddb.send(new UpdateCommand({
    TableName: CONTACT_TABLE,
    Key: { contactId },
    UpdateExpression: 'SET auditCompletedAt = :ts, intakeAnswers = :scores, auditTop3 = :top3, updatedAt = :ts',
    ExpressionAttributeValues: {
      ':ts': ts,
      ':scores': (scores && typeof scores === 'object') ? scores : {},
      ':top3': Array.isArray(top3) ? top3 : [],
    },
  }));

  const queueUrl = process.env.NURTURE_QUEUE_URL;
  if (queueUrl) {
    await sqs.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ contactId }),
      DelaySeconds: 1800,
    }));
  } else {
    console.warn('NURTURE_QUEUE_URL unset — skipping nurture enqueue');
  }

  return reply(200, { ok: true });
};
