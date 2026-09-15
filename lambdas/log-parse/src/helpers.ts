import type { APIGatewayProxyResultV2 } from 'aws-lambda';

const ALLOWED_ORIGINS = new Set([
  'https://my4mlife.com',
  'https://www.my4mlife.com',
  'https://app.my4mlife.com',
  'http://localhost:4321',
  'http://localhost:5173',
]);

export function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://my4mlife.com';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
}

export function reply(status: number, body: unknown, origin?: string): APIGatewayProxyResultV2 {
  return { statusCode: status, headers: corsHeaders(origin), body: JSON.stringify(body) };
}
