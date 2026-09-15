import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { reply } from './helpers';
import { validateRequest } from './validate';
import { parseLog } from './bedrock';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = (event.headers?.['origin'] ?? event.headers?.['Origin']) as string | undefined;

  if (event.requestContext?.http?.method === 'OPTIONS') return reply(204, {}, origin);
  if (!event.body) return reply(400, { error: 'missing body' }, origin);

  let parsed: unknown;
  try { parsed = JSON.parse(event.body); } catch { return reply(400, { error: 'invalid json' }, origin); }

  const validated = validateRequest(parsed);
  if (!validated.ok) return reply(400, { error: validated.error }, origin);

  // No PHI logged — only sizes/ids.
  console.log('log-parse request', {
    textLength: validated.value.text.length,
    actionIds: validated.value.actions.map((a) => a.id),
    fieldIds: validated.value.fields.map((f) => f.id),
  });

  try {
    const result = await parseLog(validated.value);
    return reply(200, result, origin);
  } catch (e) {
    console.warn('log-parse model failure', e instanceof Error ? e.message : 'unknown');
    return reply(502, { error: 'model failure' }, origin);
  }
};
