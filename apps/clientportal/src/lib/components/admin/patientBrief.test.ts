/**
 * patientBrief — pure parse/serialize helpers for coordinator briefs and
 * plans-of-action. No network, no Svelte state — safe to unit test directly.
 */

import { describe, it, expect } from 'vitest';
import { parseBrief, parsePlan, emptyPlan, planToJson, latestFor } from './patientBrief.js';

describe('parseBrief', () => {
  it('parses a valid brief JSON string', () => {
    const json = JSON.stringify({
      summary: 'Patient reports chronic bloating and brain fog.',
      why_now: 'Symptoms escalating over 6 weeks.',
      assessment_readout: [{ category: 'gut', score: 7, note: 'High permeability risk' }],
      red_flags: ['unintended weight loss'],
      recommended_lanes: [
        { lane: 'gut-repair', rationale: 'Primary complaint', visit_type: 'async', price: 129 },
      ],
      questions_to_ask: ['How long have symptoms persisted?'],
      suggested_plan_outline: ['Start Biome NS Ultra', 'Recheck in 30 days'],
    });

    const brief = parseBrief(json);

    expect(brief).not.toBeNull();
    expect(brief?.summary).toBe('Patient reports chronic bloating and brain fog.');
    expect(brief?.assessment_readout[0].category).toBe('gut');
    expect(brief?.recommended_lanes[0].price).toBe(129);
    expect(brief?.red_flags).toEqual(['unintended weight loss']);
  });

  it('returns null on malformed JSON without throwing', () => {
    expect(() => parseBrief('{not valid json')).not.toThrow();
    expect(parseBrief('{not valid json')).toBeNull();
  });

  it('returns null on null or undefined input', () => {
    expect(parseBrief(null)).toBeNull();
    expect(parseBrief(undefined)).toBeNull();
  });

  it('returns null when parsed value is not a brief-shaped object', () => {
    expect(parseBrief('42')).toBeNull();
    expect(parseBrief('"just a string"')).toBeNull();
    expect(parseBrief('[]')).toBeNull();
    expect(parseBrief('{}')).toBeNull();
  });
});

describe('parsePlan', () => {
  const validPlanJson = JSON.stringify({
    subject: 'Your plan of action',
    greeting: 'Hi Jane,',
    summary_of_call: 'We discussed your gut symptoms and next steps.',
    plan_steps: [{ step: 'Start Biome NS Ultra', why: 'Repair gut lining', link: 'https://my4mlife.com/products/biome-ns' }],
    next_step_cta: { label: 'Book follow-up', url: 'https://my4mlife.com/consult' },
    disclaimer: 'This is not a substitute for in-person care.',
  });

  it('parses a valid plan JSON string', () => {
    const plan = parsePlan(validPlanJson);

    expect(plan).not.toBeNull();
    expect(plan?.subject).toBe('Your plan of action');
    expect(plan?.plan_steps).toHaveLength(1);
    expect(plan?.next_step_cta.url).toBe('https://my4mlife.com/consult');
  });

  it('returns null on malformed JSON without throwing', () => {
    expect(() => parsePlan('not json at all {{{')).not.toThrow();
    expect(parsePlan('not json at all {{{')).toBeNull();
  });

  it('returns null on null or undefined input', () => {
    expect(parsePlan(null)).toBeNull();
    expect(parsePlan(undefined)).toBeNull();
  });

  it('round trips through planToJson and parsePlan', () => {
    const plan = parsePlan(validPlanJson);
    expect(plan).not.toBeNull();
    const roundTripped = parsePlan(planToJson(plan!));
    expect(roundTripped).toEqual(plan);
  });
});

describe('emptyPlan', () => {
  it('returns a blank, well-formed plan', () => {
    const plan = emptyPlan();
    expect(plan.subject).toBe('');
    expect(plan.greeting).toBe('');
    expect(plan.summary_of_call).toBe('');
    expect(plan.plan_steps).toEqual([]);
    expect(plan.next_step_cta).toEqual({ label: '', url: '' });
    expect(plan.disclaimer).toBe('');
  });

  it('is round-trippable through planToJson/parsePlan', () => {
    const plan = emptyPlan();
    expect(parsePlan(planToJson(plan))).toEqual(plan);
  });
});

describe('planToJson', () => {
  it('produces a JSON string parseable back into an equivalent plan', () => {
    const plan = emptyPlan();
    plan.subject = 'Test subject';
    plan.plan_steps.push({ step: 'Do a thing', why: 'Because', link: '' });
    const json = planToJson(plan);
    expect(typeof json).toBe('string');
    expect(JSON.parse(json).subject).toBe('Test subject');
  });
});

describe('latestFor', () => {
  type Item = { encounterId: string; createdAt: string };

  it('returns the matching item for a given encounterId', () => {
    const items: Item[] = [
      { encounterId: 'enc-1', createdAt: '2026-01-01T00:00:00Z' },
      { encounterId: 'enc-2', createdAt: '2026-01-02T00:00:00Z' },
    ];
    expect(latestFor(items, 'enc-2')).toEqual(items[1]);
  });

  it('returns the last matching entry when an encounter has multiple items', () => {
    const items: Item[] = [
      { encounterId: 'enc-1', createdAt: '2026-01-01T00:00:00Z' },
      { encounterId: 'enc-1', createdAt: '2026-01-05T00:00:00Z' },
      { encounterId: 'enc-2', createdAt: '2026-01-02T00:00:00Z' },
    ];
    expect(latestFor(items, 'enc-1')).toEqual(items[1]);
  });

  it('returns undefined when no item matches', () => {
    const items: Item[] = [{ encounterId: 'enc-1', createdAt: '2026-01-01T00:00:00Z' }];
    expect(latestFor(items, 'enc-9')).toBeUndefined();
  });

  it('returns undefined for an empty list', () => {
    expect(latestFor([], 'enc-1')).toBeUndefined();
  });
});
