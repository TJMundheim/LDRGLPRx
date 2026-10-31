import { describe, it, expect } from 'vitest';
import { makeToken, verifyToken } from './token';

const NOW = 1_800_000_000;
describe('partner token', () => {
  it('round-trips code, email, exp', () => {
    const t = makeToken('s', 'GLOW', 'a@b.com', NOW + 100);
    expect(verifyToken('s', t, NOW)).toEqual({ code: 'GLOW', email: 'a@b.com', exp: NOW + 100 });
  });
  it('rejects wrong secret, tampering, expiry and garbage', () => {
    const t = makeToken('s', 'GLOW', 'a@b.com', NOW + 100);
    expect(verifyToken('other', t, NOW)).toBeNull();
    const [p, sig] = t.split('.');
    const forged = Buffer.from('EVIL|a@b.com|' + (NOW + 100)).toString('base64url');
    expect(verifyToken('s', `${forged}.${sig}`, NOW)).toBeNull();
    expect(verifyToken('s', `${p}.${sig.slice(0, -2)}00`, NOW)).toBeNull();
    expect(verifyToken('s', t, NOW + 101)).toBeNull();
    expect(verifyToken('s', 'garbage', NOW)).toBeNull();
    expect(verifyToken('s', '', NOW)).toBeNull();
  });
  it('refuses an empty secret', () => {
    expect(verifyToken('', makeToken('', 'G', 'a@b.com', NOW + 1), NOW)).toBeNull();
  });
});

describe('link script compatibility', () => {
  it('tokens minted by infra/scripts/partner-sign-link.mjs verify here', async () => {
    const { makeToken: scriptMake, buildLink } = await import('../../../infra/scripts/partner-sign-link.mjs');
    expect(scriptMake('s', 'GLOW', 'a@b.com', NOW + 5)).toBe(makeToken('s', 'GLOW', 'a@b.com', NOW + 5));
    const link = new URL(buildLink('https://x.lambda-url.us-east-2.on.aws/', 's', 'GLOW', 'a@b.com', 30));
    expect(link.pathname).toBe('/');
    expect(verifyToken('s', link.searchParams.get('t')!)?.code).toBe('GLOW');
  });
});
