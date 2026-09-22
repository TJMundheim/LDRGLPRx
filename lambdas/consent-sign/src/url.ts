// Builds the signed e-sign link. Used by whichever Lambda emails the patient
// their Stage-2 consent request (see docs/legal/ 3-stage gating).
import { approveToken } from './token';

export function buildSignUrl(
  baseUrl: string,
  secret: string,
  contactId: string,
  encounterId: string,
): string {
  const t = approveToken(secret, contactId, encounterId);
  const base = baseUrl.replace(/\/+$/, '');
  const qs = new URLSearchParams({ c: contactId, e: encounterId, t });
  return `${base}/?${qs.toString()}`;
}
