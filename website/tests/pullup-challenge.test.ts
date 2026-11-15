import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const raw = readFileSync(new URL('../src/pages/pullup.astro', import.meta.url), 'utf8');
// Page source with full-line // comments removed (frontmatter notes).
const src = raw.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const lower = src.toLowerCase();
const inputs = src.match(/<input[^>]*>/g) ?? [];
const inputNamed = (n: string) => inputs.filter((t) => new RegExp(`name="${n}"`).test(t));

describe('Peptide Pull-Up Challenge page: copy', () => {
  it('has the new h1 and title, and no old name', () => {
    expect(src).toMatch(/<h1[^>]*>[^<]*Peptide Pull-Up Challenge[^<]*<\/h1>/);
    expect(src).toMatch(/const title = [^;\n]*Peptide Pull-Up Challenge/);
    expect(raw).not.toContain('Push Patch Pull-Up');
  });

  it('has no contest vocabulary', () => {
    for (const w of ['division', 'multiplier', 'prize', 'winner']) expect(lower).not.toContain(w);
  });

  it('states the rep standard and that assistance is allowed and can change', () => {
    expect(lower).toContain('dead hang');
    expect(lower).toMatch(/nose[^.]*above the bar/);
    expect(lower).toMatch(/lower[^.]*under control/);
    expect(lower).toMatch(/band[\s\S]{0,200}jump|jump[\s\S]{0,200}band/);
    expect(lower).toContain('can change');
  });

  it('states the offer wording', () => {
    expect(src).toContain('50% off');
    expect(lower).toContain('free care coordinator call');
    expect(lower).toContain('free telemedicine visit');
    expect(lower).not.toContain('approval visit');
  });

  it('states the windows', () => {
    expect(src).toContain('December 15, 2026');
    expect(src).toContain('January 1');
    expect(src).toContain('January 7, 2027');
  });

  it('keeps the Meta release line', () => {
    expect(src).toMatch(/not sponsored, endorsed or administered by|no way sponsored, endorsed or administered by/);
  });

  it('keeps the Instagram collaborator step', () => {
    expect(src).toContain('Invite collaborator');
    expect(src).toContain('drtjmundheim');
  });

  it('is indexable and keeps site chrome', () => {
    expect(src).not.toMatch(/noindex/i);
    expect(src).not.toMatch(/hideChrome/);
    expect(src).toContain('https://www.my4mlife.com/pullup');
  });
});

describe('Peptide Pull-Up Challenge page: form', () => {
  it('drops age, bodyweight and division inputs', () => {
    for (const n of ['age', 'bodyweightLb', 'division']) expect(inputNamed(n)).toHaveLength(0);
  });

  it('has a required adult checkbox', () => {
    const t = inputNamed('adult');
    expect(t).toHaveLength(1);
    expect(t[0]).toMatch(/type="checkbox"/);
    expect(t[0]).toMatch(/\brequired\b/);
  });

  it('has honeypot, instagram url and round choice', () => {
    expect(inputNamed('hp').length).toBeGreaterThan(0);
    const ig = inputNamed('instagramUrl');
    expect(ig).toHaveLength(1);
    expect(ig[0]).toMatch(/type="url"/);
    const round = inputNamed('round');
    expect(round.some((t) => /value="start"/.test(t))).toBe(true);
    expect(round.some((t) => /value="final"/.test(t))).toBe(true);
  });

  it('opt-in boxes stay unchecked', () => {
    for (const tag of src.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? []) {
      expect(tag).not.toMatch(/\bchecked\b/);
    }
  });

  it('shows the returned code with a copy button', () => {
    expect(src).toMatch(/id="pu-code"/);
    expect(src).toMatch(/<button[^>]*>[^<]*copy[^<]*<\/button>/i);
  });

  it('posts to the entry API with adult and without age/bodyweight/division', () => {
    expect(src).toContain('/api/pullup-challenge-entry');
    const i = src.indexOf('JSON.stringify');
    expect(i).toBeGreaterThan(-1);
    const payload = src.slice(i, i + 1200);
    expect(payload).toMatch(/\badult\b/);
    expect(payload).not.toMatch(/\bage\b|bodyweightLb|division/);
  });

  it('shows server error text instead of a generic message', () => {
    expect(src).toMatch(/serverMsg/);
  });
});

describe('score calculator retired', () => {
  it('has no pu-calc id and no pullup-score import', () => {
    expect(src).not.toContain('pu-calc');
    expect(src).not.toContain('pullup-score');
  });
  it('pullup-score.ts no longer exists', () => {
    expect(existsSync(new URL('../src/lib/pullup-score.ts', import.meta.url))).toBe(false);
  });
});

describe('pullup takedown flag', () => {
  it('redirects to /rx/peptides while not approved, with a preview override', () => {
    const mode = readFileSync(new URL('../src/lib/siteMode.ts', import.meta.url), 'utf8');
    expect(mode).toMatch(/const PULLUP_APPROVED = false;/);
    expect(mode).toMatch(/export const SHOW_PULLUP = PULLUP_APPROVED \|\| [^;]*PUBLIC_SHOW_PULLUP[^;]*;/);
    expect(raw).toContain("if (!SHOW_PULLUP) return Astro.redirect('/rx/peptides');");
  });
});
