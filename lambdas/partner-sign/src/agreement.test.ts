import { describe, it, expect } from 'vitest';
import { parseVersion, fillAgreement, toHtml, sha256, longDate } from './agreement';
import md from 'agreement-md';
import { createHash } from 'node:crypto';

const vars = {
  BUSINESS: 'Glow Spa', SIGNER_NAME: 'Jane Doe', SIGNER_TITLE: 'Owner', PARTNER_CODE: 'GLOW',
  CLIENT_OFFER: '$50 off', COMMISSION: '$150', EFFECTIVE_DATE: 'October 31, 2026',
};

describe('agreement', () => {
  it('parses the version', () => {
    expect(parseVersion(md)).toBe('PA-2026-10');
    expect(() => parseVersion('no version here')).toThrow();
  });
  it('fills every placeholder', () => {
    const f = fillAgreement(md, vars);
    expect(f).toContain('Glow Spa');
    expect(f).toContain('Partner code: GLOW');
    expect(f).not.toMatch(/\{\{/);
  });
  it('throws on an unfilled placeholder', () => {
    expect(() => fillAgreement(md + '\n{{NOPE}}', vars)).toThrow(/NOPE/);
  });
  it('renders markdown to escaped html', () => {
    const h = toHtml(fillAgreement(md, { ...vars, BUSINESS: '<i>X</i>' }));
    expect(h).toContain('<h1>My4MLife Partner Agreement</h1>');
    expect(h).toContain('<h2>1. Commission</h2>');
    expect(h).toContain('<li>Paid monthly via Stripe.</li>');
    expect(h).toContain('<strong>&lt;i&gt;X&lt;/i&gt;</strong>');
    expect(h).toContain('&lt;b&gt;nothing&lt;/b&gt;');
    expect(h).not.toContain('<i>X');
  });
  it('hashes deterministically and formats dates in Chicago time', () => {
    expect(sha256('a')).toBe(createHash('sha256').update('a').digest('hex'));
    expect(sha256('a')).toHaveLength(64);
    expect(sha256('a')).not.toBe(sha256('b'));
    expect(longDate('2026-11-01T02:30:00.000Z')).toBe('October 31, 2026');
  });
});
