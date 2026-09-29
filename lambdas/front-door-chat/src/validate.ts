// Request shape + CORS. Pure — no AWS calls.
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  ALLOWED_ORIGINS, MAX_HISTORY_CHARS, MAX_HISTORY_TURNS, MAX_MESSAGE_CHARS,
} from './config';

export interface Turn { role: 'user' | 'assistant'; text: string }
export interface ChatRequest { message: string; history: Turn[]; sessionId: string }

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
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

type Result = { ok: true; value: ChatRequest } | { ok: false; error: string };

export function validateRequest(input: unknown, newId: () => string): Result {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'body must be an object' };
  const b = input as Record<string, unknown>;

  const message = typeof b.message === 'string' ? b.message.trim() : '';
  if (!message) return { ok: false, error: 'message is required' };
  if (message.length > MAX_MESSAGE_CHARS) return { ok: false, error: `message exceeds ${MAX_MESSAGE_CHARS} characters` };

  const rawHistory = b.history === undefined ? [] : b.history;
  if (!Array.isArray(rawHistory)) return { ok: false, error: 'history must be an array' };
  if (rawHistory.length > MAX_HISTORY_TURNS) return { ok: false, error: `history exceeds ${MAX_HISTORY_TURNS} turns` };

  const history: Turn[] = [];
  let total = 0;
  for (const raw of rawHistory) {
    if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'history entries must be objects' };
    const t = raw as Record<string, unknown>;
    if (t.role !== 'user' && t.role !== 'assistant') return { ok: false, error: 'history role must be user or assistant' };
    if (typeof t.text !== 'string') return { ok: false, error: 'history text must be a string' };
    total += t.text.length;
    if (total > MAX_HISTORY_CHARS) return { ok: false, error: `history exceeds ${MAX_HISTORY_CHARS} characters` };
    history.push({ role: t.role, text: t.text });
  }

  const sessionId = typeof b.sessionId === 'string' && UUID_V4.test(b.sessionId) ? b.sessionId : newId();
  return { ok: true, value: { message, history, sessionId } };
}
