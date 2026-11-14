import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(new URL('../src/pages/pullup.astro', import.meta.url), 'utf8');
const raw = src;
const lib = readFileSync(new URL('../src/lib/pullup-score.ts', import.meta.url), 'utf8');

describe('pullup challenge page', () => {
  it('has verbatim PART 2 rule sentences from across the sections', () => {
    for (const s of [
      'Score = (final max reps - starting max reps) x bodyweight in pounds x age multiplier',
      'Age multiplier: add 1% for every year over 30, with no cap.',
      'Entries with edited, cut, or cropped videos are disqualified.',
      'Full body in frame, head to feet. Feet off the ground for every rep.',
      'Start from a dead hang with arms fully extended. Pull up until your chin is clearly above the bar. Hold that position with your chin above the bar while bringing your feet above the bar, as demonstrated in my video, then return to full arm extension. A rep counts only when you complete the full movement. Reps that do not meet the standard do not count.',
      'Women do not have to beat my score.',
      'As a math example only, going from 5 to 15 valid reps would score 10 x 235 x 1.29 = about 3,032.',
      'Tie on adjusted score within a division: the entry whose final video was entered first wins.',
      'Up to two entrant prizes may be awarded, one in each division.',
      'This promotion is in no way sponsored, endorsed or administered by, or associated with, Meta Platforms, Inc., Facebook or Instagram. By entering, each entrant fully releases Meta Platforms, Inc., Facebook and Instagram from any and all liability in connection with this promotion. Questions about the challenge go to My4MLife, not to Meta.',
      'Sponsor: My4MLIFE LLC, operating as My4MLife, 1205 Hall Johnson Rd, Colleyville, TX 76034.',
    ]) expect(src).toContain(s);
  });

  it('has headline, PART 2 intro and the live page link', () => {
    expect(src).toContain('Push Patch Pull-Up Challenge');
    expect(src).toContain('Start videos due Nov 25.');
    expect(src).toContain('Two divisions, the same age- and bodyweight-adjusted improvement formula.');
    expect(src).toContain('That is the whole idea. Everything below is the fine print that keeps it fair.');
    expect(src).not.toContain('[link coming]');
    expect(src).toContain('https://my4mlife.com/pullup');
  });

  it('has the PART 2 division sentences', () => {
    for (const s of [
      'Women compete only against the other women in the women\'s division, not against me.',
      'I am competing in my division under the same formula and age bonus.',
      'Both divisions use this exact formula.',
      'The women\'s division is scored separately.',
      'That does not affect the separate women\'s prize. Women compete only against the other women.',
      'the next-highest score in the same division is contacted, subject to the host-score condition in my division.',
      'Each division is scored separately using the formula below.',
    ]) expect(src).toContain(s);
  });

  it('has none of the removed old rule text', () => {
    for (const s of [
      'Two divisions, men\'s and women\'s. Most improved',
      'no host to beat',
      'Enter the division that matches your sex',
      'One winner in each division',
      'If a guest host joins',
      'HOW I COMPETE',
      '[link coming]',
      'the one that matches your sex',
    ]) expect(src).not.toContain(s);
  });

  it('has a required Division radio group after bodyweight, before the Instagram link', () => {
    const radios = raw.match(/<input[^>]*type="radio"[^>]*name="division"[^>]*>/g) ?? [];
    expect(radios).toHaveLength(2);
    for (const r of radios) expect(r).toMatch(/\brequired\b/);
    expect(radios.some((r) => /value="men"/.test(r))).toBe(true);
    expect(radios.some((r) => /value="women"/.test(r))).toBe(true);
    expect(raw).toMatch(/<legend>Division<\/legend>/);
    expect(raw).toContain("Men's division (compete against Dr. TJ)</label>");
    expect(raw).toContain("Women's division</label>");
    const i = raw.indexOf('name="bodyweightLb"'), d = raw.indexOf('name="division"'), ig = raw.indexOf('name="instagramUrl"');
    expect(i).toBeGreaterThan(0);
    expect(d).toBeGreaterThan(i);
    expect(ig).toBeGreaterThan(d);
    expect(raw).toMatch(/class="pu-opt"><input type="radio" name="division"/);
  });

  it('opt-in boxes are unchecked and have consent text with privacy links', () => {
    expect(src).toMatch(/name="smsOptIn"/);
    expect(src).toMatch(/name="emailOptIn"/);
    for (const tag of src.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? []) {
      expect(tag).not.toMatch(/\bchecked\b/);
    }
    expect(src).toContain('By checking this box, you agree to receive recurring automated marketing text messages from My4MLife at the number provided. Consent is not a condition of entry or purchase. Msg &amp; data rates may apply. Msg frequency varies. Reply STOP to cancel, HELP for help.');
    expect(src).toContain('By checking this box, you agree to receive marketing emails from My4MLife. Consent is not a condition of entry. Unsubscribe anytime.');
    expect(src).toContain('Entering is not consent to marketing.');
    expect(src).toContain('Text me updates and offers from My4MLife');
    expect(src).toContain('Email me updates and offers from My4MLife');
  });

  it('has the required 18+ rules checkbox', () => {
    expect(src).toContain('I am 18 or older, a legal resident of the United States, and I have read and agree to the rules.');
    expect(src).toMatch(/name="rulesAccepted"[^>]*required|required[^>]*name="rulesAccepted"/);
  });

  it('posts the specified payload to the entry endpoint', () => {
    expect(src).toMatch(/\/api\/pullup-challenge-entry/);
    expect(src).toMatch(/method:\s*'POST'/);
    for (const k of ['name', 'email', 'phone', 'age', 'bodyweightLb', 'instagramUrl', 'round', 'division', 'rulesAccepted: true', 'smsOptIn', 'emailOptIn', "consentVersion: 'pullup-v1'", '...botFields(form)']) {
      expect(src).toContain(k);
    }
    expect(src).toMatch(/'start'/);
    expect(src).toMatch(/'final'/);
  });

  it('shows the server error text (400 validation, 409 duplicate) instead of a generic message', () => {
    expect(src).toMatch(/serverMsg = await res\.json\(\)/);
    expect(src).toContain("setErr(serverMsg ?? \"That didn't go through. Please try again.\")");
  });

  it('is indexable and keeps site chrome', () => {
    expect(src).not.toMatch(/noindex/i);
    expect(src).not.toMatch(/hideChrome/);
    expect(src).toContain('https://www.my4mlife.com/pullup');
  });

  describe('score calculator', () => {
    const calc = src.slice(src.indexOf('id="pu-calc"'), src.indexOf('aria-label="How I compete"'));
    it('sits after the SCORING examples and before the host callout', () => {
      const i = src.indexOf('id="pu-calc"');
      expect(i).toBeGreaterThan(src.indexOf('The women\'s division is scored separately.</p>'));
      expect(i).toBeLessThan(src.indexOf('aria-label="How I compete"'));
    });
    it('has the four labeled numeric inputs and required copy', () => {
      for (const s of ['Figure your score', 'Bodyweight (lb)', 'Age', 'Starting max reps', 'Final or goal reps',
        'inputmode="numeric"', 'Nothing you type here is sent or saved.']) expect(calc).toContain(s);
      for (const s of ["Dr. TJ's math example (men's division; not his official score)",
        'Only improvement counts. Your final count has to be higher than your starting count.',
        'more rep', 'to pass it', 'You tie it.']) expect(src + lib).toContain(s);
    });
    it('does no network calls and fires one propertyless PostHog event', () => {
      const script = src.slice(src.indexOf('// pu-calc:start'), src.indexOf('// pu-calc:end'));
      expect(script.length).toBeGreaterThan(50);
      expect(script).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon/);
      expect(script).toContain("posthog.capture('pullup_calc_used')");
      expect(script).not.toMatch(/capture\('pullup_calc_used',/);
    });
    it('accepts a decimal bodyweight; age and reps stay whole numbers', () => {
      const bw = calc.match(/<input id="pc-bw"[^>]*>/)?.[0] ?? '';
      expect(bw).toContain('inputmode="decimal"');
      expect(bw).toContain('step="any"');
      for (const id of ['pc-age', 'pc-start', 'pc-final']) {
        const tag = calc.match(new RegExp(`<input id="${id}"[^>]*>`))?.[0] ?? '';
        expect(tag).toContain('step="1"');
        expect(tag).toContain('inputmode="numeric"');
      }
      expect(src).toContain("num(inp('pc-bw').value, 60, 600, false)");
    });
    it('has unique element ids and every calculator input has a label', () => {
      const ids = (src.match(/\bid="[^"]+"/g) ?? []).map((m) => m.slice(4, -1));
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of (calc.match(/<input id="([^"]+)"/g) ?? []).map((m) => m.slice(11, -1))) {
        expect(calc).toContain(`<label for="${id}">`);
      }
    });
    it('reports ties from the shared lib instead of its own comparison', () => {
      const script = src.slice(src.indexOf('// pu-calc:start'), src.indexOf('// pu-calc:end'));
      expect(script).toContain('standingText(i, b.score)');
      expect(script).not.toMatch(/mine > b\.score/);
    });
  });
});
