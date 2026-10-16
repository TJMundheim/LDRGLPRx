// Push Patch health form: client validation + payload collection, shared by the landing-page
// dialog (pre-payment) and the thank-you page (legacy post-payment form).
// Rules and messages match the original thank-you form; "Enter a valid email address." is new.
// HealthForm.astro bundles this and exposes it as window.PPHealth for the pages' inline scripts.

export interface HealthPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  dob: string;
  sex: string;
  phone: string;
  medications: string[];
  allergies: string[];
  conditions: string[];
  consentName: string;
  privacyAck: true;
}

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const REQUIRED = 'This field is required.';
const KEYS = ['first', 'last', 'email', 'dob', 'sex', 'phone', 'medications', 'allergies', 'conditions', 'privacy', 'consent'];

const el = (id: string): Field | null => document.getElementById(id) as Field | null;
const val = (id: string): string => el(id)?.value ?? '';
const lines = (v: string): string[] => v.split(/\r?\n|;/).map((x) => x.trim()).filter(Boolean);

export function setError(id: string, msg: string): void {
  const e = document.getElementById(id);
  if (e) e.textContent = msg;
}

export function clearHealthErrors(): void {
  KEYS.forEach((k) => setError('e-' + k, ''));
}

/** Date of birth cannot be in the future. */
export function setDobMax(): void {
  const dob = el('f-dob') as HTMLInputElement | null;
  if (!dob) return;
  const t = new Date();
  t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
  dob.max = t.toISOString().slice(0, 10);
}

/** Validates every health field present in the DOM. Shows errors, focuses the first bad field, returns ok. */
export function validateHealth(): boolean {
  clearHealthErrors();
  let ok = true;
  let first: Field | null = null;
  const bad = (key: string, msg: string): void => {
    setError('e-' + key, msg);
    ok = false;
    if (!first) first = el('f-' + (key === 'first' ? 'first' : key === 'last' ? 'last' : key));
  };

  if (el('f-first') && !val('f-first').trim()) bad('first', REQUIRED);
  if (el('f-last') && !val('f-last').trim()) bad('last', REQUIRED);
  if (el('f-email')) {
    const em = val('f-email').trim();
    if (!em) bad('email', REQUIRED);
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) bad('email', 'Enter a valid email address.');
  }

  const d = val('f-dob');
  const dd = d ? new Date(d + 'T00:00:00') : null;
  if (!d) bad('dob', REQUIRED);
  else if (!dd || isNaN(dd.getTime()) || dd > new Date() || dd.getFullYear() < 1900) bad('dob', 'Enter your date of birth as month, day, year.');

  if (!val('f-sex')) bad('sex', REQUIRED);

  const ph = val('f-phone').trim();
  const digits = ph.replace(/\D/g, '');
  if (!ph) bad('phone', REQUIRED);
  else if (digits.length < 10 || digits.length > 15 || !/^[+\d\s().-]+$/.test(ph)) bad('phone', 'Enter a valid mobile number.');

  ['medications', 'allergies', 'conditions'].forEach((k) => {
    if (!val('f-' + k).trim()) bad(k, REQUIRED);
  });
  if (!(el('f-privacy') as HTMLInputElement | null)?.checked) bad('privacy', 'Please check this box to continue.');
  if (!val('f-consent').trim()) bad('consent', 'Type your full legal name to continue.');

  (first as Field | null)?.focus();
  return ok;
}

/** Reads the (already validated) form into the API payload fields. */
export function collectHealth(): HealthPayload {
  const p: HealthPayload = {
    dob: val('f-dob'),
    sex: val('f-sex'),
    phone: val('f-phone').trim(),
    medications: lines(val('f-medications')),
    allergies: lines(val('f-allergies')),
    conditions: lines(val('f-conditions')),
    consentName: val('f-consent').trim(),
    privacyAck: true,
  };
  if (el('f-first')) p.firstName = val('f-first').trim();
  if (el('f-last')) p.lastName = val('f-last').trim();
  if (el('f-email')) p.email = val('f-email').trim();
  return p;
}

export function initHealthForm(): void {
  setDobMax();
  (window as unknown as { PPHealth?: unknown }).PPHealth = { validateHealth, collectHealth, clearHealthErrors, setError, setDobMax };
}
