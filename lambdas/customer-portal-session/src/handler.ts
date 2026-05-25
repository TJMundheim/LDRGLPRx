import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getStripeClient } from '@my4mlife/stripe-client';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const REGION = 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';
const RETURN_URL = process.env.PORTAL_RETURN_URL ?? 'https://app.my4mlife.com/';

const ddb = new DynamoDBClient({ region: REGION });

function reply(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

async function getIsDemo(contactId: string): Promise<boolean> {
  const res = await ddb.send(new GetItemCommand({
    TableName: CONTACT_TABLE,
    Key: { contactId: { S: contactId } },
    ProjectionExpression: 'isDemo',
  }));
  return res.Item?.isDemo?.BOOL ?? false;
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  // Auth check — JWT authorizer must be present
  const claims = (event.requestContext as any)?.authorizer?.jwt?.claims as Record<string, string> | undefined;
  if (!claims) return reply(401, { error: 'unauthorized' });

  // Parse body
  let body: { customerId?: string } = {};
  try { body = JSON.parse(event.body ?? '{}'); } catch { return reply(400, { error: 'invalid JSON' }); }

  const { customerId } = body;
  if (!customerId) return reply(400, { error: 'customerId required' });

  // Verify caller identity — JWT must carry matching stripeCustomerId
  const jwtCustomerId = claims['custom:stripeCustomerId'];
  if (!jwtCustomerId || jwtCustomerId !== customerId) {
    return reply(403, { error: 'forbidden' });
  }

  // Derive mode from Contact.isDemo — NEVER from request body
  const isDemo = await getIsDemo(customerId);
  const modeOverride: 'live' | 'test' = isDemo ? 'test' : 'live';

  const stripe = await getStripeClient({ modeOverride });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: RETURN_URL,
    });
    return reply(200, { url: session.url });
  } catch (e: any) {
    return reply(500, { error: e.message ?? 'stripe error' });
  }
};
