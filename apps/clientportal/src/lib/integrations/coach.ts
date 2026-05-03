/**
 * AI Coach integration — proxied through lambdas/coach-proxy.
 *
 * All Anthropic API calls go via VITE_COACH_PROXY_URL (a Lambda endpoint).
 * If that env var is unset the functions throw, same as before.
 */

import { SYSTEM_PROMPT_BASE, MONTH_PROMPTS, WEEKLY_CHECKIN_TEMPLATE } from '../coach/prompts.js';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type ProgramMonth = 1 | 2 | 3 | 4 | 'maintenance';

export type ProgramTier = 'foundation' | 'optimization' | 'longevity' | 'concierge';

export interface CoachContext {
  userId: string;
  workbookId: string;
  currentMonth: ProgramMonth;
  currentWeek: number;
  tier: ProgramTier;
  /** Most recent symptom domain scores, keyed by domain slug (0–10). */
  recentSymptomScores?: Record<string, number>;
  /** Product slugs the user is actively on. */
  activeProducts: string[];
}

export interface CoachMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface SuggestedAction {
  label: string;
  /** Opaque action string interpreted by the UI router, e.g. "open:workbook" */
  action: string;
  payload?: unknown;
}

export interface CoachReply {
  message: string;
  suggestedActions?: SuggestedAction[];
  /** When true, the UI should surface a "contact your clinician" banner. */
  clinicianEscalation?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type ProxyRole = 'user' | 'assistant';
interface ProxyMessage { role: ProxyRole; content: string }

function modelFor(tier: ProgramTier): 'claude-opus-4-7' | 'claude-sonnet-4-6' {
  return tier === 'concierge' ? 'claude-opus-4-7' : 'claude-sonnet-4-6';
}

function buildSystem(ctx: CoachContext): string {
  return `${SYSTEM_PROMPT_BASE}\n\n${MONTH_PROMPTS[ctx.currentMonth]}`;
}

function filterHistory(history: CoachMessage[]): ProxyMessage[] {
  return history
    .filter((m): m is CoachMessage & { role: 'user' | 'assistant' } => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as ProxyRole, content: m.content }));
}

async function callProxy(
  system: string,
  messages: ProxyMessage[],
  model: 'claude-opus-4-7' | 'claude-sonnet-4-6',
  maxTokens = 1024,
): Promise<string> {
  const url = import.meta.env.VITE_COACH_PROXY_URL as string | undefined;
  if (!url) throw new Error('VITE_COACH_PROXY_URL is not set — coach proxy not configured');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, model, maxTokens }),
  });

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json() as { error?: string }).error ?? ''; } catch { /* ignore */ }
    throw new Error(`Coach proxy ${res.status}: ${detail}`);
  }

  const data = await res.json() as { content: string };
  return data.content;
}

const FALLBACK_REPLY: CoachReply = {
  message: 'We\'re having trouble reaching the coach right now. Your care team has been notified.',
  clinicianEscalation: true,
};

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

export async function sendCheckIn(ctx: CoachContext, history: CoachMessage[]): Promise<CoachReply> {
  const scoreLines = Object.entries(ctx.recentSymptomScores ?? {})
    .map(([k, v]) => `  ${k}: ${v}/10`)
    .join('\n') || '  (none recorded)';

  const system = buildSystem(ctx);
  const userContent = WEEKLY_CHECKIN_TEMPLATE
    .replace('{{MONTH_PROMPT}}', MONTH_PROMPTS[ctx.currentMonth])
    .replace('{{CURRENT_WEEK}}', String(ctx.currentWeek))
    .replace('{{SYMPTOM_SCORES}}', scoreLines)
    .replace('{{ACTIVE_PRODUCTS}}', ctx.activeProducts.join(', ') || 'none');

  const messages: ProxyMessage[] = [
    ...filterHistory(history),
    { role: 'user', content: userContent },
  ];

  try {
    const message = await callProxy(system, messages, modelFor(ctx.tier));
    return { message };
  } catch {
    return FALLBACK_REPLY;
  }
}

export async function generateWeeklyReport(
  ctx: CoachContext,
  weekData: unknown,
): Promise<{ summary: string; nudges: string[]; clinicianAlerts: string[] }> {
  const system = buildSystem(ctx);
  const messages: ProxyMessage[] = [{
    role: 'user',
    content: `Generate a weekly progress report in JSON format with keys "summary" (string), "nudges" (string[]), "clinicianAlerts" (string[]). Week data: ${JSON.stringify(weekData)}`,
  }];

  try {
    const raw = await callProxy(system, messages, modelFor(ctx.tier));
    const parsed = JSON.parse(raw) as { summary: string; nudges: string[]; clinicianAlerts: string[] };
    return parsed;
  } catch {
    return { summary: 'Report unavailable — please check in with your care team.', nudges: [], clinicianAlerts: ['Report generation failed'] };
  }
}

export async function respondToMessage(
  ctx: CoachContext,
  history: CoachMessage[],
  userMessage: string,
): Promise<CoachReply> {
  const system = buildSystem(ctx);
  const messages: ProxyMessage[] = [
    ...filterHistory(history),
    { role: 'user', content: userMessage },
  ];

  try {
    const message = await callProxy(system, messages, modelFor(ctx.tier));
    return { message };
  } catch {
    return FALLBACK_REPLY;
  }
}

