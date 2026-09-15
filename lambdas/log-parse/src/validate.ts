// Input validation for the log-parse request body. No PHI in error messages.

export interface ActionDef { id: string; label: string }
export interface FieldDef { id: string; label: string; unit?: string; min?: number; max?: number }

export interface LogParseRequest {
  text: string;
  date: string;
  actions: ActionDef[];
  fields: FieldDef[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ValidateResult =
  | { ok: true; value: LogParseRequest }
  | { ok: false; error: string };

function isActionDef(a: unknown): a is ActionDef {
  return !!a && typeof a === 'object' && typeof (a as any).id === 'string' && typeof (a as any).label === 'string';
}

function isFieldDef(f: unknown): f is FieldDef {
  if (!f || typeof f !== 'object') return false;
  const o = f as any;
  if (typeof o.id !== 'string' || typeof o.label !== 'string') return false;
  if (o.unit !== undefined && typeof o.unit !== 'string') return false;
  if (o.min !== undefined && typeof o.min !== 'number') return false;
  if (o.max !== undefined && typeof o.max !== 'number') return false;
  return true;
}

export function validateRequest(parsed: unknown): ValidateResult {
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'invalid body' };
  const o = parsed as any;

  if (typeof o.text !== 'string' || o.text.length === 0) return { ok: false, error: 'text required' };
  if (o.text.length > 600) return { ok: false, error: 'text too long' };

  if (typeof o.date !== 'string' || !DATE_RE.test(o.date)) return { ok: false, error: 'date must be YYYY-MM-DD' };

  if (!Array.isArray(o.actions) || !o.actions.every(isActionDef)) return { ok: false, error: 'invalid actions' };
  if (!Array.isArray(o.fields) || !o.fields.every(isFieldDef)) return { ok: false, error: 'invalid fields' };

  return { ok: true, value: { text: o.text, date: o.date, actions: o.actions, fields: o.fields } };
}
