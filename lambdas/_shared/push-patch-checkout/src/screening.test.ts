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

  const okV2 = { seizures: false, pacemaker: false, pregnant: false, woundOrScar: true, suitableArea: true };
  it('v2 passes with metadata', () => {
    const r = evaluateScreening({ version: 'pp-screen-v2', answers: okV2 });
    expect(r).toMatchObject({ ok: true });
    if (r.ok) {
      expect(r.metadata).toMatchObject({ screen_v: 'pp-screen-v2', screen_denied: 'seizures,pacemaker,pregnant', screen_placement: 'woundOrScar:yes', screen_area: 'yes' });
    }
  });
  it('v2 knockouts and no suitable area', () => {
    expect(evaluateScreening({ version: 'pp-screen-v2', answers: { ...okV2, pacemaker: true } })).toEqual({ ok: false, reason: 'not eligible' });
    expect(evaluateScreening({ version: 'pp-screen-v2', answers: { ...okV2, suitableArea: false } })).toEqual({ ok: false, reason: 'not eligible' });
  });
  it('v2 requires exactly its keys; v1 keys under v2 and v2 keys under v1 are rejected', () => {
    expect(evaluateScreening({ version: 'pp-screen-v2', answers: { seizures: false } })).toEqual({ ok: false, reason: 'screening required' });
    expect(evaluateScreening({ version: 'pp-screen-v1', answers: okV2 })).toEqual({ ok: false, reason: 'screening required' });
    expect(evaluateScreening({ version: 'pp-screen-v2', answers: { ...okV2, woundOrScar: 'no' } })).toEqual({ ok: false, reason: 'screening required' });
  });
});

describe('evaluateScreening glp1', () => {
  const ids = ['pancreatitis', 'mtc-men2', 'pregnancy', 'type1-diabetes', 'under-18', 'gastroparesis', 'eating-disorder'];
  const clear = Object.fromEntries(ids.map((k) => [k, false]));
  it('passes with metadata and no area', () => {
    const r = evaluateScreening({ version: 'glp1-screen-v1', answers: clear }, 'glp1', new Date('2026-11-23T00:00:00Z'));
    expect(r).toMatchObject({ ok: true });
    if (r.ok) {
      expect(r.metadata).toMatchObject({ screen_v: 'glp1-screen-v1', screen_denied: ids.join(',') });
      expect(r.metadata).not.toHaveProperty('screen_area');
    }
  });
  it.each(ids)('%s true -> not eligible', (id) => {
    expect(evaluateScreening({ version: 'glp1-screen-v1', answers: { ...clear, [id]: true } }, 'glp1')).toEqual({ ok: false, reason: 'not eligible' });
  });
  it('missing answer or wrong lane version -> screening required', () => {
    const { pancreatitis, ...rest } = clear;
    expect(evaluateScreening({ version: 'glp1-screen-v1', answers: rest }, 'glp1')).toEqual({ ok: false, reason: 'screening required' });
    expect(evaluateScreening({ version: 'pp-screen-v2', answers: clear }, 'glp1')).toEqual({ ok: false, reason: 'screening required' });
    expect(evaluateScreening({ version: 'glp1-screen-v1', answers: clear }, 'nope')).toEqual({ ok: false, reason: 'screening required' });
  });
});
