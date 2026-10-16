// Pure check for the typed e-signature on /consult. Same rule as
// lambdas/consent-sign/src/validate.ts (checkbox + >=3 chars + first or last name
// match) — keep the two in sync. Returns the trimmed typed name, or null.
const norm = (s: unknown) => (typeof s === 'string' ? s : '').trim().toLowerCase();

export function typedSignature(parsed: any, demo: any): string | null {
  const sign = parsed?.privacySign;
  if (!sign || sign.agreed !== true) return null;
  const typedName = typeof sign.typedName === 'string' ? sign.typedName.trim() : '';
  if (typedName.length < 3) return null;

  const typed = norm(typedName);
  const targets = [norm(demo?.firstName), norm(demo?.lastName)].filter((n) => n.length >= 2);
  if (targets.length && !targets.some((n) => typed.includes(n))) return null;
  return typedName;
}
