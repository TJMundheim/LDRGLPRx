import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { deriveContactId } from '@my4mlife/contact-id';
import { upsertContact } from '@my4mlife/contact-upsert';
import { ddb } from './store';
import type { Entry } from './validate';

const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';
const SOURCE = 'pullup-challenge';

/**
 * Shared Contact record (table Contact, key contactId): identity + source only.
 * No age/bodyweight/Instagram. Consent is written only for checked boxes, never downgraded.
 */
export async function upsertEntryContact(e: Entry): Promise<void> {
  const [firstName, ...rest] = e.name.split(/\s+/);
  // buildUpdate spreads the object, so the consent text version is stored (the shared type omits it).
  const consent = { status: 'opted_in' as const, source: SOURCE, version: e.consentVersion };
  await upsertContact(ddb, {
    email: e.email, firstName, ...(rest.length ? { lastName: rest.join(' ') } : {}), phone: e.phone, source: SOURCE,
    event: { type: 'pullup-challenge-entry' },
    ...(e.emailOptIn ? { marketingConsent: consent } : {}),
  }, { table: CONTACT_TABLE });
  if (e.smsOptIn) {
    await ddb.send(new UpdateCommand({
      TableName: CONTACT_TABLE,
      Key: { contactId: deriveContactId(e.email) },
      UpdateExpression: 'SET smsConsent = :c',
      ExpressionAttributeValues: { ':c': { status: 'opted_in', source: SOURCE, version: e.consentVersion, at: new Date().toISOString() } },
    }));
  }
}
