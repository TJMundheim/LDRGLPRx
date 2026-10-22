// Provider signature line drawn on the order form.
export interface SignOpts { signedAt?: string; lead?: string } // lead = practice.physician_signature

// "Electronically signed — <clinician> · Oct 3, 2026" (Central time). Clinician is the same value as the `clinician` field.
export function signatureLine(fields: Record<string, string>, signedAt?: string, lead?: string): string {
  const when = signedAt ? new Date(signedAt) : new Date();
  const date = when.toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' });
  return `${lead || 'Electronically signed'} — ${fields['clinician'] ?? ''} · ${date}`;
}
