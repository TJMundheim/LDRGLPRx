import { existsSync, readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

// Runs against the built output when present (pnpm build), else skipped.
const pages = ['../dist/go/push-patch/index.html', '../dist/heritage/index.html'];
describe.each(pages)('%s', (p) => {
  const url = new URL(p, import.meta.url);
  it.skipIf(!existsSync(url))('has coordinator CTA and no SMS', () => {
    const html = readFileSync(url, 'utf8');
    expect(html).toContain('Have more questions? Schedule a care coordinator call');
    expect(html).toContain('/consult?src=');
    expect(html).not.toContain('sms:');
    expect(html).not.toContain('Text Dr. TJ');
  });
});
