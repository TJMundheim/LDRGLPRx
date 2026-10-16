import { isPushPatchSku } from '@my4mlife/push-patch-checkout';
import { parseShipping, type Shipping } from './ship';

/** The health-form fields shared by the legacy post-payment POST and the pre-intake POST. */
export interface HealthFields {
  dob: string; // YYYY-MM-DD
  sex: string;
  phone: string;
  medications: string[];
  allergies: string[];
  conditions: string[];
  consentName: string;
  privacyAck: true;
}

export interface PushPatchBody extends HealthFields {
  sessionId: string;
  shipping: Shipping;
}

export interface PreIntakeBody extends HealthFields {
  email: string;
  firstName: string;
  lastName: string;
  skuId: string;
  screening: unknown;
  testToken?: unknown;
}

export type ValidationResult = { ok: true; body: PushPatchBody } | { ok: false; error: string };
export type PreIntakeResult = { ok: true; body: PreIntakeBody } | { ok: false; error: string };
type Health = { ok: true; fields: HealthFields } | { ok: false; error: string };

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

/** Validate the health-form fields (dob through privacyAck) of an already-parsed object. */
export function validateHealth(r: Record<string, unknown>): Health {
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
  if (r.privacyAck !== true) return { ok: false, error: 'privacyAck required' };
  return { ok: true, fields: { dob, sex, phone, medications, allergies, conditions, consentName, privacyAck: true } };
}

/** Parse + validate the parsed JSON body. Any missing or wrongly-typed field -> { ok: false }. */
export function validateBody(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid body' };
  const r = raw as Record<string, unknown>;
  const sessionId = str(r.sessionId);
  if (!sessionId) return { ok: false, error: 'sessionId required' };
  const h = validateHealth(r);
  if (!h.ok) return h;
  const shipping = parseShipping(r.shipping);
  if (!shipping) return { ok: false, error: 'shipping must be confirmed or a valid US address' };
  return { ok: true, body: { sessionId, ...h.fields, shipping } };
}

/** Pre-payment POST: identity + sku + screening answers + the health form. Screening is evaluated by the caller. */
export function validatePreIntake(raw: unknown): PreIntakeResult {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid body' };
  const r = raw as Record<string, unknown>;
  const email = str(r.email, 254)?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'valid email required' };
  const firstName = str(r.firstName, 100);
  const lastName = str(r.lastName, 100);
  if (!firstName || !lastName) return { ok: false, error: 'firstName and lastName required' };
  const skuId = str(r.skuId, 80);
  if (!skuId || !isPushPatchSku(skuId)) return { ok: false, error: 'skuId must be a push-patch blend' };
  if (!r.screening || typeof r.screening !== 'object') return { ok: false, error: 'screening required' };
  const h = validateHealth(r);
  if (!h.ok) return h;
  return { ok: true, body: { email, firstName, lastName, skuId, screening: r.screening, ...h.fields, ...(r.testToken === undefined ? {} : { testToken: r.testToken }) } };
}
