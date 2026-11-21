import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const assess = read('../src/pages/assessment.astro');
const index = read('../src/pages/index.astro');
const consult = read('../src/pages/consult.astro');
const siteMode = read('../src/lib/siteMode.ts');
const deploySh = read('../deploy.sh');

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

describe('assessment event mode', () => {
  it('detects talk- src case-insensitively and persists it for the session', () => {
    expect(assess).toContain('/^talk(-|$)/i');
    expect(assess).toContain("sessionStorage.setItem('my4m_src'");
    expect(assess).toContain("sessionStorage.getItem('my4m_src'");
  });
  it('marks Rx-lane blocks and hides them in event mode', () => {
    expect(assess).toContain('data-rx-lane');
    // Fully :global selectors: navbar/footer/sticky CTA live in other components, so scoped selectors never matched (fixed 2026-11-20).
    expect(assess).toMatch(/:global\(\.event-mode \[data-rx-lane\]\)[^{]*\{[^}]*display:\s*none/);
    expect(assess).toContain(':global(.event-mode .navbar)');
    expect(assess).toContain(':global(.event-mode .footer-col:has(a[href^="/rx/"]))');
    expect(assess).toContain('id="results-diag-banner" data-rx-lane');
    expect(assess).toContain('id="results-coordinator-block" data-rx-lane');
  });
  it('renders the event thank-you block with the drawing, delivery, Zoom and call lines', () => {
    expect(assess).toContain('id="event-thanks"');
    expect(assess).toContain("You're entered in tonight's signed-book drawing.");
    expect(assess).toContain('Begin with the End in Mind');
    expect(assess).toContain('are in your email.');
    expect(assess).toContain('Join us Mondays at {ZOOM_TIME} on Zoom. Recorded every week and emailed to you.');
    expect(assess).toContain('Want to talk it through? A free 15-minute call with a care coordinator. We never call unless you ask.');
    expect(assess).toContain('/consult?src=');
    expect(assess).toContain("import { COORDINATOR_MODE, ZOOM_TIME }");
  });
  it('event-only thanks block is hidden by default (non-event unchanged)', () => {
    expect(assess).toMatch(/id="event-thanks"[^>]*hidden/);
    expect(assess).toContain('Show My MindSpan Baseline');
    expect(assess).toContain('Book your free care coordinator call');
    expect(assess).toContain('Read about your #');
    expect(assess).toContain('src: eventSrc() || undefined');
  });
  it('does not link top-3 to solution pages in event mode', () => {
    expect(assess).toMatch(/if \(isEvent\(\)\) \{\s*return '<li><div class="top3-plain"/);
  });
});

describe('sensitive questions: Prefer not to say', () => {
  it('offers the option on sexual function and hormones, in all modes', () => {
    expect(assess).toContain("SENSITIVE_IDS = ['erectile-dysfunction', 'hormone-balance']");
    expect(assess).toContain('Prefer not to say');
    expect(assess).toContain('data-skip');
    expect(assess).not.toMatch(/event-mode[^{]*\{[^}]*skip-btn/);
  });
  it('treats skipped as missing, not zero', () => {
    expect(assess).toContain('skipped[');
    expect(assess).toContain('isAnswered');
    expect(assess).toMatch(/prorate|Prorate/);
    // skipped ids are left out of the payloads the lambda reads
    expect(assess).toMatch(/if \(skipped\[QUESTIONS\[qi\]\.id\]\) continue/);
  });
});

describe('one name: MindSpan Assessment', () => {
  it('has no "Brain Check" or "4M Assessment" in website/src', () => {
    for (const f of walk(join(process.cwd(), 'src'))) {
      if (!/\.(astro|ts|tsx|md|mdx|json|js)$/.test(f)) continue;
      const t = readFileSync(f, 'utf8');
      expect(t.includes('Brain Check'), f).toBe(false);
      expect(t.includes('4M Assessment'), f).toBe(false);
    }
  });
});

describe('home page', () => {
  // TJ 2026-11-20 (option 2): Captain's Table teaser stays on the home page WITHOUT the price; price lives on /coaching only.
  it('shows the Captain\'s Table teaser with no price, linking to /coaching', () => {
    expect(index).toMatch(/The Captain&rsquo;s Table/);
    expect(index).toContain('href="/coaching"');
    expect(index).toContain('By application');
    expect(index).not.toMatch(/\$\s?50,?000|\$50K/i);
  });
});

describe('consult page', () => {
  it('defines the call near the top', () => {
    expect(consult).toContain('A free, no-obligation phone call of about 15 minutes. A care coordinator calls you at the time you choose. No card needed.');
    expect(consult.indexOf('no-obligation phone call')).toBeLessThan(consult.indexOf('q-step" data-step="1"'));
  });
});

describe('ZOOM_TIME', () => {
  it('is exported from siteMode', () => {
    expect(siteMode).toMatch(/export const ZOOM_TIME = '[^']+';/);
  });
  it('deploy.sh refuses while ZOOM_TIME is TBD', () => {
    expect(deploySh).toContain('ZOOM_TIME');
    expect(deploySh).toMatch(/exit 1/);
  });
  it('fails at deploy time (DEPLOY_CHECK=1) if ZOOM_TIME is TBD', () => {
    const m = siteMode.match(/export const ZOOM_TIME = '([^']+)';/);
    if (process.env.DEPLOY_CHECK === '1') expect(m?.[1]).not.toBe('TBD');
    else expect(m).not.toBeNull();
  });
});

describe('scoring behaviour (functions extracted from the page script)', () => {
  const grab = (name: string) => {
    const start = assess.indexOf(`  function ${name}(`);
    const end = assess.indexOf('\n  }\n', start);
    expect(start, name).toBeGreaterThan(-1);
    return assess.slice(start, end + 4);
  };
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'hormone-balance', 'erectile-dysfunction', 's', 't'];
  const QUESTIONS = ids.map((id) => ({ id }));
  const make = (scores: Record<string, number>, skipped: Record<string, boolean>) =>
    new Function('QUESTIONS', 'scores', 'skipped', 'BONUS_BY_ID',
      `${grab('selectTop3')}\n${grab('totalScore')}\nreturn { total: totalScore(), top3: selectTop3(scores, QUESTIONS).map(function (q) { return q.id; }) };`,
    )(QUESTIONS, scores, skipped, {}) as { total: number; top3: string[] };

  it('no skips: total is the plain sum (identical to before), top 3 unchanged', () => {
    const scores = Object.fromEntries(ids.map((id, i) => [id, i % 6]));
    const r = make(scores, {});
    expect(r.total).toBe(ids.reduce((s, _id, i) => s + (i % 6), 0));
    expect(r.top3).toEqual(['f', 'l', 'erectile-dysfunction']);
  });

  it('skips are prorated to the 0-100 scale and never reach the top 3', () => {
    const scores: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 1]));
    scores.a = 4; scores.b = 3;
    delete scores['hormone-balance']; delete scores['erectile-dysfunction'];
    const r = make(scores, { 'hormone-balance': true, 'erectile-dysfunction': true });
    // 18 answered, sum 23 -> round(23 * 20 / 18) = 26
    expect(r.total).toBe(26);
    expect(r.top3).not.toContain('hormone-balance');
    expect(r.top3).not.toContain('erectile-dysfunction');
    expect(r.top3.slice(0, 2)).toEqual(['a', 'b']);
  });

  it('all-max with skips still tops out at 100', () => {
    const scores: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 5]));
    expect(make(scores, { 'hormone-balance': true }).total).toBe(100);
  });
});

describe('top-3 results styling', () => {
  it('styles the script-injected top-3 items with :global selectors (scoped ones never match innerHTML)', () => {
    expect(assess).toContain(':global(.results-top3-list li .top3-plain)');
    expect(assess).toContain(':global(.results-top3-list li a)');
    expect(assess).toContain(':global(.results-top3-list .top3-label)');
  });
});

describe('call promise: care coordinator, not Dr. TJ (TJ 2026-11-20)', () => {
  it('no page promises that Dr. TJ personally calls', () => {
    for (const t of [index, consult, assess]) {
      expect(t).not.toMatch(/Dr\. TJ (will call|calls) you/);
    }
    expect(index).toContain('then a care coordinator calls you.');
    expect(consult).toContain("'Got it. A care coordinator will call you '");
    expect(assess).toContain("'A care coordinator will call you '");
  });
});
