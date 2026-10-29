import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Runs the REAL inline script from PromoBanner.astro against a fake DOM and a fake Date.now().
const src = readFileSync(new URL('./PromoBanner.astro', import.meta.url), 'utf8');
const script = /<script is:inline>([\s\S]*?)<\/script>/.exec(src)![1];
const ENDS = '2026-11-01T04:59:59Z'; // 2026-10-31 23:59:59 CDT

function run(nowIso: string, clipboard?: { writeText: (t: string) => Promise<void> }) {
  const handlers: Record<string, () => void> = {};
  const btn = {
    textContent: 'Copy code',
    getAttribute: () => 'OCT2026',
    addEventListener: (ev: string, fn: () => void) => { handlers[ev] = fn; },
  };
  const banner: any = {
    hidden: false,
    getAttribute: () => ENDS,
    querySelector: () => btn,
  };
  const RealDate = Date;
  const fakeNow = RealDate.parse(nowIso);
  class FakeDate extends RealDate {
    static now() { return fakeNow; }
  }
  const ctx: any = {
    Date: FakeDate,
    document: { querySelectorAll: () => [banner], createElement: () => ({ style: {}, setAttribute() {}, select() {} }), body: { appendChild() {}, removeChild() {} } },
    navigator: { clipboard },
    setTimeout: () => 0,
  };
  vm.runInNewContext(script, ctx);
  return { banner, btn, handlers };
}

describe('PromoBanner client-side expiry', () => {
  it('stays visible before the deadline', () => {
    expect(run('2026-10-31T23:59:58-05:00').banner.hidden).toBe(false);
  });
  it('hides after 2026-10-31 23:59:59 CT', () => {
    expect(run('2026-11-01T00:00:00-05:00').banner.hidden).toBe(true);
    expect(run('2026-11-02T12:00:00Z').banner.hidden).toBe(true);
  });
  it('copy button shows Copied when the clipboard API works', async () => {
    let copied = '';
    const { btn, handlers } = run('2026-10-29T12:00:00Z', { writeText: async (t) => { copied = t; } });
    handlers.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(copied).toBe('OCT2026');
    expect(btn.textContent).toBe('Copied');
  });
  it('degrades gracefully when the clipboard API is missing', () => {
    const { btn, handlers } = run('2026-10-29T12:00:00Z', undefined);
    expect(() => handlers.click()).not.toThrow();
    expect(btn.textContent).toBe('Select the code to copy');
  });
});
