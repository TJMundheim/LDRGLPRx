import { describe, it, expect } from 'vitest';
import { who, normalizeSex } from './sex';

describe('normalizeSex', () => {
  it('accepts only the two stored values', () => {
    expect(normalizeSex('female')).toBe('female');
    expect(normalizeSex('male')).toBe('male');
  });

  it('treats anything else as unknown', () => {
    for (const v of [null, undefined, '', 'Female', 'MALE', 'other', 0, {}, []]) {
      expect(normalizeSex(v)).toBeNull();
    }
  });
});

describe('who()', () => {
  it('returns female copy for female', () => {
    const w = who('female');
    expect(w.noun).toBe('woman');
    expect(w.whyLabel).toContain('the woman I want to be at age 70');
    expect(w.accountabilityPlaceholder).toMatch(/^e\.g\. my husband, my wife, my kids, my parents, myself/);
    expect(w.identityLabel).toContain('I am a woman who');
    expect(w.identityEvolveLabel).toContain('The woman I am becoming');
    expect(w.w4Closing).toBe('The woman who finishes Month 1 is not the same one who started it.');
    expect(w.commitmentSentence).toContain('the woman I am becoming is worth protecting');
    expect(w.w4MotivateQuestion).toContain('who is the woman who completed Month 1');
    expect(w.showWomensTrack).toBe(true);
    expect(w.showMensTrack).toBe(false);
    expect(w.stackHormoneNote).toContain('estradiol, progesterone, and testosterone');
  });

  it('returns male copy for male', () => {
    const w = who('male');
    expect(w.noun).toBe('man');
    expect(w.whyLabel).toContain('the man I want to be at age 70');
    expect(w.accountabilityPlaceholder).toMatch(/^e\.g\. my wife, my husband, my kids, my parents, myself/);
    expect(w.identityLabel).toContain('I am a man who');
    expect(w.identityEvolveLabel).toContain('The man I am becoming');
    expect(w.w4Closing).toBe('The man who finishes Month 1 is not the same one who started it.');
    expect(w.commitmentSentence).toContain('the man I am becoming is worth protecting');
    expect(w.showMensTrack).toBe(true);
    expect(w.showWomensTrack).toBe(false);
  });

  it('falls back to the paired copy when sex is unknown', () => {
    for (const v of [null, undefined, 'nonsense']) {
      const w = who(v);
      expect(w.whyLabel).toBe('My "why" — the man or woman I want to be at age 70');
      expect(w.identityPlaceholder).toBe('I am a man who... / I am a woman who...');
      expect(w.w4Closing).toContain('The man or woman who finishes Month 1');
      expect(w.commitmentSentence).toContain('who I am becoming is worth protecting');
      // Unknown shows both Week 3 tracks, as the printed Logbook does.
      expect(w.showMensTrack).toBe(true);
      expect(w.showWomensTrack).toBe(true);
    }
  });

  it('never emits the "men and women" phrase', () => {
    for (const v of ['female', 'male', null]) {
      const values = Object.values(who(v)).filter(x => typeof x === 'string').join(' ');
      expect(values.toLowerCase()).not.toContain('men and women');
    }
  });
});
