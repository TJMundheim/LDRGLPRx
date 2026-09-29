// POST /api/chat — the AI front door. Validate, retrieve, answer, guard, store.
// No PHI in logs: only lengths, session id, exit and latency.
import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { invokeChat, type ChatMessage } from './bedrock';
import { guard } from './guard';
import { buildSystemPrompt } from './prompt';
import { retrieve } from './retrieve';
import { saveTurn } from './store';
import { reply, validateRequest, type ChatRequest } from './validate';
import { SAFE_FALLBACK } from './config';
import { applyRoute } from './route';
import { AGE_RETRY, PRICE_RETRY, ULTRA_RETRY } from './rules';

const RETRY_NOTE: Record<string, string> = { price: PRICE_RETRY, age: AGE_RETRY, ultra: ULTRA_RETRY };

export async function respond(req: ChatRequest) {
  const chunks = await retrieve(req.message);
  const system = buildSystemPrompt({ chunks, firstTurn: req.history.length === 0 });

  const messages: ChatMessage[] = [
    ...req.history.map((t) => ({ role: t.role, content: t.text })),
    { role: 'user' as const, content: req.message },
  ];

  let result = guard(await invokeChat(system, messages));
  // Up to two corrective rewrites for slips a rewrite reliably fixes (unpublished price, age bracket,
  // Ultra offered as available). Notes accumulate, so a second slip does not undo the first fix.
  const notes: string[] = [];
  for (let i = 0; i < 2 && result.blocked; i++) {
    const note = RETRY_NOTE[result.blockedBy ?? ''];
    if (!note || notes.includes(note)) break;
    notes.push(note);
    result = guard(await invokeChat(`${system}\n${notes.join('\n')}`, messages));
  }
  return applyRoute(result, req.message);
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = (event.headers?.['origin'] ?? event.headers?.['Origin']) as string | undefined;

  if (event.requestContext?.http?.method === 'OPTIONS') return reply(204, {}, origin);
  if (!event.body) return reply(400, { error: 'missing body' }, origin);

  let parsed: unknown;
  try { parsed = JSON.parse(event.body); } catch { return reply(400, { error: 'invalid json' }, origin); }

  const validated = validateRequest(parsed, randomUUID);
  if (!validated.ok) return reply(400, { error: validated.error }, origin);
  const req = validated.value;

  const started = Date.now();
  try {
    const result = await respond(req);
    await saveTurn({ sessionId: req.sessionId, question: req.message, answer: result.reply, exit: result.exit });

    console.log('front-door-chat turn', {
      sessionId: req.sessionId,
      messageLength: req.message.length,
      historyTurns: req.history.length,
      exit: result.exit,
      blocked: result.blocked,
      blockedBy: result.blockedBy ?? null,
      ms: Date.now() - started,
    });

    return reply(200, { ...stripInternal(result), sessionId: req.sessionId }, origin);
  } catch (e) {
    console.warn('front-door-chat failure', e instanceof Error ? e.message : 'unknown');
    return reply(200, {
      reply: SAFE_FALLBACK,
      links: [{ label: 'Book the free care coordinator call', url: 'https://my4mlife.com/consult' }],
      exit: 'consult',
      sessionId: req.sessionId,
    }, origin);
  }
};

function stripInternal(r: { reply: string; links: unknown; exit: unknown; blocked: boolean }) {
  return { reply: r.reply, links: r.links, exit: r.exit };
}
