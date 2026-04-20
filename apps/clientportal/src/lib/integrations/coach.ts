/**
 * AI Coach integration — stub. Not implemented.
 *
 * This module defines the typed contract for the LDRGLPRx AI health coach,
 * which runs the 4M workbook program: weekly check-ins, content delivery,
 * motivational interviewing, and retention nudges.
 *
 * ── HOW TO WIRE UP ──────────────────────────────────────────────────────────
 * 1. Install the SDK:
 *      pnpm add @anthropic-ai/sdk
 *
 * 2. Set the env var in .env.local:
 *      VITE_ANTHROPIC_API_KEY=sk-ant-...
 *
 *    ⚠️  WARNING: Vite exposes VITE_* vars to the browser bundle. Never ship a
 *    real Anthropic API key to the client. Before going to production, proxy
 *    all Anthropic calls through a server-side Lambda endpoint (see
 *    lambdas/coach-proxy/) and remove the VITE_ANTHROPIC_API_KEY var entirely.
 *
 * 3. Import and instantiate:
 *      import Anthropic from '@anthropic-ai/sdk';
 *      const client = new Anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY });
 *
 * 4. Model selection per tier:
 *      ctx.tier === 'concierge' ? 'claude-opus-4-7' : 'claude-sonnet-4-6'
 *
 * 5. Replace each `throw new Error('Not implemented …')` body with a
 *    `client.messages.create(…)` call using prompts from
 *    `src/lib/coach/prompts.ts`.
 * ────────────────────────────────────────────────────────────────────────────
 */

import type { IntakeAnswer, IntakeResult } from '../data/intake.js';

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
  /** Full intake result from Discovery, if completed. */
  intakeResult?: IntakeResult;
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
// Functions
// ---------------------------------------------------------------------------

/**
 * Sends a daily or weekly check-in prompt to the AI coach and returns a reply.
 *
 * TODO: Wire up — use `WEEKLY_CHECKIN_TEMPLATE` from prompts.ts, pass
 * `ctx.recentSymptomScores` and month context; call Anthropic messages.create.
 */
export async function sendCheckIn(
  _ctx: CoachContext,
  _history: CoachMessage[],
): Promise<CoachReply> {
  throw new Error('Not implemented: sendCheckIn — wire to Anthropic SDK (see header comment)');
}

/**
 * Generates a weekly progress report with a narrative summary, retention nudges,
 * and any clinician alerts for the care team dashboard.
 *
 * TODO: Wire up — build a structured prompt from weekData + ctx, call Anthropic
 * messages.create, parse the JSON response into the return shape.
 */
export async function generateWeeklyReport(
  _ctx: CoachContext,
  _weekData: unknown,
): Promise<{ summary: string; nudges: string[]; clinicianAlerts: string[] }> {
  throw new Error('Not implemented: generateWeeklyReport — wire to Anthropic SDK (see header comment)');
}

/**
 * Handles freeform chat messages from the user in the coach chat UI.
 *
 * TODO: Wire up — prepend SYSTEM_PROMPT_BASE + month prompt, pass full history,
 * call Anthropic messages.create with streaming or single-shot, check
 * ESCALATION_RULES on reply content before returning.
 */
export async function respondToMessage(
  _ctx: CoachContext,
  _history: CoachMessage[],
  _userMessage: string,
): Promise<CoachReply> {
  throw new Error('Not implemented: respondToMessage — wire to Anthropic SDK (see header comment)');
}

/**
 * Produces the personalized "what we found, what we recommend, why" narrative
 * for the Discovery report page, based on raw intake answers and the computed
 * IntakeResult.
 *
 * TODO: Wire up — use INTAKE_REPORT_TEMPLATE from prompts.ts, call Anthropic
 * messages.create (sonnet-4-6 is sufficient here), return message.content[0].text.
 */
export async function generateIntakeReport(
  _answers: IntakeAnswer[],
  _result: IntakeResult,
): Promise<string> {
  throw new Error('Not implemented: generateIntakeReport — wire to Anthropic SDK (see header comment)');
}
