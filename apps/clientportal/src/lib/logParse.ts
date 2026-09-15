/**
 * Client for the /api/log-parse endpoint — turns one sentence of plain English
 * ("fasted walk 30 minutes, protein after, skipped strength") into the day's
 * adherence actions + numeric fields.
 *
 * The endpoint itself is a Lambda (Bedrock-backed) built separately. This
 * module owns ONLY the request/response contract, the schema the UI sends, and
 * typed failure modes.
 */

import { moveForWeek } from './program.js';

const API_BASE =
  (import.meta.env.VITE_LEAD_CAPTURE_API_URL as string | undefined) ??
  'https://v9svm8ds74.execute-api.us-east-2.amazonaws.com';

export const LOG_PARSE_URL = `${API_BASE}/api/log-parse`;

const TIMEOUT_MS = 10_000;

export interface LogAction { id: string; label: string }
export interface LogField { id: string; label: string; unit: string; min: number; max: number; step?: number }

export interface LogSchema {
  actions: LogAction[];
  fields: LogField[];
}

export interface LogParseRequest extends LogSchema {
  text: string;
  date: string;
}

export interface LogParseResult {
  /** true = did it, false = explicitly skipped, null = not mentioned */
  actions: Record<string, boolean | null>;
  fields: Record<string, number | null>;
  notes: string;
  unclear: string[];
}

export type LogParseErrorKind = 'empty' | 'timeout' | 'network' | 'http' | 'bad-response';

export class LogParseError extends Error {
  readonly kind: LogParseErrorKind;
  readonly status?: number;
  constructor(kind: LogParseErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'LogParseError';
    this.kind = kind;
    this.status = status;
  }
}

// ── The schema the UI sends up ──────────────────────────────────────────────

/** The 5 standing actions, every week. */
const STANDING: LogAction[] = [
  { id: 'biome-ns-ultra', label: 'Biome NS Ultra' },
  { id: 'eating-window', label: 'Eating window' },
  { id: 'protein-breakfast', label: 'Protein-first' },
  { id: 'strength', label: 'Strength' },
  { id: 'fasted-walk', label: 'Fasted walk' },
];

export const LOG_FIELDS: LogField[] = [
  { id: 'sleepHours', label: 'Sleep', unit: 'hrs', min: 3, max: 12, step: 0.5 },
  { id: 'walkMinutes', label: 'Walk', unit: 'min', min: 0, max: 180, step: 5 },
  { id: 'proteinGrams', label: 'Protein', unit: 'g', min: 0, max: 120, step: 5 },
  { id: 'strengthMinutes', label: 'Strength', unit: 'min', min: 0, max: 120, step: 5 },
];

/**
 * Actions + numeric fields for the member's current program week: the 5
 * standing actions plus this week's Move when it isn't already one of them.
 */
export function todaysSchema(week: number): LogSchema {
  const move = moveForWeek(week);
  const actions = STANDING.slice();
  if (!actions.some(a => a.id === move.actionId)) {
    actions.push({ id: move.actionId, label: move.title });
  }
  return { actions, fields: LOG_FIELDS.map(f => ({ ...f })) };
}

// ── Call ────────────────────────────────────────────────────────────────────

function coerceActions(raw: unknown, schema: LogAction[]): Record<string, boolean | null> {
  const src = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const out: Record<string, boolean | null> = {};
  for (const a of schema) {
    const v = src[a.id];
    out[a.id] = v === true ? true : v === false ? false : null;
  }
  return out;
}

function coerceFields(raw: unknown, schema: LogField[]): Record<string, number | null> {
  const src = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const out: Record<string, number | null> = {};
  for (const f of schema) {
    const v = src[f.id];
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    out[f.id] = Number.isFinite(n) ? Math.min(f.max, Math.max(f.min, n)) : null;
  }
  return out;
}

/** POST the sentence + schema; returns a fully-populated, clamped result. */
export async function parseDayLog(
  text: string,
  date: string,
  schema: LogSchema,
): Promise<LogParseResult> {
  const trimmed = (text ?? '').trim();
  if (!trimmed) throw new LogParseError('empty', 'Say or type something first.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(LOG_PARSE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, date, actions: schema.actions, fields: schema.fields }),
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = controller.signal.aborted || (e as Error)?.name === 'AbortError';
    throw new LogParseError(
      aborted ? 'timeout' : 'network',
      aborted ? 'That took too long. Try again.' : "Couldn't reach the server. Try again.",
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new LogParseError('http', `Server returned ${res.status}. Try again.`, res.status);
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new LogParseError('bad-response', "Couldn't read the reply. Try again.");
  }
  if (!json || typeof json !== 'object') {
    throw new LogParseError('bad-response', "Couldn't read the reply. Try again.");
  }

  return {
    actions: coerceActions(json.actions, schema.actions),
    fields: coerceFields(json.fields, schema.fields),
    notes: typeof json.notes === 'string' ? json.notes : '',
    unclear: Array.isArray(json.unclear) ? json.unclear.filter((u: unknown) => typeof u === 'string') : [],
  };
}
