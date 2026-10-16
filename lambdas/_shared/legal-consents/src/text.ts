// Shared consent copy + HTML escaping (used by the sign page and the copy email).
export const TAGLINE = "Don't lose your identity and your dignity while you still have a choice.";
// Wording matched to the consent-request email and the admin checklist.
// Dr. TJ is never described as a physician — the prescribers are the
// contracted telemedicine practice's licensed physicians.
export const DISCLOSE_TO =
  "our network's licensed physicians (My4MLife's contracted telemedicine practice(s))";
export const ESIGN_LINE =
  'By typing your name below you consent to sign electronically under the federal E-SIGN Act, and agree your typed name is the legal equivalent of your handwritten signature.';

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]);
