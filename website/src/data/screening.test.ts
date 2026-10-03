import { describe, it, expect } from 'vitest';
import { SCREENING, SCREENING_VERSION } from './screening';

describe('push-patch screening config (pp-screen-v2)', () => {
  const c = SCREENING['push-patch'];
  it('is version v2', () => expect(SCREENING_VERSION).toBe('pp-screen-v2'));
  it('safety group = seizures, pacemaker, pregnant (knockouts)', () => {
    expect(c.knockouts.map((k) => k.id)).toEqual(['seizures', 'pacemaker', 'pregnant']);
  });
  it('wear group order = suitableArea then woundOrScar; no metalImplant anywhere', () => {
    expect(c.noSuitableAreaId).toBe('suitableArea');
    expect(c.placement.map((p) => p.id)).toEqual(['woundOrScar']);
    expect(JSON.stringify(c)).not.toContain('metalImplant');
  });
  it('merged question wording and wound note are exact', () => {
    expect(c.suitableAreaQuestion).toBe(
      'Is there at least one area of clean, easy-to-reach skin with little or no hair, away from any metal implant (plate, screws, rods or a joint replacement), where you could wear the patch?');
    expect(c.placement[0].ifYes).toBe('No problem. Choose an area away from the wound or scar.');
  });
});
