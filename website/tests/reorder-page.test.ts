import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(new URL('../src/pages/reorder.astro', import.meta.url), 'utf8');
const cfg = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');

describe('/reorder page', () => {
  it('is noindex, nofollow, chrome-free and out of the sitemap', () => {
    expect(src).toContain('robots="noindex, nofollow"');
    expect(src).toContain('hideChrome={true}');
    expect(cfg).toMatch(/reorder/);
  });
  it('forwards only to a fixed destination', () => {
    expect(src).toContain('/api/push-patch-refill');
    expect(src).toMatch(/location\.replace\(url\)/);
    expect(src).not.toMatch(/get\('(next|url|redirect|to)'\)/);
    expect(src).toContain("{ c: c, e: e, exp: exp, sig: sig }");
  });
  it('validates all four params', () => {
    expect(src).toContain('[0-9a-f]{8}-[0-9a-f]{4}');
    expect(src).toContain('pp-cs_(live|test)_[A-Za-z0-9]+');
    expect(src).toContain('/^\\d+$/');
    expect(src).toContain('/^[0-9a-f]{64}$/');
  });
  it('has fallback copy', () => {
    expect(src).toContain('Opening your reorder page…');
    expect(src).toContain('Continue');
    expect(src).toContain("This link isn't valid.");
    expect(src).toContain('support@my4mlife.com');
  });
});
