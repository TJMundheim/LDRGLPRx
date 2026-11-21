import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

// APPSYNC_JS resolvers import @aws-appsync/utils (not installed); load with a stub util.
function load(file: string) {
  const src = readFileSync(join(__dirname, '../resolvers', file), 'utf8')
    .replace(/^import .*$/m, '')
    .replace(/^export function/gm, 'function');
  const util = {
    unauthorized: () => { throw new Error('unauthorized'); },
    error: (m: string) => { throw new Error(m); },
    time: {
      nowEpochMilliSeconds: () => Date.parse('2026-11-20T12:00:00Z'),
      parseISO8601ToEpochMilliSeconds: (s: string) => Date.parse(s),
    },
  };
  return new Function('util', `${src}; return { request, response };`)(util) as {
    request: (ctx: any) => any;
    response: (ctx: any) => any;
  };
}
const admin = (args: any = {}) => ({ identity: { groups: ['Admins'] }, args });

describe('drawingEvents resolver', () => {
  const r = () => load('drawingEvents.js');
  it('rejects non-admins', () => {
    expect(() => r().request({ identity: { groups: [] }, args: {} })).toThrow('unauthorized');
    expect(() => r().request({ identity: { claims: {} }, args: {} })).toThrow('unauthorized');
  });
  it('scans Contact for talk- sources or firstSource, excluding banned', () => {
    const req = r().request(admin());
    expect(req.operation).toBe('Scan');
    expect(req.filter.expression).toContain('attribute_exists(#s)');
    expect(req.filter.expression).toContain('begins_with(#fs, :p)');
    expect(req.filter.expression).toContain('#ls <> :banned');
    expect(req.filter.expressionValues[':p']).toEqual({ S: 'talk' });
  });
  it('groups distinct talk- tags from sources and firstSource, counts entrants, drops stale tags', () => {
    const { response } = r();
    const out = response({
      result: {
        items: [
          { contactId: 'a', sources: ['assessment', 'talk-austin-1120'], updatedAt: '2026-11-19T20:00:00Z' },
          { contactId: 'b', firstSource: 'talk-austin-1120', updatedAt: '2026-11-20T01:00:00Z' },
          { contactId: 'c', sources: ['talk-austin-1120'], firstSource: 'talk-austin-1120', updatedAt: '2026-11-18T01:00:00Z' },
          { contactId: 'd', sources: ['talk-old-1001'], updatedAt: '2026-10-01T00:00:00Z' },
          { contactId: 'e', sources: ['assessment'], updatedAt: '2026-11-19T00:00:00Z' },
        ],
      },
    });
    expect(out).toEqual([{ tag: 'talk-austin-1120', entrantCount: 3, lastEntryAt: '2026-11-20T01:00:00Z' }]);
  });
  it('groups the bare `talk` tag but not look-alikes like talking/talks-x', () => {
    const out = r().response({
      result: { items: [
        { contactId: 'a', sources: ['talk'], updatedAt: '2026-11-19T00:00:00Z' },
        { contactId: 'b', firstSource: 'talk', updatedAt: '2026-11-20T00:00:00Z' },
        { contactId: 'c', sources: ['talking', 'talks-x'], firstSource: 'talkative', updatedAt: '2026-11-20T00:00:00Z' },
      ] },
    });
    expect(out).toEqual([{ tag: 'talk', entrantCount: 2, lastEntryAt: '2026-11-20T00:00:00Z' }]);
  });
  it('keeps all entrants of a recent tag, even those older than 14 days', () => {
    const out = r().response({
      result: { items: [
        { contactId: 'a', sources: ['talk-x'], updatedAt: '2026-11-19T00:00:00Z' },
        { contactId: 'b', sources: ['talk-x'], updatedAt: '2026-10-01T00:00:00Z' },
      ] },
    });
    expect(out[0].entrantCount).toBe(2);
  });
});

describe('drawingEntrants resolver', () => {
  const r = () => load('drawingEntrants.js');
  it('rejects non-admins and bad tags', () => {
    expect(() => r().request({ identity: { groups: [] }, args: { tag: 'talk-x' } })).toThrow('unauthorized');
    expect(() => r().request(admin({ tag: 'assessment' }))).toThrow();
    expect(() => r().request(admin({ tag: '' }))).toThrow();
  });
  it('accepts the bare `talk` tag and rejects look-alikes', () => {
    expect(r().request(admin({ tag: 'talk' })).filter.expressionValues[':t']).toEqual({ S: 'talk' });
    expect(() => r().request(admin({ tag: 'talking' }))).toThrow();
    expect(() => r().request(admin({ tag: 'talks-x' }))).toThrow();
  });
  it('filters on contains(sources, tag) OR firstSource = tag, excluding banned', () => {
    const req = r().request(admin({ tag: 'talk-x' }));
    expect(req.filter.expression).toContain('contains(#s, :t)');
    expect(req.filter.expression).toContain('#fs = :t');
    expect(req.filter.expression).toContain('#ls <> :banned');
    expect(req.filter.expressionValues[':t']).toEqual({ S: 'talk-x' });
  });
  it('returns only contactId + display (no email/phone/health data)', () => {
    const out = r().response({
      result: { items: [
        { contactId: 'a', email: 'a@x.co', phone: '+1555', firstName: 'jane', lastName: 'doe', goals: ['x'] },
        { contactId: 'b', email: 'b@x.co', firstName: 'Cher' },
        { contactId: 'c', email: 'c@x.co', firstName: '  tom ', lastName: ' ' },
        { contactId: 'd', email: 'd@x.co' },
      ] },
    });
    expect(out).toEqual([
      { contactId: 'a', display: 'Jane D.' },
      { contactId: 'b', display: 'Cher' },
      { contactId: 'c', display: 'Tom' },
      { contactId: 'd', display: 'Guest' },
    ]);
    expect(JSON.stringify(out)).not.toMatch(/@|1555/);
  });
  it('never shows a full surname typed into the first-name field', () => {
    const out = r().response({
      result: { items: [
        { contactId: 'a', firstName: 'Tom Smith' },
        { contactId: 'b', firstName: '  mary   ann  jones ' },
      ] },
    });
    expect(out).toEqual([
      { contactId: 'a', display: 'Tom S.' },
      { contactId: 'b', display: 'Mary J.' },
    ]);
  });
});
