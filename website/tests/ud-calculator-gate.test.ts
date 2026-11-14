import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const page = readFileSync(new URL('../src/pages/go/uninsured-decade.astro', import.meta.url), 'utf8');
const privacy = readFileSync(new URL('../src/pages/privacy.astro', import.meta.url), 'utf8');

const tagFor = (id: string): string => {
  const m = page.match(new RegExp(`<[a-zA-Z]+[^>]*\\bid="${id}"[^>]*>`));
  return m ? m[0] : '';
};

// Extract the full argument text of every posthog.capture( call (balanced parens).
function captureArgs(source: string): string[] {
  const out: string[] = [];
  const needle = 'posthog.capture(';
  let i = source.indexOf(needle);
  while (i !== -1) {
    let depth = 1;
    let j = i + needle.length;
    while (j < source.length && depth > 0) {
      if (source[j] === '(') depth++;
      else if (source[j] === ')') depth--;
      j++;
    }
    out.push(source.slice(i + needle.length, j - 1));
    i = source.indexOf(needle, j);
  }
  return out;
}

describe('uninsured-decade calculator soft gate', () => {
  it('has the gate form and its fields', () => {
    for (const id of ['ud-gate', 'ud-gate-first', 'ud-gate-email', 'ud-gate-advisor', 'ud-gate-optin']) {
      expect(page, `missing id="${id}"`).toContain(`id="${id}"`);
    }
  });

  it('opt-in is an unchecked checkbox', () => {
    const tag = tagFor('ud-gate-optin');
    expect(tag).toMatch(/type="checkbox"/);
    expect(tag).not.toMatch(/\bchecked\b/);
  });

  it('has a honeypot input named hp', () => {
    expect(page).toMatch(/<input[^>]*\bname="hp"/);
  });

  it('locked region is hidden by default in markup', () => {
    const tag = tagFor('ud-locked');
    expect(tag).not.toBe('');
    expect(tag).toMatch(/\bhidden\b/);
  });

  it('places the gate after The Bill and before the locked region', () => {
    const bill = page.indexOf('id="ud-bill"');
    const gate = page.indexOf('id="ud-gate"');
    const locked = page.indexOf('id="ud-locked"');
    expect(bill).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(bill);
    expect(locked).toBeGreaterThan(gate);
  });

  it('posts to the report endpoint', () => {
    expect(page).toContain('/api/ud-calculator-report');
  });

  it('hero no longer promises "No name, no email"', () => {
    expect(page).not.toContain('No name, no email');
  });

  it('privacy page mentions the calculator', () => {
    expect(privacy).toContain('Uninsured Decade calculator');
  });

  it('PostHog payloads never reference email, firstName, first, or advisor values', () => {
    const calls = captureArgs(page);
    expect(calls.length).toBeGreaterThan(0);
    for (const args of calls) {
      // allow the event name string and boolean flag keys like `advisor: ...Boolean`; forbid raw values
      const payload = args.replace(/^\s*(['"`])[^'"`]*\1\s*,?/, '');
      expect(payload, args).not.toMatch(/\bemail\b|\bfirstName\b|\bfirst\b/i);
      // advisor may only appear as a boolean: `advisor: !!x` / `advisor: Boolean(x)` / `advisor: x.length > 0`-style is not provable; require !!/Boolean/true/false
      const adv = payload.match(/\badvisor\w*\s*:\s*([^,}\n]+)/g) ?? [];
      for (const a of adv) expect(a, args).toMatch(/:\s*(!!|Boolean\(|true|false)/);
      expect(payload, args).not.toMatch(/\badvisorEmail\b/);
    }
  });
});
