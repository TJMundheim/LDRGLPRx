export type ContactItem = {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  lifecycleStage?: string;
  protegeSince?: string;
  sources?: Set<string>;
  tags?: Set<string>;
  skusPurchased?: Set<string>;
  lifetimeValueUSD?: number;
  createdAt?: string;
  marketingConsent?: { status?: string; source?: string; at?: string };
};

export const SEGMENTS = [
  'push-patch-buyers', 'push-patch-started-not-paid', 'proteges',
  'consult-leads', 'captains-table', 'marketing-opted-in', 'all-contacts',
] as const;
export type SegmentName = (typeof SEGMENTS)[number];

/** Normalises DynamoDB string sets, plain arrays (older rows), or a lone string into a string[]. */
export function asList(v: unknown): string[] {
  if (v instanceof Set) return [...v].filter((x): x is string => typeof x === 'string');
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  return typeof v === 'string' && v ? [v] : [];
}

const TEST_TAG = /smoke|test/; // only ever applied to the plus-tag, never the whole address

export function isExcluded(i: ContactItem): boolean {
  const email = typeof i?.email === 'string' ? i.email.trim().toLowerCase() : '';
  if (!email) return true;
  if (asList(i.tags).includes('suspected-bot') || i.lifecycleStage === 'banned') return true;
  return /^drtj\+.*@my4mlife\.com$/.test(email) || email.endsWith('@example.com') || TEST_TAG.test(email.split('@')[0].split('+').slice(1).join('+'));
}

export function segmentContacts(items: ContactItem[]): Record<SegmentName, ContactItem[]> {
  const out = Object.fromEntries(SEGMENTS.map((s) => [s, [] as ContactItem[]])) as Record<SegmentName, ContactItem[]>;
  for (const i of items.filter((x) => !isExcluded(x))) {
    const sources = asList(i.sources);
    const bought = asList(i.skusPurchased).some((s) => s.startsWith('push-patch-'))
      || sources.some((s) => s === 'push-patch-intake' || s.startsWith('purchase:push-patch')); // intake source is written only after payment
    if (bought) out['push-patch-buyers'].push(i);
    else if (sources.includes('push-patch-form')) out['push-patch-started-not-paid'].push(i);
    if (i.protegeSince || i.lifecycleStage === 'protege') out.proteges.push(i);
    if (sources.some((s) => s.startsWith('consult-intake:'))) out['consult-leads'].push(i);
    if (asList(i.tags).includes('captains-table') || sources.some((x) => x === 'form:coaching-application' || x === 'coaching-application')) out['captains-table'].push(i);
    if (i.marketingConsent?.status === 'opted_in') out['marketing-opted-in'].push(i);
    out['all-contacts'].push(i);
  }
  return out;
}
