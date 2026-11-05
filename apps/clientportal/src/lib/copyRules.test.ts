import { describe, it, expect } from 'vitest';
import { renderPage } from './renderer';
import { createEmptyWorkbook } from './data/schema';
import { factorLabel } from './factorLabels';
import { factors } from './content/factors';
import { AUDIT_ID_TO_FACTOR_NAME } from './renderer';

const TABS = ['dash', 'w1', 'w2', 'w3', 'w4', 'regen'];
function all(sex: 'female' | 'male' | null): string {
  return TABS.map(curTab => {
    try {
      return renderPage({ W: createEmptyWorkbook('wb', 'u'), curTab, openFactor: null, factorTab: 'imm', sex });
    } catch { return ''; }
  }).join('\n');
}

describe('audit-vs-app copy rules (2026-11-04)', () => {
  it('no erectile-dysfunction label on the dashboard', () => {
    expect(factorLabel('erectile-dysfunction')).toBe('Sexual function');
    expect(factorLabel('hormone-balance')).toBe('Hormones');
  });
  it('hormones priority maps to a real hormone factor with hormone actions', () => {
    const name = AUDIT_ID_TO_FACTOR_NAME['hormone-balance'];
    expect(name).toBe('Hormones & the canaries');
    expect(AUDIT_ID_TO_FACTOR_NAME['erectile-dysfunction']).toBe(name);
    const f = factors.find(x => x.name === name);
    expect(f).toBeTruthy();
    expect(f!.imm.join(' ')).toContain('my4mlife.com/consult');
  });
  it('rendered pages carry no 14:10, Ultima, or unlock-next-week copy', () => {
    for (const s of ['female', 'male', null] as const) {
      const h = all(s);
      expect(h).not.toContain('14:10');
      expect(h).not.toContain('Ultima');
      expect(h).not.toMatch(/unlocks? next week/i);
      expect(h).not.toContain('Removed a duplicate log');
      expect(h).not.toContain('/50');
    }
  });
  it('protein target is 1 g/lb ideal body weight, not x0.9', () => {
    const txt = JSON.stringify(factors);
    expect(txt).not.toContain('× 0.9');
    expect(txt).not.toContain('App community');
  });
  it('women never see an ED prompt in the female render', () => {
    expect(all('female').replace(/<[^>]*>/g, '')).not.toMatch(/erectile/i);
  });
});
