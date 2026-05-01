import { describe, it, expect, beforeEach } from 'vitest';
import { detectReturningUser, fillNeutralDefaults } from './intakeMigration';
import { DISCOVERY } from './discovery';

// Minimal in-memory Storage implementation
function makeStorage(initial: Record<string, string> = {}): Storage {
  const store: Record<string, string> = { ...initial };
  return {
    length: 0,
    key: () => null,
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  } as unknown as Storage;
}

describe('detectReturningUser', () => {
  it('fresh — empty storage', () => {
    const s = makeStorage();
    expect(detectReturningUser(s).kind).toBe('fresh');
  });

  it('returning-completed — intake-complete-v1 set', () => {
    const s = makeStorage({
      'intake-complete-v1': JSON.stringify({ completedAt: '2025-01-01T00:00:00.000Z' }),
    });
    expect(detectReturningUser(s).kind).toBe('returning-completed');
  });

  it('returning-legacy — gut answers, no discovery', () => {
    const s = makeStorage({
      'gut-assessment-v1': JSON.stringify({ answers: { '0': true, '1': false } }),
    });
    expect(detectReturningUser(s).kind).toBe('returning-legacy');
  });

  it('returning-legacy — allergy answers, discovery has <5 categories', () => {
    const partialDiscovery = {
      answers: { 'sleep': { anchor: 3 }, 'stress': { anchor: 2 } },
      currentCategoryIndex: 2,
      startedAt: '2025-01-01T00:00:00.000Z',
    };
    const s = makeStorage({
      'allergy-assessment-v1': JSON.stringify({ answers: { '0': true } }),
      'discovery-v1': JSON.stringify(partialDiscovery),
    });
    expect(detectReturningUser(s).kind).toBe('returning-legacy');
  });

  it('in-flight — stage set, 3 categories answered', () => {
    const answers: Record<string, Record<string, unknown>> = {};
    DISCOVERY.slice(0, 3).forEach(cat => { answers[cat.id] = { [cat.anchorKey]: false }; });
    const s = makeStorage({
      'intake-stage-v1': JSON.stringify({ currentStage: 2 }),
      'discovery-v1': JSON.stringify({ answers, currentCategoryIndex: 3, startedAt: '' }),
    });
    expect(detectReturningUser(s).kind).toBe('in-flight');
  });

  it('fresh — stage set but currentStage=0 and no answers', () => {
    const s = makeStorage({
      'intake-stage-v1': JSON.stringify({ currentStage: 0 }),
    });
    expect(detectReturningUser(s).kind).toBe('fresh');
  });
});

describe('fillNeutralDefaults', () => {
  it('fills all 20 categories on empty storage', () => {
    const s = makeStorage();
    const filled = fillNeutralDefaults(s);
    expect(filled).toBe(20);
    const state = JSON.parse(s.getItem('discovery-v1')!);
    expect(Object.keys(state.answers)).toHaveLength(20);
  });

  it('does not overwrite already-answered categories', () => {
    const answers: Record<string, Record<string, unknown>> = {};
    DISCOVERY.slice(0, 5).forEach(cat => { answers[cat.id] = { [cat.anchorKey]: true }; });
    const s = makeStorage({
      'discovery-v1': JSON.stringify({ answers, currentCategoryIndex: 5, startedAt: '' }),
    });
    const filled = fillNeutralDefaults(s);
    expect(filled).toBe(15);
  });

  it('neutral values produce score=0 for yesno anchor categories', () => {
    const s = makeStorage();
    fillNeutralDefaults(s);
    const state = JSON.parse(s.getItem('discovery-v1')!);
    // spot check: 'gut-microbiome' anchor=false → score should be 0
    const gutAns = state.answers['gut-microbiome'];
    expect(gutAns['anchor']).toBe(false);
  });

  it('sets currentCategoryIndex to DISCOVERY.length', () => {
    const s = makeStorage();
    fillNeutralDefaults(s);
    const state = JSON.parse(s.getItem('discovery-v1')!);
    expect(state.currentCategoryIndex).toBe(DISCOVERY.length);
  });
});
