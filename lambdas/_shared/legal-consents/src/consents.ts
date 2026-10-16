// Pure builder for the two SignedConsent records stored in PatientRecords.consents.
import { CONSENT_NPP_V1, CONSENT_PHI_AUTH_V1 } from '@my4mlife/patient-record';
import { LEGAL_VERSION } from './legal';

export interface SignedConsent {
  version: string;
  legalVersion: string;
  at: string;
  typedName: string;
  ip?: string;
  userAgent?: string;
}

export interface SignInput {
  typedName: string;
  at: string;
  ip?: string;
  userAgent?: string;
}

/** One typed signature covers both documents; each gets its own version key. */
export function buildSignedConsents(input: SignInput): { npp: SignedConsent; phi: SignedConsent } {
  const base = {
    legalVersion: LEGAL_VERSION,
    at: input.at,
    typedName: input.typedName,
    ip: input.ip,
    userAgent: input.userAgent,
  };
  return {
    npp: { version: CONSENT_NPP_V1, ...base },
    phi: { version: CONSENT_PHI_AUTH_V1, ...base },
  };
}
