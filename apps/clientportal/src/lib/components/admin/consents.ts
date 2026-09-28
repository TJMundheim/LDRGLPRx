/**
 * consents — pure parse/checklist helpers for the HIPAA consent map stored on
 * a PatientRecord (`consents` AWSJSON field).
 *
 * No network calls, no Svelte state — plain functions so they can be unit
 * tested directly and reused from PatientsAdmin.svelte.
 */

export interface ConsentEntry {
  version?: string;
  at?: string;
  typedName?: string;
  legalVersion?: string;
}

export type ConsentsMap = Record<string, ConsentEntry>;

export interface ConsentChecklistItem {
  id: string;
  label: string;
  required: boolean;
  signedAt: string | null;
}

/** Consent keys the provider hand-off gate checks server-side. */
export const REQUIRED_FOR_PROVIDER = ['consent-npp-v1', 'consent-phi-auth-v1'] as const;

const CHECKLIST_DEFS: Array<{ id: string; label: string; required: boolean }> = [
  { id: 'consent-contact-v1', label: 'Contact & education consent (intake)', required: false },
  { id: 'consent-ai-comms-v1', label: 'AI communications consent (assessment)', required: false },
  { id: 'consent-npp-v1', label: 'Notice of Privacy Practices — acknowledged', required: true },
  { id: 'consent-phi-auth-v1', label: 'Patient Authorization — disclosure to network physicians', required: true },
];

/** Best-effort parse of one consent entry — a JSON string, an object, or something else entirely. */
function parseEntry(raw: unknown): ConsentEntry {
  if (raw == null) return {};
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      // Not JSON — treat the raw string as nothing structured to report.
      return {};
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>;
  const entry: ConsentEntry = {};
  if (typeof v.version === 'string') entry.version = v.version;
  if (typeof v.at === 'string') entry.at = v.at;
  if (typeof v.typedName === 'string') entry.typedName = v.typedName;
  if (typeof v.legalVersion === 'string') entry.legalVersion = v.legalVersion;
  return entry;
}

/**
 * Parse the raw `consents` AWSJSON value into a tolerant map of
 * `{ [consentId]: ConsentEntry }`. Accepts an already-parsed object, a JSON
 * string of one, or anything else (returns `{}`). Each value may itself be a
 * JSON string or a plain object.
 */
export function parseConsents(raw: unknown): ConsentsMap {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};

  const out: ConsentsMap = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = parseEntry(val);
  }
  return out;
}

/**
 * Build the display checklist for the consent panel. `consent-ai-comms-v1`
 * may live on the Contact record instead of here, so its absence is not
 * treated as "missing" — just "unknown" (signedAt stays null, and it is
 * never required for the provider gate).
 */
export function consentChecklist(consents: ConsentsMap): ConsentChecklistItem[] {
  return CHECKLIST_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    required: def.required,
    signedAt: consents[def.id]?.at ?? null,
  }));
}

export interface CardOnFileRow {
  label: string;
  onFile: boolean;
  detail: string;
}

/**
 * Fifth checklist row: the card saved at consent time. Purely informational —
 * the provider hand-off gate is the two HIPAA signatures and nothing else.
 * Never renders more than the brand and last four digits.
 */
export function cardOnFileRow(raw: unknown): CardOnFileRow {
  let value: unknown = raw;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { value = null; }
  }
  const c = (value && typeof value === 'object' && !Array.isArray(value))
    ? (value as Record<string, unknown>) : {};
  const onFile = typeof c.paymentMethodId === 'string' && c.paymentMethodId.length > 0;
  if (!onFile) return { label: 'Card on file', onFile: false, detail: 'Not on file' };

  const brand = typeof c.brand === 'string' && c.brand ? c.brand : 'Card';
  const last4 = typeof c.last4 === 'string' && c.last4 ? c.last4 : '';
  const savedAt = typeof c.savedAt === 'string' ? c.savedAt : '';
  const parts = [last4 ? `${brand} \u00b7\u00b7\u00b7\u00b7${last4}` : brand];
  if (savedAt) parts.push(savedAt.slice(0, 10));
  return { label: 'Card on file', onFile: true, detail: parts.join(' \u00b7 ') };
}

/**
 * True once both HIPAA signatures the server-side gate requires are present.
 * Mirrors the server check: the key must exist on the consents map (a
 * timestamp is expected but not required for the gate itself).
 */
export function providerReady(consents: ConsentsMap): boolean {
  return REQUIRED_FOR_PROVIDER.every((id) => id in consents);
}
