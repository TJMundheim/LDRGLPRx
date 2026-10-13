import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { upsertContact } from '@my4mlife/contact-upsert';

type Ddb = { send: (cmd: any) => Promise<any> };

export type AssessmentContact = {
  ddb: Ddb;
  table: string;
  contactId: string;
  email: string;
  firstName: string;
  phone: string;
  top3: unknown;
  src: unknown;
  consent: unknown;
  aiComms: boolean;
  protege: boolean;
  now: string;
};

/** `src` is a campaign tag (e.g. "uninsured-decade"); anything odd falls back. */
export function cleanSource(src: unknown): string {
  const s = typeof src === 'string' ? src.trim().toLowerCase().slice(0, 64) : '';
  return /^[a-z0-9][a-z0-9:_.-]*$/.test(s) ? s : 'assessment';
}

/** Category slugs only: never scores, labels, or answers. */
export function top3Slugs(top3: unknown): string[] {
  if (!Array.isArray(top3)) return [];
  const slugs = top3.map((t) => (typeof t === 'string' ? t : (t as { slug?: unknown } | null)?.slug));
  return slugs.filter((s): s is string => typeof s === 'string' && /^[a-z0-9-]{1,48}$/.test(s));
}

/**
 * Marketing-list write for a finished assessment. No answers or scores reach
 * Contact (they live in Users). Stage is not passed: new rows default to
 * 'lead' (so nurture runs); existing protege/customer rows keep their stage.
 */
export async function recordAssessmentContact(a: AssessmentContact): Promise<void> {
  await upsertContact(a.ddb, {
    email: a.email,
    source: cleanSource(a.src),
    ...(a.firstName ? { firstName: a.firstName } : {}),
    ...(a.phone ? { phone: a.phone } : {}),
    tags: top3Slugs(a.top3),
    event: { type: 'assessment-complete', at: a.now },
  }, { table: a.table, now: a.now });

  if (!a.consent) return;
  // Compliance record: the first consent captured is kept, never overwritten.
  await a.ddb.send(new UpdateCommand({
    TableName: a.table,
    Key: { contactId: a.contactId },
    UpdateExpression: 'SET #c = if_not_exists(#c, :c), #at = if_not_exists(#at, :at), #ai = if_not_exists(#ai, :ai), #pr = if_not_exists(#pr, :pr)',
    ExpressionAttributeNames: { '#c': 'consent', '#at': 'consentedAt', '#ai': 'aiCommsConsent', '#pr': 'protegeConsent' },
    ExpressionAttributeValues: { ':c': JSON.stringify(a.consent), ':at': a.now, ':ai': a.aiComms, ':pr': a.protege },
  }));
}
