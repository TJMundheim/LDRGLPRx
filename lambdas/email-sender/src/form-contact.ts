import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { upsertContact } from '@my4mlife/contact-upsert';

// Forms whose submitter is a lead worth keeping. Questionnaire/intake forms (health data) are deliberately excluded.
const ALLOWED = new Set(['coaching-application', 'contact', 'referral', 'request-app-homepage']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAGS: Record<string, string[]> = { 'coaching-application': ['captains-table'] };

type Ddb = { send(cmd: any): Promise<any> };
let client: Ddb | undefined;
export function contactDdb(): Ddb {
  return (client ??= DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' })));
}

const str = (v: unknown, max = 80) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

function nameOf(formId: string, f: Record<string, unknown>): { firstName?: string; lastName?: string } {
  const first = str(f.firstName);
  const last = str(f.lastName);
  if (first || last) return { firstName: first, lastName: last };
  const full = str(formId === 'referral' ? f.referrerName : f.name, 160);
  if (!full) return {};
  const i = full.search(/\s/);
  return i < 0 ? { firstName: full } : { firstName: full.slice(0, i), lastName: full.slice(i).trim() };
}

// Records the submitter as a 'lead' Contact. Never forwards message/answers/health fields, never sets
// marketingConsent. Referral: only the submitter's own referrerEmail (the form holds no third-party address).
// Failures are logged without the address and swallowed so the form email still sends.
export async function captureFormContact(
  ddb: Ddb,
  form: { formId: string; fields: Record<string, unknown> | null | undefined },
): Promise<void> {
  try {
    const { formId, fields } = form;
    if (!ALLOWED.has(formId) || !fields || typeof fields !== 'object') return;
    const raw = str(formId === 'referral' ? fields.referrerEmail : fields.email, 254)?.toLowerCase();
    if (!raw || !EMAIL_RE.test(raw)) return;
    const { firstName, lastName } = nameOf(formId, fields);
    await upsertContact(ddb, {
      email: raw,
      source: `form:${formId}`,
      stage: 'lead',
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(TAGS[formId] ? { tags: TAGS[formId] } : {}),
    });
  } catch (e) {
    console.error('[email-sender] contact capture failed (form email unaffected):', (e as Error)?.name ?? 'error');
  }
}
