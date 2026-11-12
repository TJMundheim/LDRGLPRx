import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(new URL('../src/pages/pullup.astro', import.meta.url), 'utf8');
const raw = src;

describe('pullup challenge page', () => {
  it('has verbatim rule sentences from across the sections', () => {
    for (const s of [
      'Score = (final max reps - starting max reps) x bodyweight in pounds x age multiplier',
      'Age multiplier: add 1% for every year over 30, with no cap.',
      'Entries with edited, cut, or cropped videos are disqualified.',
      'Full body in frame, head to feet. Feet off the ground for every rep.',
      'One winner in each division, men\'s and women\'s: a six-week Push Patch package of the winner\'s choice (a $550+ value each).',
      'This promotion is in no way sponsored, endorsed or administered by, or associated with, Meta Platforms, Inc., Facebook or Instagram. By entering, each entrant fully releases Meta Platforms, Inc., Facebook and Instagram from any and all liability in connection with this promotion. Questions about the challenge go to my4Mlife, not to Meta.',
      'Sponsor: My4MLIFE LLC, operating as my4Mlife, 1205 Hall Johnson Rd, Colleyville, TX 76034.',
    ]) expect(src).toContain(s);
  });

  it('has headline, short version and no leftover placeholders', () => {
    expect(src).toContain('Push Patch Pull-Up Challenge');
    expect(src).toContain('Most improved pull-ups in each division wins a six-week Push Patch package.');
    expect(src).not.toContain('[link coming]');
    expect(src).toContain('https://my4mlife.com/pullup');
  });

  it('has the approved two-division sentences', () => {
    for (const s of [
      'Two divisions, men\'s and women\'s. Most improved pull-ups in each division wins a six-week Push Patch package. Film your max set, post it, train, film again. In the men\'s division, beat my adjusted score and the patches are yours; if nobody does, I keep them.',
      'Most improved in each division wins a six-week Push Patch package of their choice.',
      'I am competing too in the men\'s division, under the same formula and the same age bonus as everyone else. If my adjusted score beats the top men\'s challenger\'s, I keep the men\'s patches. The women\'s division has no host to beat: the most improved woman wins.',
      'Posting it on Facebook too is encouraged, but never required.',
      'bodyweight, choose your division (men\'s or women\'s, the one that matches your sex), and paste the link to your public Instagram post. One entry per person.',
      'Each division\'s winner is scored on the formula below',
      'bodyweight, pick your division, and paste the link. That is a complete entry.',
      'There are two divisions, men\'s and women\'s, and you are scored only against your own division: men against men and me, women against women.',
      'which beats the 40 year old in the same division.',
      'Beat that in the men\'s division and the patches are yours.',
      'If my adjusted score beats the top men\'s challenger, I keep the patches. That is the game.',
      'The women\'s division has no host to beat: the most improved woman wins her package. If a guest host joins the women\'s side later, she competes for show only and cannot affect the women\'s prize.',
      'Enter the division that matches your sex. An entry in the wrong division is moved to the correct division and scored there.',
      'If my adjusted score beats the top men\'s challenger\'s, no prize is awarded in the men\'s division and I keep the patches. That is the game.',
      'Each division\'s winner is contacted at the email or phone number from their entry',
      'If a winner does not respond, or is disqualified, the next-highest score in that division is contacted.',
      'judged on the posted formula and video requirements, with one winner per division (men\'s and women\'s), not a random drawing.',
    ]) expect(src).toContain(s);
  });

  it('has no women\'s host placeholders, object, tag sentence or example', () => {
    expect(src).not.toContain('[HER');
    expect(src).not.toContain('WOMENS_HOST');
    expect(src).not.toContain('[link coming]');
    expect(src).not.toContain('Same math for [');
    expect(src).not.toContain('welcome to tag');
    expect(src).not.toContain('who hosts the women');
    expect(src).toContain('no host to beat');
  });

  it('no longer has the old single-winner wording', () => {
    expect(src).not.toContain('If my adjusted score beats the top challenger\'s, no prize is awarded and I keep the patches.');
    expect(src).not.toContain('Beat my adjusted score and the patches are yours; if nobody does, I keep them.');
    expect(src).not.toContain('One winner: a six-week');
    expect(src).not.toContain('If my adjusted score beats the top challenger, I keep the patches.');
  });

  it('has a required Division radio group after bodyweight, before the Instagram link', () => {
    const radios = raw.match(/<input[^>]*type="radio"[^>]*name="division"[^>]*>/g) ?? [];
    expect(radios).toHaveLength(2);
    for (const r of radios) expect(r).toMatch(/\brequired\b/);
    expect(radios.some((r) => /value="men"/.test(r))).toBe(true);
    expect(radios.some((r) => /value="women"/.test(r))).toBe(true);
    expect(raw).toMatch(/<legend>Division<\/legend>/);
    expect(raw).toContain("Men's</label>");
    expect(raw).toContain("Women's</label>");
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
});
