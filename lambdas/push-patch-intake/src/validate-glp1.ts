// GLP-1 lane pre-pay body: { lane, skuId, autoShip, screening, health: Glp1Health, signature, contact, t? }.
import { isGlp1Sku } from '@my4mlife/push-patch-checkout';
import { str, list, validDob } from './validate';

export interface Glp1Health {
  dob: string; sex: 'female' | 'male'; heightFt: number; heightIn: number; weightLb: number; goalWeightLb?: number;
  conditions: string[]; safetyHistory: string[]; priorGlp1: 'never' | 'current' | 'past'; priorGlp1Drug?: string; priorGlp1Dose?: string;
  interactingMeds: string[]; otherMeds: string; allergies: string;
}
export interface Glp1PreIntakeBody {
  email: string; firstName: string; lastName: string; phone: string; skuId: string; autoShip: boolean;
  screening: unknown; health: Glp1Health; consentName: string; testToken?: unknown;
}
export type Glp1Result = { ok: true; body: Glp1PreIntakeBody } | { ok: false; error: string };

const num = (v: unknown, min: number, max: number): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null);
const ageYears = (dob: string) => (Date.now() - Date.parse(`${dob}T00:00:00Z`)) / (365.25 * 86400000);

/** BMI to one decimal from feet, inches and pounds. */
export const bmi = (ft: number, inch: number, lb: number): number => Math.round((703 * lb) / (ft * 12 + inch) ** 2 * 10) / 10;

export function validateGlp1PreIntake(raw: unknown): Glp1Result {
  const r = (raw ?? {}) as Record<string, any>;
  const c = r.contact ?? {};
  const email = str(c.email, 254)?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'valid email required' };
  const firstName = str(c.firstName, 100), lastName = str(c.lastName, 100), phone = str(c.phone, 40);
  if (!firstName || !lastName) return { ok: false, error: 'firstName and lastName required' };
  if (!phone) return { ok: false, error: 'phone required' };
  const skuId = str(r.skuId, 80);
  if (!skuId || !isGlp1Sku(skuId)) return { ok: false, error: 'skuId must be a GLP-1 product' };
  if (typeof r.autoShip !== 'boolean') return { ok: false, error: 'autoShip must be true or false' };
  if (!r.screening || typeof r.screening !== 'object') return { ok: false, error: 'screening required' };
  const consentName = str(r.signature?.typedName);
  if (!consentName) return { ok: false, error: 'signature required' };
  const h = r.health ?? {};
  const dob = str(h.dob, 10);
  if (!dob || !validDob(dob)) return { ok: false, error: 'dob must be YYYY-MM-DD' };
  if (ageYears(dob) < 18) return { ok: false, error: 'not eligible' };
  const heightFt = num(h.heightFt, 3, 8), heightIn = num(h.heightIn, 0, 11), weightLb = num(h.weightLb, 50, 800);
  if (heightFt === null || heightIn === null || weightLb === null) return { ok: false, error: 'height and weight required' };
  const goalWeightLb = h.goalWeightLb === undefined ? undefined : num(h.goalWeightLb, 50, 800);
  if (goalWeightLb === null) return { ok: false, error: 'goalWeightLb out of range' };
  const conditions = list(h.conditions), safetyHistory = list(h.safetyHistory), interactingMeds = list(h.interactingMeds);
  if (!conditions || !safetyHistory || !interactingMeds) return { ok: false, error: 'conditions, safetyHistory and interactingMeds must be lists' };
  const otherMeds = str(h.otherMeds, 500), allergies = str(h.allergies, 500);
  if (!otherMeds || !allergies) return { ok: false, error: "otherMeds and allergies required ('none' or text)" };
  if (h.sex !== 'female' && h.sex !== 'male') return { ok: false, error: 'sex must be female or male' };
  if (!['never', 'current', 'past'].includes(h.priorGlp1)) return { ok: false, error: 'priorGlp1 must be never, current or past' };
  const drug = str(h.priorGlp1Drug, 100), dose = str(h.priorGlp1Dose, 100);
  const health: Glp1Health = {
    dob, sex: h.sex, heightFt, heightIn, weightLb, ...(goalWeightLb === undefined ? {} : { goalWeightLb }),
    conditions, safetyHistory, priorGlp1: h.priorGlp1, ...(drug ? { priorGlp1Drug: drug } : {}), ...(dose ? { priorGlp1Dose: dose } : {}),
    interactingMeds, otherMeds, allergies,
  };
  return { ok: true, body: { email, firstName, lastName, phone, skuId, autoShip: r.autoShip, screening: r.screening, health, consentName, ...(r.t === undefined ? {} : { testToken: r.t }) } };
}
