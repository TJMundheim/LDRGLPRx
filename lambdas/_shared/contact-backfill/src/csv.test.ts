import { describe, expect, it } from 'vitest';
import { toCsv, HEADER } from './csv';

describe('toCsv', () => {
  it('writes the header and CRLF rows', () => {
    expect(HEADER).toBe('email,firstName,lastName,phone,lifecycleStage,sources,tags,lifetimeValueUSD,createdAt');
    expect(toCsv([])).toBe(HEADER + '\r\n');
  });
  it('escapes commas, quotes and newlines; joins sets with semicolons', () => {
    const out = toCsv([{ email: 'a@x.com', firstName: 'O"Neil', lastName: 'A,B', phone: '1\n2', sources: new Set(['s1', 's2']), tags: ['t'] as never, lifetimeValueUSD: 650, createdAt: 'now' }]);
    expect(out.split('\r\n')[1]).toBe('a@x.com,"O""Neil","A,B","1\n2",,s1;s2,t,650,now');
  });
  it('is defensive about missing and odd values', () => {
    const out = toCsv([{ email: 'a@x.com', lifetimeValueUSD: '12' as never, tags: 'solo' as never }]);
    expect(out.split('\r\n')[1]).toBe('a@x.com,,,,,,solo,12,');
  });
  it('neutralises spreadsheet formula prefixes', () => {
    expect(toCsv([{ email: 'a@x.com', firstName: '=SUM(1)' }]).split('\r\n')[1]).toBe('a@x.com,\'=SUM(1),,,,,,,');
  });
});
