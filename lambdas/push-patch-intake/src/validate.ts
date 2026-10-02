import { parseShipping, type Shipping } from './ship';

export interface PushPatchBody {
  sessionId: string;
  dob: string; // YYYY-MM-DD
  sex: string;
  phone: string;
  medications: string[];
  allergies: string[];
  conditions: string[];
  consentName: string;
  shipping: Shipping;
}

export type ValidationResult = { ok: true; body: PushPatchBody } | { ok: false; error: string };

const MAX_LIST = 50;

const str = (v: unknown, max = 200): string | null =>
  typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null;

function list(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length > MAX_LIST) return null;
  const out = v.map((x) => (typeof x === 'string' ? x.trim().slice(0, 200) : null));
  return out.every((x) => x !== null) ? (out as string[]).filter(Boolean) : null;
}

function validDob(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v) && d.getTime() < Date.now();
}

/** Parse + validate the parsed JSON body. Any missing or wrongly-typed field -> { ok: false }. */
export function validateBody(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid body' };
  const r = raw as Record<string, unknown>;
  const sessionId = str(r.sessionId);
  if (!sessionId) return { ok: false, error: 'sessionId required' };
  const dob = str(r.dob, 10);
  if (!dob || !validDob(dob)) return { ok: false, error: 'dob must be YYYY-MM-DD' };
  const sex = str(r.sex, 40);
  if (!sex) return { ok: false, error: 'sex required' };
  const phone = str(r.phone, 40);
  if (!phone) return { ok: false, error: 'phone required' };
  const medications = list(r.medications);
  const allergies = list(r.allergies);
  const conditions = list(r.conditions);
  if (!medications || !allergies || !conditions) {
    return { ok: false, error: 'medications, allergies and conditions must be lists' };
  }
  const consentName = str(r.consentName);
  if (!consentName) return { ok: false, error: 'consentName required' };
  const shipping = parseShipping(r.shipping);
  if (!shipping) return { ok: false, error: 'shipping must be confirmed or a valid US address' };
  return { ok: true, body: { sessionId, dob, sex, phone, medications, allergies, conditions, consentName, shipping } };
}
