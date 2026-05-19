import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v5 as uuidv5 } from 'uuid';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';

// Fixed UUIDv4 namespace for deterministic contactId = uuidv5(lower(trim(email)), NAMESPACE).
// Do not change once leads exist in production.
export const NAMESPACE = 'f0e1d2c3-b4a5-4968-87a6-95c4d3e2f1a0';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RE = /^\+[1-9]\d{6,14}$/;

function reply(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext && (event as any).requestContext.http?.method === 'OPTIONS') {
    return reply(204, {});
  }

  let body: any;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return reply(400, { error: 'invalid JSON body' });
  }

  const emailRaw: string | undefined = body.email;
  if (!emailRaw || typeof emailRaw !== 'string') return reply(400, { error: 'email required' });
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return reply(400, { error: 'malformed email' });

  const phone: string | undefined = body.phone ? String(body.phone).trim() : undefined;
  if (phone !== undefined && phone !== '' && !E164_RE.test(phone)) {
    return reply(400, { error: 'phone must be E.164 (e.g. +15551234567)' });
  }

  const firstName: string | undefined =
    body.firstName && typeof body.firstName === 'string' ? body.firstName.trim() : undefined;

  const contactId = uuidv5(email, NAMESPACE);
  const ts = new Date().toISOString();

  const Item: Record<string, unknown> = {
    contactId,
    email,
    emailRaw,
    firstName,
    lifecycleStage: 'lead',
    consent: { protege: { v: 'consent-protege-v1', at: ts } },
    createdAt: ts,
    updatedAt: ts,
  };
  if (phone) Item.phone = phone;

  try {
    await ddb.send(new PutCommand({
      TableName: CONTACT_TABLE,
      Item,
      ConditionExpression: 'attribute_not_exists(contactId) OR lifecycleStage = :lead',
      ExpressionAttributeValues: { ':lead': 'lead' },
    }));
  } catch (e: any) {
    if (e?.name === 'ConditionalCheckFailedException') {
      // Already a paid customer — accept silently, do not downgrade.
      return reply(200, { contactId });
    }
    return reply(500, { error: 'write failed' });
  }

  return reply(200, { contactId });
};
