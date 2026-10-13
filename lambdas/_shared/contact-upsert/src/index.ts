import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { deriveContactId } from '@my4mlife/contact-id';
import { buildUpdate } from './build-update';
import { promote } from './promote';
import type { ContactUpsertInput, ContactUpsertOptions, Ddb } from './types';
import { assertNoPhi, isPlaceholderPhone, normalizeEmail, resolveNow } from './validate';

export { PHI_KEYS, isPlaceholderPhone } from './validate';
export type { ContactUpsertInput, ContactUpsertOptions } from './types';

export async function upsertContact(
  ddb: Ddb,
  input: ContactUpsertInput,
  opts: ContactUpsertOptions = {},
): Promise<void> {
  assertNoPhi(input);
  const email = normalizeEmail(input.email);
  if (typeof input.source !== 'string' || !input.source.trim()) {
    throw new Error('contact-upsert: source is required');
  }
  const table = opts.table ?? process.env.CONTACT_TABLE ?? 'Contact';
  const now = resolveNow(opts.now);
  const contactId = deriveContactId(email);
  const phone = typeof input.phone === 'string' && !isPlaceholderPhone(input.phone) ? input.phone.trim() : undefined;

  await ddb.send(new UpdateCommand({
    TableName: table,
    Key: { contactId },
    ...buildUpdate(input, email, now, phone),
  }));
  if (input.stage === 'protege' || input.stage === 'customer') {
    await promote(ddb, table, contactId, input.stage, now);
  }
}
