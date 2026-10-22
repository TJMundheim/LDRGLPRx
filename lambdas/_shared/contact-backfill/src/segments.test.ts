import { describe, expect, it } from 'vitest';
import { segmentContacts, type ContactItem } from './segments';

const c = (o: Partial<ContactItem> & { email: string }): ContactItem => o;
const names = (r: Record<string, ContactItem[]>, k: string) => r[k].map((x) => x.email);

describe('segmentContacts', () => {
  it('push-patch-buyers: sku prefix or paid intake source', () => {
    const r = segmentContacts([
      c({ email: 'a@x.com', skusPurchased: new Set(['push-patch-nad']) }),
      c({ email: 'b@x.com', sources: new Set(['push-patch-intake']) }),
      c({ email: 'c@x.com', lifecycleStage: 'lead', sources: new Set(['push-patch-form']) }),
      c({ email: 'd@x.com', skusPurchased: new Set(['other']) }),
    ]);
    expect(names(r, 'push-patch-buyers')).toEqual(['a@x.com', 'b@x.com']);
    expect(names(r, 'push-patch-started-not-paid')).toEqual(['c@x.com']);
  });
  it('accepts arrays as well as sets (older rows)', () => {
    const r = segmentContacts([c({ email: 'a@x.com', skusPurchased: ['push-patch-x'] as unknown as Set<string> })]);
    expect(names(r, 'push-patch-buyers')).toEqual(['a@x.com']);
  });
  it('proteges, consult-leads, captains-table, marketing-opted-in', () => {
    const r = segmentContacts([
      c({ email: 'p@x.com', protegeSince: '2026-01-01' }),
      c({ email: 'q@x.com', lifecycleStage: 'protege' }),
      c({ email: 'l@x.com', sources: new Set(['consult-intake:gut']) }),
      c({ email: 't@x.com', tags: new Set(['captains-table']) }),
      c({ email: 'u@x.com', sources: new Set(['form:coaching-application']) }),
      c({ email: 'm@x.com', marketingConsent: { status: 'opted_in', source: 's', at: 'n' } }),
      c({ email: 'n@x.com', marketingConsent: { status: 'opted_out' } as never }),
    ]);
    expect(names(r, 'proteges')).toEqual(['p@x.com', 'q@x.com']);
    expect(names(r, 'consult-leads')).toEqual(['l@x.com']);
    expect(names(r, 'captains-table')).toEqual(['t@x.com', 'u@x.com']);
    expect(names(r, 'marketing-opted-in')).toEqual(['m@x.com']);
    expect(r['all-contacts']).toHaveLength(7);
  });
  it('captains-table matches plain and form-prefixed coaching-application sources', () => {
    const r = segmentContacts([
      c({ email: 'a@x.com', sources: new Set(['coaching-application']) }),
      c({ email: 'b@x.com', sources: new Set(['form:coaching-application']) }),
      c({ email: 'c@x.com', sources: new Set(['coaching-applications-other']) }),
    ]);
    expect(names(r, 'captains-table')).toEqual(['a@x.com', 'b@x.com']);
  });
  it('buyer = push-patch sku, push-patch-intake source, or purchase:push-patch source', () => {
    const r = segmentContacts([
      c({ email: 'a@x.com', sources: new Set(['push-patch-form']), lifecycleStage: 'customer' }),
      c({ email: 'b@x.com', sources: new Set(['push-patch-form', 'push-patch-intake']) }),
      c({ email: 'c@x.com', sources: new Set(['purchase:push-patch-nad-ghk']) }),
      c({ email: 'd@x.com', sources: new Set(['push-patch-form']), skusPurchased: new Set(['other-sku']) }),
      c({ email: 'e@x.com', sources: new Set(['push-patch-form']) }),
      c({ email: 'f@x.com', lifecycleStage: 'customer', sources: new Set(['backfill:stripe']) }),
    ]);
    expect(names(r, 'push-patch-buyers')).toEqual(['b@x.com', 'c@x.com']);
    expect(names(r, 'push-patch-started-not-paid')).toEqual(['a@x.com', 'd@x.com', 'e@x.com']);
  });
  it('real addresses containing "smoke" or "test" outside a + tag are kept', () => {
    const r = segmentContacts([
      c({ email: 'smokey@gmail.com' }),
      c({ email: 'smoke.jones@gmail.com' }),
      c({ email: 'attest@gmail.com' }),
      c({ email: 'me@smoketown.com' }),
      c({ email: 'jo+news@gmail.com' }),
    ]);
    expect(r['all-contacts']).toHaveLength(5);
  });
  it('excludes bots, banned and test addresses from every segment', () => {
    const r = segmentContacts([
      c({ email: 'bot@x.com', tags: new Set(['suspected-bot']) }),
      c({ email: 'ban@x.com', lifecycleStage: 'banned' }),
      c({ email: 'drtj+a@my4mlife.com' }),
      c({ email: 'Z@Example.com' }),
      c({ email: 'me+smoke9@x.com' }),
      c({ email: 'me+ppsmoke1@my4mlife.com' }),
      c({ email: 'me+handofftest@my4mlife.com' }),
      c({ email: 'a+contactsmoke1@x.com' }),
      c({ email: 'a+captainstest@x.com' }),
      c({ email: 'a+test@x.com' }),
      c({ email: 'ok@x.com' }),
      c({ email: '' }),
      c({} as never),
    ]);
    expect(names(r, 'all-contacts')).toEqual(['ok@x.com']);
  });
});
