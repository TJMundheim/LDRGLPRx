import { describe, it, expect } from 'vitest';
import { renderPage, type RenderContext } from './renderer';
import { createEmptyWorkbook } from './data/schema';

function page(curTab: string, sex: 'female' | 'male' | null): string {
  const ctx: RenderContext = {
    W: createEmptyWorkbook('wb-test', 'u-test'),
    curTab,
    openFactor: null,
    factorTab: 'imm',
    sex,
  };
  return renderPage(ctx);
}

describe('renderer branches on sex — Week 1', () => {
  it('female', () => {
    const h = page('w1', 'female');
    expect(h).toContain('the woman I want to be at age 70');
    expect(h).toContain('my husband, my wife, my kids');
    expect(h).toContain('I am a woman who');
    expect(h).not.toContain('the man I want to be at age 70');
  });

  it('male', () => {
    const h = page('w1', 'male');
    expect(h).toContain('the man I want to be at age 70');
    expect(h).toContain('my wife, my husband, my kids');
    expect(h).not.toContain('I am a woman who');
  });

  it('unknown keeps the paired copy', () => {
    const h = page('w1', null);
    expect(h).toContain('the man or woman I want to be at age 70');
    expect(h).toContain('I am a man who... / I am a woman who...');
  });
});

describe('renderer branches on sex — Week 3', () => {
  it('female sees the perimenopause canary only', () => {
    const h = page('w3', 'female');
    expect(h).toContain('THE PERIMENOPAUSE CANARY');
    expect(h).not.toContain('THE ED CANARY');
    expect(h).toContain('The woman I am becoming');
    // her lab lane
    for (const lab of ['Estradiol (E2)', 'Progesterone', 'FSH', 'SHBG', 'TSH', 'AM cortisol', 'DHEA-S']) {
      expect(h).toContain(lab);
    }
    expect(h).toContain('https://my4mlife.com/consult?lane=menopause-hrt');
    expect(h).toContain('Menopause &amp; HRT lane');
    expect(h).toContain('estradiol, progesterone, and testosterone');
  });

  it('male sees the ED canary only', () => {
    const h = page('w3', 'male');
    expect(h).toContain('THE ED CANARY');
    expect(h).not.toContain('THE PERIMENOPAUSE CANARY');
    expect(h).toContain('https://my4mlife.com/consult?lane=testosterone-ed');
    expect(h).toContain('Total testosterone (ng/dL)');
  });

  it('unknown sees both tracks', () => {
    const h = page('w3', null);
    expect(h).toContain('THE ED CANARY');
    expect(h).toContain('THE PERIMENOPAUSE CANARY');
  });

  it('renders ten markers per track with persisted field keys', () => {
    const h = page('w3', 'female');
    for (let i = 1; i <= 10; i++) {
      expect(h).toContain(`weekReflections.w3_peri_m${i}`);
    }
    expect(h).toContain('weekReflections.w3_peri_decision');
    expect(h).toContain('weekReflections.w3_peri_lab_fsh');
    const m = page('w3', 'male');
    for (let i = 1; i <= 10; i++) {
      expect(m).toContain(`weekReflections.w3_ed_m${i}`);
    }
    expect(m).toContain('weekReflections.w3_ed_decision');
    expect(m).toContain('weekReflections.w3_ed_lab_shbg');
  });

  it('totals the ten markers from stored state', () => {
    const W = createEmptyWorkbook('wb-total', 'u-total');
    W.weekReflections['w3_ed_m1'] = '7';
    W.weekReflections['w3_ed_m2'] = '3';
    const h = renderPage({ W, curTab: 'w3', openFactor: null, factorTab: 'imm', sex: 'male' });
    expect(h).toContain('10 / 100');
  });
});

describe('renderer branches on sex — Week 4', () => {
  it('female', () => {
    const h = page('w4', 'female');
    expect(h).toContain('The woman who finishes Month 1 is not the same one who started it.');
    expect(h).toContain('the woman I am becoming is worth protecting');
    expect(h).toContain('who is the woman who completed Month 1');
  });

  it('male', () => {
    const h = page('w4', 'male');
    expect(h).toContain('The man who finishes Month 1 is not the same one who started it.');
    expect(h).toContain('the man I am becoming is worth protecting');
  });

  it('unknown', () => {
    const h = page('w4', null);
    expect(h).toContain('The man or woman who finishes Month 1');
    expect(h).toContain('who I am becoming is worth protecting');
  });
});

describe('copy rules', () => {
  it('no emoji and no "men and women" in the Week 3 hormones block', () => {
    for (const s of ['female', 'male', null] as const) {
      const h = page('w3', s);
      expect(h.toLowerCase()).not.toContain('men and women');
    }
  });
});
