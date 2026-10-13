import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { upsertContact } from '@my4mlife/contact-upsert';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));

/** A real number has >= 10 digits and is not all zeros (e.g. +10000000000). */
const realPhone = (p: string): string | undefined => {
  const digits = p.replace(/\D/g, '');
  return digits.length >= 10 && !/^1?0+$/.test(digits) ? p.trim() : undefined;
};

/**
 * Record the (already paid) Push Patch buyer on the shared Contact list: email,
 * name and phone ONLY. DOB, sex, meds, conditions, allergies, shipping and
 * screening never reach this call. Never throws: failure must not fail the intake.
 */
export async function captureContact(a: { email: string; fullName: string; phone: string }): Promise<void> {
  const [first = '', ...rest] = a.fullName.trim().split(/\s+/);
  const lastName = rest.join(' ');
  const phone = realPhone(a.phone);
  try {
    await upsertContact(ddb, {
      email: a.email,
      ...(first ? { firstName: first } : {}),
      ...(lastName ? { lastName } : {}),
      ...(phone ? { phone } : {}),
      source: 'push-patch-intake',
      tags: ['push-patch'],
      stage: 'customer',
      event: { type: 'push-patch-intake' },
    });
  } catch (e) {
    console.warn('[push-patch-intake] contact upsert failed', { error: (e as Error)?.name ?? 'Error' });
  }
}
