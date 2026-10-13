import type { Clock } from './types';

export const PHI_KEYS: readonly string[] = [
  'intakeAnswers', 'answers', 'conditions', 'medications', 'allergies', 'dob', 'sex', 'auditTop3',
  'screening', 'screeningAnswers', 'screeningScore',
];

export function assertNoPhi(input: Record<string, unknown>): void {
  for (const k of Object.keys(input)) {
    if (PHI_KEYS.includes(k) || k.startsWith('screening')) {
      throw new Error(`contact-upsert: PHI key "${k}" is not allowed on Contact`);
    }
  }
}

export function normalizeEmail(email: unknown): string {
  if (typeof email !== 'string') throw new Error('contact-upsert: email must be a string');
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('contact-upsert: invalid email');
  return e;
}

export function isPlaceholderPhone(phone: string | undefined | null): boolean {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return true;
  return /^1?0+$/.test(digits);
}

export function resolveNow(now?: Clock): string {
  const v = typeof now === 'function' ? now() : now ?? new Date();
  return v instanceof Date ? v.toISOString() : v;
}
