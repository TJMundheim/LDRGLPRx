import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { upsertContact } from '@my4mlife/contact-upsert';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';
const SOURCE = 'uninsured-decade-calculator';

/** Shared Contact record: identity + source + event only. No ages, state, net worth, spend, or advisor address. */
export async function upsertReportContact(email: string, firstName: string, emailOptIn: boolean, consentVersion: string): Promise<void> {
  // Held in a variable so the consent text version is stored (the shared type omits it), as in pullup-challenge-entry.
  const consent = { status: 'opted_in' as const, source: SOURCE, version: consentVersion };
  await upsertContact(ddb, {
    email, firstName, source: SOURCE, event: { type: 'ud-calculator-report' },
    ...(emailOptIn ? { marketingConsent: consent } : {}),
  }, { table: CONTACT_TABLE });
}
