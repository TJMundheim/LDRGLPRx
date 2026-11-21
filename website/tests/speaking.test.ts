import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const path = new URL('../src/pages/speaking.astro', import.meta.url);
const page = existsSync(path) ? readFileSync(path, 'utf8') : '';
const footer = readFileSync(new URL('../src/components/Footer.astro', import.meta.url), 'utf8');
const siteMode = readFileSync(new URL('../src/lib/siteMode.ts', import.meta.url), 'utf8');

describe('/speaking page', () => {
  it('exists with title', () => {
    expect(page.length).toBeGreaterThan(0);
    expect(page).toContain('Book Dr. TJ to Speak | My4MLife');
  });
  it('flag is defined and gates noindex', () => {
    expect(siteMode).toMatch(/const SPEAKING_APPROVED = (true|false);/); // live since 2026-11-20 (TJ)
    expect(siteMode).toContain("export const SHOW_SPEAKING = SPEAKING_APPROVED || import.meta.env.PUBLIC_SHOW_SPEAKING === '1';");
    expect(page).toMatch(/SHOW_SPEAKING\s*\?\s*'index,\s*follow'\s*:\s*'noindex,\s*follow'/);
  });
  it('form posts speaking-inquiry with honeypot and timing', () => {
    expect(page).toContain("formId: 'speaking-inquiry'");
    expect(page).toContain('/api/contact-form');
    expect(page).toContain('attachHoneypot');
    expect(page).toContain('botFields');
    expect(page).toMatch(/\bhp\b/);
    expect(page).toMatch(/\bt\b,/);
    expect(page).toContain('id="request"');
    expect(page).toContain('speaking_inquiry_submitted');
  });
  it('carries the identity line and disclaimer verbatim', () => {
    expect(page).toContain('Don&rsquo;t lose your identity and your dignity while you still have a choice.'.replace('&rsquo;', "'"));
    expect(page).toContain('Dr. TJ speaks as a health-span educator and does not provide medical care through this platform.');
  });
  it('avoids forbidden words and email', () => {
    expect(page).not.toContain(', DC');
    expect(page.toLowerCase()).not.toContain('physician');
    expect(page).not.toContain('@my4mlife.com');
    expect(page.toLowerCase()).not.toContain('coming soon');
    expect(page).not.toMatch(/\$\d/);
  });
  it('footer link gated by SHOW_SPEAKING', () => {
    expect(footer).toContain("import { SHOW_SPEAKING }");
    expect(footer).toMatch(/SHOW_SPEAKING\s*&&[\s\S]{0,80}href="\/speaking"/);
  });
});

describe('sticky call bar', () => {
  it('is hidden on /speaking (bookers, not patients)', () => {
    const sticky = readFileSync(new URL('../src/components/StickyMobileCta.astro', import.meta.url), 'utf8');
    expect(sticky).toContain("path.startsWith('/speaking')");
  });
});
