import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(new URL('../src/pages/_pullup.astro', import.meta.url), 'utf8');

describe('pullup challenge page', () => {
  it('has verbatim rule sentences from across the sections', () => {
    for (const s of [
      'Score = (final max reps - starting max reps) x bodyweight in pounds x age multiplier',
      'Age multiplier: add 1% for every year over 30, with no cap.',
      'Entries with edited, cut, or cropped videos are disqualified.',
      'Full body in frame, head to feet. Feet off the ground for every rep.',
      'One winner: a six-week Push Patch package of the winner\'s choice (a $550+ value).',
      'This promotion is in no way sponsored, endorsed or administered by, or associated with, Meta Platforms, Inc., Facebook or Instagram. By entering, each entrant fully releases Meta Platforms, Inc., Facebook and Instagram from any and all liability in connection with this promotion. Questions about the challenge go to my4Mlife, not to Meta.',
      'Sponsor: My4MLIFE LLC, operating as my4Mlife, 1205 Hall Johnson Rd, Colleyville, TX 76034.',
    ]) expect(src).toContain(s);
  });

  it('has headline, short version and no leftover placeholders', () => {
    expect(src).toContain('Push Patch Pull-Up Challenge');
    expect(src).toContain('Most improved pull-ups wins a six-week Push Patch package.');
    expect(src).not.toContain('[link coming]');
    expect(src).toContain('https://my4mlife.com/pullup');
  });

  it('opt-in boxes are unchecked and have consent text with privacy links', () => {
    expect(src).toMatch(/name="smsOptIn"/);
    expect(src).toMatch(/name="emailOptIn"/);
    for (const tag of src.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? []) {
      expect(tag).not.toMatch(/\bchecked\b/);
    }
    expect(src).toContain('By checking this box, you agree to receive recurring automated marketing text messages from my4Mlife at the number provided. Consent is not a condition of entry or purchase. Msg &amp; data rates may apply. Msg frequency varies. Reply STOP to cancel, HELP for help.');
    expect(src).toContain('By checking this box, you agree to receive marketing emails from my4Mlife. Consent is not a condition of entry. Unsubscribe anytime.');
    expect(src).toContain('Entering is not consent to marketing.');
    expect(src).toContain('Text me updates and offers from my4Mlife');
    expect(src).toContain('Email me updates and offers from my4Mlife');
  });

  it('has the required 18+ rules checkbox', () => {
    expect(src).toContain('I am 18 or older, a legal resident of the United States, and I have read and agree to the rules.');
    expect(src).toMatch(/name="rulesAccepted"[^>]*required|required[^>]*name="rulesAccepted"/);
  });

  it('posts the specified payload to the entry endpoint', () => {
    expect(src).toMatch(/\/api\/pullup-challenge-entry/);
    expect(src).toMatch(/method:\s*'POST'/);
    for (const k of ['name', 'email', 'phone', 'age', 'bodyweightLb', 'instagramUrl', 'round', 'rulesAccepted: true', 'smsOptIn', 'emailOptIn', "consentVersion: 'pullup-v1'", '...botFields(form)']) {
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
});
