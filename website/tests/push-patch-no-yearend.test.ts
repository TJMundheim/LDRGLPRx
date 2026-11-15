import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(new URL('../src/components/push-patch/PushPatchLanding.astro', import.meta.url), 'utf8');

describe('push-patch page', () => {
  it('no longer contains the YEAREND banner', () => {
    expect(src).not.toContain('YEAREND');
    expect(src).not.toContain('PromoBanner');
  });
});
