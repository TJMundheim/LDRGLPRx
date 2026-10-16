import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

// The resolver is APPSYNC_JS (imports @aws-appsync/utils, not installed here), so load it
// with a stubbed `util` and strip the module syntax. Real-runtime validation: `aws appsync evaluate-code`.
function load() {
  const src = readFileSync(join(__dirname, '../resolvers/listProteges.js'), 'utf8')
    .replace(/^import .*$/m, '')
    .replace(/^export function/gm, 'function');
  const util = {
    unauthorized: () => { throw new Error('unauthorized'); },
    error: (m: string) => { throw new Error(m); },
    time: {
      nowEpochMilliSeconds: () => Date.parse('2026-10-15T00:00:00Z'),
      parseISO8601ToEpochMilliSeconds: (s: string) => Date.parse(s),
    },
  };
  return new Function('util', `${src}; return { request, response };`)(util) as {
    request: (ctx: any) => any;
    response: (ctx: any) => any;
  };
}
const admin = { identity: { groups: ['Admins'] }, args: {} };

describe('listProteges resolver', () => {
  it('rejects non-admins', () => {
    expect(() => load().request({ identity: { groups: [] }, args: {} })).toThrow('unauthorized');
  });
  it('scans for lifecycleStage = protege OR attribute_exists(protegeSince)', () => {
    const req = load().request(admin);
    expect(req.operation).toBe('Scan');
    expect(req.filter.expression).toBe('#ls = :protege OR attribute_exists(#ps)');
    expect(req.filter.expressionNames).toEqual({ '#ls': 'lifecycleStage', '#ps': 'protegeSince' });
    expect(req.filter.expressionValues).toEqual({ ':protege': { S: 'protege' } });
  });
  it('counts days from protegeSince when present, else createdAt', () => {
    const { items } = load().response({
      result: {
        items: [
          { contactId: 'a', email: 'a@x.co', createdAt: '2026-01-01T00:00:00Z', protegeSince: '2026-10-05T00:00:00Z' },
          { contactId: 'b', email: 'b@x.co', createdAt: '2026-10-10T00:00:00Z' },
        ],
      },
    });
    expect(items.map((i: any) => i.daysAsProtege)).toEqual([10, 5]);
  });
});
