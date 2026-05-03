// Used at consult-booking time for HIPAA-grade consent capture. Not wired during Protégé sign-up (app-only flow needs only lightweight TOS/Privacy acknowledgement).
/**
 * Legal document text — imported as raw strings via Vite's ?raw loader.
 * Used at consult-booking time so the full verbatim text is displayed
 * and a SHA-256 hash can be computed client-side to anchor each consent
 * to the exact document version.
 *
 * The ?raw imports work in Vite build + dev. In vitest (jsdom) they resolve
 * to empty string via the mock below — tests only care about the component
 * structure, not the document text.
 */

import nppRaw from '../../../../../docs/legal/My_4M_Life_Notice_of_Privacy_Practices.md?raw';
import phiRaw from '../../../../../docs/legal/My_4M_Life_Patient_Authorization.md?raw';
import aiCommRaw from '../../../../../docs/legal/My_4M_Life_AI_Communication_Consent.md?raw';

export interface LegalDoc {
  key: string;
  title: string;
  text: string;
}

export const NPP_DOC: LegalDoc = {
  key: 'npp',
  title: 'Notice of Privacy Practices',
  text: (nppRaw as string) || '[Document text loaded at runtime]',
};

export const PHI_AUTH_DOC: LegalDoc = {
  key: 'phi-auth',
  title: 'Patient Authorization for Use and Disclosure of PHI',
  text: (phiRaw as string) || '[Document text loaded at runtime]',
};

export const AI_COMM_DOC: LegalDoc = {
  key: 'ai-comm',
  title: 'Consent for AI-Assisted Communication and Documentation',
  text: (aiCommRaw as string) || '[Document text loaded at runtime]',
};

/**
 * Normalize document text before hashing so that trivial whitespace
 * differences (trailing spaces, CRLF vs LF, etc.) don't invalidate
 * a previously stored consent. Each line is trimmed and the result is
 * joined with \n.
 */
function normalizeForHash(text: string): string {
  return text
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n+$/, ''); // strip trailing blank lines only, preserve leading content
}

/**
 * Compute SHA-256 hash of a string using the Web Crypto API.
 * Input is whitespace-normalized first so minor edits (trailing spaces,
 * line-ending differences) don't change the hash.
 * Returns hex string. Used to anchor consent records to the exact document version.
 */
export async function sha256(text: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback for environments that lack SubtleCrypto (e.g. some test runners)
    return 'sha256-unavailable';
  }
  const normalized = normalizeForHash(text);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
