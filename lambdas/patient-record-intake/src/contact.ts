import { upsertContact } from '@my4mlife/contact-upsert';

type Ddb = Parameters<typeof upsertContact>[0];

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, 100) : undefined;

/** A real number has >= 10 digits and is not all zeros (e.g. +10000000000). */
const realPhone = (v: unknown): string | undefined => {
  const p = text(v);
  const digits = (p ?? '').replace(/\D/g, '');
  return p && digits.length >= 10 && !/^1?0+$/.test(digits) ? p : undefined;
};

/**
 * Record the intake submitter on the shared Contact list: email, name, phone and
 * lane ONLY. Demographics / history / answers / card never reach this call.
 * Never throws: a Contact failure must not fail the intake.
 */
export async function captureContact(ddb: unknown, email: string, lane: string, demographics: unknown): Promise<void> {
  const d = (demographics && typeof demographics === 'object' ? demographics : {}) as Record<string, unknown>;
  const firstName = text(d.firstName);
  const lastName = text(d.lastName);
  const phone = realPhone(d.phone);
  try {
    await upsertContact(ddb as Ddb, {
      email,
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(phone ? { phone } : {}),
      source: `consult-intake:${lane}`,
      tags: [lane],
      stage: 'lead',
      event: { type: 'consult-intake' },
    });
  } catch (e) {
    console.warn('[patient-record-intake] contact upsert failed', { error: (e as Error)?.name ?? 'Error' });
  }
}
