import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(
  new URL('../src/pages/go/_draft-count-yourself-skinny.astro', import.meta.url),
  'utf8',
);

describe('cys-book landing page (draft)', () => {
  it('posts to the existing lead-capture endpoint with the shared bot fields', () => {
    expect(src).toMatch(/\/api\/lead-capture/);
    expect(src).toMatch(/scripts\/lead-capture/);
    expect(src).toMatch(/botFields|attachHoneypot/);
    expect(src).toMatch(/method:\s*'POST'/);
  });

  it('sends email, name when given, consent, and source cys-book', () => {
    expect(src).toMatch(/source:\s*'cys-book'/);
    expect(src).toMatch(/\bemail\b/);
    expect(src).toMatch(/firstName/);
    expect(src).toMatch(/consent:\s*true/);
    expect(src).toMatch(/agree to get updates and offers from My4MLife/);
  });

  it('success state links to the Week 13 on Count Log PDF', () => {
    expect(src).toContain('href="/downloads/count-log-week-13-on.pdf"');
  });

  it('has no forbidden content', () => {
    expect(src).not.toMatch(/coming soon/i);
    expect(src).not.toMatch(/apps\.apple\.com|app store|amazon\.|amzn\./i);
    expect(src).not.toMatch(/lose \d+|pounds|guarantee|drop the weight|melt/i);
    expect(src).not.toMatch(/count(ing)? calories|calorie (counter|tracking)/i);
  });

  it('has headline, disclaimer, and disordered-eating caution; no app mention', () => {
    expect(src).toContain("You'll never count a calorie. You'll count to 32 instead.");
    expect(src).toMatch(/educational/i);
    expect(src).toMatch(/eating disorder|disordered eating/i);
    expect(src).not.toMatch(/\bapp\b|iphone|airpods/i);
    expect(src).not.toMatch(/identity and your dignity|begin with the end/i);
  });
});
