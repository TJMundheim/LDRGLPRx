import { describe, it, expect } from 'vitest';
import { parseScreening, screeningLines, type ScreeningAnswers } from './screening';

// `screen_denied` lists the knockout questions the patient DENIED (answered No). A cleared patient denies all three.
const V2_CLEARED = {
  screen_v: 'pp-screen-v2', screen_at: '2026-10-16T14:00:00.000Z', screen_denied: 'seizures,pacemaker,pregnant',
  screen_placement: 'woundOrScar:no', screen_area: 'yes',
};
const V1_CLEARED = {
  screen_v: 'pp-screen-v1', screen_at: '2026-10-02T12:00:00.000Z', screen_denied: 'seizures,pacemaker,pregnant',
  screen_placement: 'metalImplant:no,woundOrScar:no', screen_area: 'yes',
};

describe('parseScreening: a cleared patient (denied every knockout) reads as No', () => {
  it('v2: knockouts false, suitableArea true, woundOrScar false', () => {
    const s = parseScreening(V2_CLEARED) as ScreeningAnswers;
    expect(s.denied).toEqual(['seizures', 'pacemaker', 'pregnant']);
    expect(s.answers.seizures).toBe(false);
    expect(s.answers.pacemaker).toBe(false);
    expect(s.answers.pregnant).toBe(false);
    expect(s.suitableArea).toBe(true);
    expect(s.answers.suitableArea).toBe(true);
    expect(s.answers.woundOrScar).toBe(false);
    expect(s.answers).not.toHaveProperty('metalImplant');
  });

  it('v1: knockouts false, metalImplant and woundOrScar false', () => {
    const s = parseScreening(V1_CLEARED) as ScreeningAnswers;
    expect(s.answers).toEqual({ seizures: false, pacemaker: false, pregnant: false, metalImplant: false, woundOrScar: false, suitableArea: true });
  });

  it('a knockout missing from denied reads as Yes', () => {
    const s = parseScreening({ ...V2_CLEARED, screen_denied: 'seizures,pregnant' }) as ScreeningAnswers;
    expect(s.answers).toMatchObject({ seizures: false, pacemaker: true, pregnant: false });
  });

  it('no screen_v is "none"', () => {
    expect(parseScreening({})).toEqual({ version: 'none' });
  });
});

describe('screeningLines for a cleared patient', () => {
  it('v2 prints No for the three knockouts and the wound, Yes for the area', () => {
    const lines = screeningLines(parseScreening(V2_CLEARED));
    expect(lines).toContain('Epilepsy or seizures: No');
    expect(lines).toContain('Pacemaker or implanted electronic device: No');
    expect(lines).toContain('Pregnant or could be pregnant: No');
    expect(lines).toContain('Suitable clean, low-hair skin area away from any metal implant: Yes');
    expect(lines).toContain('Open wound, recent graft or scar where the patch may be worn: No');
    expect(lines.join('\n')).not.toContain('told to choose another area');
  });

  it('v1 prints No for knockouts, metal implant and wound', () => {
    const lines = screeningLines(parseScreening(V1_CLEARED));
    expect(lines).toContain('Epilepsy or seizures: No');
    expect(lines).toContain('Pacemaker or implanted electronic device: No');
    expect(lines).toContain('Pregnant or could be pregnant: No');
    expect(lines).toContain('Metal implant where the patch may be worn: No');
    expect(lines).toContain('Open wound, recent graft or scar where the patch may be worn: No');
    expect(lines).toContain('Suitable clean, low-hair skin area available: Yes');
  });
});
