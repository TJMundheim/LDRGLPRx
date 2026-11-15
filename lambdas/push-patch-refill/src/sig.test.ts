import { describe, it, expect } from 'vitest';
import { sign, verify } from './sig';

const p = (o: Record<string, string>) => new URLSearchParams(o);
describe('sig', () => {
  const l = { c: 'c1', e: 'pp-1', exp: 2000000000 };
  it('is HMAC-SHA256 over c|e|exp (known vector)', () => {
    expect(sign(l, 'k')).toMatch(/^[0-9a-f]{64}$/);
    expect(sign(l, 'k')).toBe(sign({ ...l }, 'k'));
    expect(sign(l, 'k')).not.toBe(sign({ ...l, exp: l.exp + 1 }, 'k'));
  });
  it('matches the CLI signature vector (infra/scripts/push-patch-refill-lib.mjs)', () => {
    expect(sign({ c: 'c1', e: 'pp-cs_1', exp: 2000000000 }, 'test-key')).toBe('df544e2799bddff07ed06d3bdbf5cea1fd08e3250b1073d48810c9f91da3b1c8');
  });
  it('verifies good, rejects tampered/expired/malformed', () => {
    const ok = { c: l.c, e: l.e, exp: String(l.exp), sig: sign(l, 'k') };
    expect(verify(p(ok), 'k', 1)).toEqual(l);
    expect(verify(p({ ...ok, e: 'pp-2' }), 'k', 1)).toBeNull();
    expect(verify(p(ok), 'other', 1)).toBeNull();
    expect(verify(p(ok), 'k', l.exp + 1)).toBeNull();
    expect(verify(p({ ...ok, sig: 'zz' }), 'k', 1)).toBeNull();
    expect(verify(p({ ...ok, exp: 'x' }), 'k', 1)).toBeNull();
  });
});
