// Reads the consent/card state of a PatientRecords root item.
// `signed` mirrors the physician hand-off gate: both consent keys present.
const NPP = 'consent-npp-v1';
const PHI = 'consent-phi-auth-v1';

export function consentState(record?: Record<string, unknown>): { signed: boolean; hasCard: boolean } {
  const c = record?.['consents'] as Record<string, unknown> | undefined;
  const card = record?.['cardOnFile'] as { paymentMethodId?: unknown } | undefined;
  return {
    signed: Boolean(c?.[NPP]) && Boolean(c?.[PHI]),
    hasCard: typeof card?.paymentMethodId === 'string',
  };
}
