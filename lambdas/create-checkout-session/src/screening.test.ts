import { describe, it, expect } from 'vitest';
import { evaluateScreening } from './screening';

const ok = { seizures: false, pacemaker: false, pregnant: false, metalImplant: true, woundOrScar: false, suitableArea: true };

describe('evaluateScreening', () => {
  it('passes with metadata', () => {
    const r = evaluateScreening({ version: 'pp-screen-v1', answers: ok });
    expect(r).toMatchObject({ ok: true });
    if (r.ok) {
      expect(r.metadata).toMatchObject({ screen_v: 'pp-screen-v1', screen_denied: 'seizures,pacemaker,pregnant', screen_placement: 'metalImplant:yes,woundOrScar:no', screen_area: 'yes' });
    }
  });
  it('knockouts', () => {
    expect(evaluateScreening({ version: 'pp-screen-v1', answers: { ...ok, seizures: true } })).toEqual({ ok: false, reason: 'not eligible' });
  });
  it('invalid', () => {
    expect(evaluateScreening(null)).toEqual({ ok: false, reason: 'screening required' });
    expect(evaluateScreening({ version: 'x', answers: ok })).toEqual({ ok: false, reason: 'screening required' });
  });
});
