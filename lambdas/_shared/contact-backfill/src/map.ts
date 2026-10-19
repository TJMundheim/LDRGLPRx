import type { ContactUpsertInput } from '@my4mlife/contact-upsert';

export type StripeCustomerIn = { id: string; email?: string | null; name?: string | null; hasPaid?: boolean };
export type CognitoUserIn = { Attributes?: { Name?: string; Value?: string }[] };
export type PatientRecordIn = { contactId?: string; demographics?: { email?: string; firstName?: string; lastName?: string } };
export type Prepared = { rows: ContactUpsertInput[]; skippedTest: number; invalid: number };

const TEST_MARKERS = ['+contactsmoke', '+captainstest', '@example.com', '+test'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function names(first?: string | null, last?: string | null) {
  const out: { firstName?: string; lastName?: string } = {};
  if (first?.trim()) out.firstName = first.trim();
  if (last?.trim()) out.lastName = last.trim();
  return out;
}

export function fromStripeCustomer(c: StripeCustomerIn): ContactUpsertInput {
  const [first, ...rest] = (c.name ?? '').trim().split(/\s+/);
  return {
    email: c.email ?? '',
    ...names(first, rest.join(' ')),
    ...(c.id ? { stripeCustomerId: c.id } : {}),
    source: 'backfill:stripe',
    ...(c.hasPaid ? { stage: 'customer' as const } : {}),
  };
}

export function fromCognitoUser(u: CognitoUserIn): ContactUpsertInput {
  const attr = (n: string) => u.Attributes?.find((a) => a.Name === n)?.Value;
  return { email: attr('email') ?? '', ...names(attr('given_name'), attr('family_name')), source: 'backfill:cognito' };
}

export function fromPatientRecord(item: PatientRecordIn): ContactUpsertInput {
  const d = item.demographics ?? {};
  return { email: d.email ?? '', ...names(d.firstName, d.lastName), source: 'backfill:patient-record' };
}

export function prepare(list: ContactUpsertInput[]): Prepared {
  const byKey = new Map<string, ContactUpsertInput>();
  let skippedTest = 0;
  let invalid = 0;
  for (const input of list) {
    const email = (input.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { invalid++; continue; }
    if (TEST_MARKERS.some((m) => email.includes(m))) { skippedTest++; continue; }
    const key = `${email}|${input.source}`;
    const prev = byKey.get(key);
    byKey.set(key, prev ? { ...input, ...prev, ...(input.stage || prev.stage ? { stage: 'customer' as const } : {}), email } : { ...input, email });
  }
  return { rows: [...byKey.values()], skippedTest, invalid };
}
