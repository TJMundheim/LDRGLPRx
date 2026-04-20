import Anthropic from '@anthropic-ai/sdk';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

const ALLOWED_MODELS = ['claude-sonnet-4-6', 'claude-opus-4-7'] as const;
type AllowedModel = typeof ALLOWED_MODELS[number];

interface RequestBody {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  model: AllowedModel;
  maxTokens?: number;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.PORTAL_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function respond(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return respond(500, { error: 'ANTHROPIC_API_KEY not configured' });

  let body: RequestBody;
  try {
    body = JSON.parse(event.body ?? '{}') as RequestBody;
  } catch {
    return respond(400, { error: 'Invalid JSON body' });
  }

  const { system, messages, model, maxTokens = 1024 } = body;

  if (typeof system !== 'string' || !system.trim()) return respond(400, { error: 'system is required' });
  if (!Array.isArray(messages) || messages.length === 0) return respond(400, { error: 'messages must be a non-empty array' });
  if (!ALLOWED_MODELS.includes(model)) return respond(400, { error: `model must be one of: ${ALLOWED_MODELS.join(', ')}` });
  if (typeof maxTokens !== 'number' || maxTokens < 1 || maxTokens > 4096) return respond(400, { error: 'maxTokens must be 1–4096' });

  for (const m of messages) {
    if (!['user', 'assistant'].includes(m.role) || typeof m.content !== 'string') {
      return respond(400, { error: 'Each message must have role (user|assistant) and string content' });
    }
  }

  const client = new Anthropic({ apiKey });

  try {
    const msg = await client.messages.create({ model, max_tokens: maxTokens, system, messages });
    const content = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    return respond(200, { content });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Anthropic API error';
    return respond(502, { error: message });
  }
};
