// Contract test: the body the /go/glp-1 page builds (website/src/data/glp1.ts) must pass this lambda's validator
// and screening. Loaded by path (not a static import) so tsc's rootDir stays src/.
import { describe, it, expect } from 'vitest';
import { evaluateScreening } from '@my4mlife/push-patch-checkout';
import { validateGlp1PreIntake } from './validate-glp1';

const site = (p: string) => import(/* @vite-ignore */ new URL(`../../../website/src/data/${p}`, import.meta.url).href);

async function siteBody(over: { health?: Record<string, unknown>; testToken?: string; answers?: Record<string, boolean> } = {}) {
  const g = await site('glp1.ts');
  const { SCREENING } = await site('screening.ts');
  const answers = over.answers ?? Object.fromEntries(SCREENING.glp1.knockouts.map((k: { id: string }) => [k.id, false]));
  return g.buildGlp1Body({
    skuId: g.GLP1_PRODUCTS[1].skuId, autoShip: true, answers, typedName: 'Jane Q Doe',
    health: {
      dob: '1980-05-02', sex: 'female', heightFt: 5, heightIn: 6, weightLb: 200,
      conditions: g.GLP1_CONDITIONS.slice(0, 2).map((o: { id: string }) => o.id),
      safetyHistory: [g.GLP1_SAFETY_HISTORY.find((o: { id: string }) => o.id === 'none').id],
      priorGlp1: 'never', interactingMeds: ['none'], otherMeds: 'None', allergies: 'None', ...over.health,
    },
    contact: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '(555) 123-4567' },
    ...(over.testToken ? { testToken: over.testToken } : {}),
  });
}

describe('website /go/glp-1 body -> push-patch-intake GLP-1 validator', () => {
  it('passes validation and screening, with every website product SKU', async () => {
    const g = await site('glp1.ts');
    for (const p of g.GLP1_PRODUCTS) {
      const body = { ...(await siteBody()), skuId: p.skuId };
      const v = validateGlp1PreIntake(body);
      expect(v).toMatchObject({ ok: true, body: { skuId: p.skuId, autoShip: true, consentName: 'Jane Q Doe' } });
      expect(evaluateScreening(body.screening, 'glp1')).toMatchObject({ ok: true });
    }
  });

  it('website screening ids and version are exactly the lambda glp1 lane (all denied passes, any Yes blocks)', async () => {
    const { SCREENING } = await site('screening.ts');
    const g = await site('glp1.ts');
    const ids: string[] = SCREENING.glp1.knockouts.map((k: { id: string }) => k.id);
    const ok = evaluateScreening({ version: g.GLP1_SCREENING_VERSION, answers: Object.fromEntries(ids.map((i) => [i, false])) }, 'glp1');
    expect(ok.ok && ok.metadata['screen_denied']).toBe(ids.join(','));
    for (const id of ids) {
      const answers = Object.fromEntries(ids.map((i) => [i, i === id]));
      expect(g.failedKnockouts(answers)).toEqual([id]);
      expect(evaluateScreening({ version: g.GLP1_SCREENING_VERSION, answers }, 'glp1')).toEqual({ ok: false, reason: 'not eligible' });
    }
  });

  it('the private test token (sent as `t`) reaches the validator output', async () => {
    const v = validateGlp1PreIntake(await siteBody({ testToken: 'tok123' }));
    expect(v).toMatchObject({ ok: true, body: { testToken: 'tok123' } });
  });

  it('every weight the website form accepts (60-800 lb) passes the validator', async () => {
    for (const weightLb of [60, 450, 800]) {
      expect(validateGlp1PreIntake(await siteBody({ health: { weightLb, goalWeightLb: weightLb } })).ok).toBe(true);
    }
  });

  it('prior GLP-1 drug + dose from the form are kept', async () => {
    const v = validateGlp1PreIntake(await siteBody({ health: { priorGlp1: 'current', priorGlp1Drug: 'Ozempic', priorGlp1Dose: '1 mg weekly' } }));
    expect(v).toMatchObject({ ok: true, body: { health: { priorGlp1: 'current', priorGlp1Drug: 'Ozempic', priorGlp1Dose: '1 mg weekly' } } });
  });
});
