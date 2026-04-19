/**
 * HTML-string renderer ported from the original app.js.
 *
 * Consumes typed content files (factors, supplements, morningProtocol, etc.)
 * and a Workbook instance. Produces HTML strings that Svelte injects via
 * `{@html}`. Inline event handlers call into actions exposed on `window`
 * by App.svelte — this is an explicit, documented pattern so the legacy
 * rendering remains visually identical during the beta polish pass.
 *
 * When the design system is componentized page-by-page, individual
 * renderX() functions below can be replaced by dedicated .svelte views.
 */

import { factors, type Factor } from './content/factors';
import { supplements } from './content/supplements';
import { morningProtocol } from './content/morningProtocol';
import { foodTiers, fasting } from './content/nutrition';
import { tabs, weekMeta } from './content/weeks';
import type { Workbook } from './data/schema';

export interface RenderContext {
  W: Workbook;
  curTab: string;
  openFactor: string | null;
  factorTab: 'imm' | 'tools' | 'adv' | 'res';
}

const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function auditFilled(W: Workbook): number {
  return Object.values(W.factorScores).filter(v => (v ?? 0) > 0).length;
}
export function auditTotal(W: Workbook): number {
  return Object.values(W.factorScores).reduce((a, b) => a + (Number(b) || 0), 0);
}
export function mornings(W: Workbook): number {
  let n = 0;
  for (const wk of [1, 2, 3, 4] as const) {
    n += Object.values(W.weekLogs[wk].morn).filter(Boolean).length;
  }
  return n;
}
export function colds(W: Workbook): number {
  let n = 0;
  for (const wk of [1, 2, 3, 4] as const) {
    n += Object.values(W.weekLogs[wk].cold).filter(Boolean).length;
  }
  return n;
}

function riskBand(score: number): { label: string; color: string; bg: string } {
  if (score <= 28) return { label: 'Low risk', color: '#1D9E75', bg: 'rgba(29,158,117,.1)' };
  if (score <= 49) return { label: 'Moderate risk', color: '#D4920A', bg: 'rgba(212,146,10,.1)' };
  return { label: 'High risk — fastest results', color: '#E05C2A', bg: 'rgba(224,92,42,.1)' };
}

function scoreBtnColor(n: number): string {
  if (n <= 2) return '#1D9E75';
  if (n === 3) return '#D4920A';
  return '#E05C2A';
}

function weekBanner(w: 1 | 2 | 3 | 4): string {
  const wc = weekMeta[w];
  return `<div class="week-banner" style="background:${wc.bg}CC;border:1px solid ${wc.ac}55">
    <div class="week-tag" style="color:${wc.ac};margin-bottom:4px">WEEK ${w} OF 4</div>
    <div class="week-name">${wc.label}</div>
    <div class="week-sub" style="margin-top:5px">${wc.sub}</div>
    <div style="margin-top:8px;display:inline-block;background:rgba(255,255,255,.15);padding:4px 10px;border-radius:5px;font-size:10px;font-weight:700;letter-spacing:.06em;color:#fff">⭐ ${wc.focus}</div>
  </div>`;
}

function scoreBtns(W: Workbook, fNum: string): string {
  const sc = W.factorScores[fNum] || 0;
  return [1, 2, 3, 4, 5].map(n => {
    const c = scoreBtnColor(n);
    const active = sc === n;
    return `<button class="score-btn"
      style="background:${active ? c : '#FFFFFF'};color:${active ? '#fff' : '#6A9A74'};border-color:${active ? c : '#D8E8DC'}"
      onclick="portalAction('setScore','${fNum}',${n});event.stopPropagation()">${n}</button>`;
  }).join('');
}

function morningTracker(W: Workbook, w: 1 | 2 | 3 | 4): string {
  const wc = weekMeta[w];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const wl = W.weekLogs[w];
  const dayBtns = days.map((d, i) => {
    const key = `w${w}d${i + 1}`;
    const done = wl.morn[key];
    return `<button class="day-btn"
      style="background:${done ? wc.ac : '#FFFFFF'};color:${done ? '#fff' : '#5A8A64'};border-color:${done ? wc.ac : '#D8E8DC'}"
      onclick="portalAction('toggleDay','morn',${w},'${key}')">
      <span style="font-size:10px;font-weight:700">${d.charAt(0)}</span>
      <span style="font-size:8px;color:inherit;opacity:.7">${i + 1}</span>
    </button>`;
  }).join('');
  const coldBtns = days.map((d, i) => {
    const key = `cw${w}d${i + 1}`;
    const done = wl.cold[key];
    return `<button class="cold-btn"
      style="background:${done ? '#2E7FD9' : '#FFFFFF'};color:${done ? '#fff' : '#6A9A74'};border-color:${done ? '#2E7FD9' : '#D8E8DC'}"
      onclick="portalAction('toggleDay','cold',${w},'${key}')">${d.charAt(0)}</button>`;
  }).join('');
  const doneCt = days.filter((_, i) => wl.morn[`w${w}d${i + 1}`]).length;
  return `<div class="card" style="border-color:${wc.ac}55">
    <div class="card-title"><span style="color:${wc.ac}">Week ${w}</span> Morning Protocol Tracker</div>
    <div style="font-size:11px;color:#6A8A6E;margin-bottom:8px">Tap each day you completed all 7 elements</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">${dayBtns}</div>
    <div class="g2" style="margin-bottom:12px">
      <div>
        <label>Days completed</label>
        <div style="font-size:26px;font-weight:700;color:${wc.ac};margin-top:4px">${doneCt} / 7</div>
      </div>
      <div>
        <label>Cold showers</label>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${coldBtns}</div>
      </div>
    </div>
    <label>Week ${w} morning reflection</label>
    <textarea placeholder="How did the protocol feel? What improved? What was hard?"
      oninput="portalField('weekLogs.${w}.reflection',this.value)">${esc(wl.reflection)}</textarea>
  </div>`;
}

function factorDetail(W: Workbook, f: Factor, factorTab: RenderContext['factorTab']): string {
  const tabsDef = [
    { k: 'imm' as const, l: 'Immediate' },
    { k: 'tools' as const, l: 'Tools' },
    { k: 'adv' as const, l: 'Advanced' },
    { k: 'res' as const, l: 'Resources' }
  ];
  const tabBtns = tabsDef.map(t =>
    `<button class="ftab${factorTab === t.k ? ' active' : ''}" onclick="portalAction('setFactorTab','${t.k}')">${t.l}</button>`
  ).join('');

  const bullet = (items: string[], color: string): string => items.map(item =>
    `<div class="bitem"><span class="dot" style="color:${color}">▸</span><span style="color:#1A3A20">${esc(item)}</span></div>`
  ).join('');

  let content = '';
  if (factorTab === 'imm') content = bullet(f.imm ?? f.act ?? [], '#1D9E75');
  else if (factorTab === 'tools') content = bullet(f.tools ?? [], '#2E7FD9');
  else if (factorTab === 'adv') content = bullet(f.adv ?? [], '#D4920A');
  else content = `<div style="display:flex;flex-wrap:wrap;gap:7px">
    ${f.res.map(r => `<a class="res-pill" href="${r.u}" target="_blank">${esc(r.n)} ↗</a>`).join('')}
  </div>`;

  return `<div class="factor-body">
    ${f.cm ? `<div style="background:#1E5FA0;border-radius:9px;padding:12px 14px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:4px">Connected Mind — Complete Before Scoring</div>
      <div style="font-size:11px;color:#B5D4F4;margin-bottom:8px">Complete this assessment before finalizing your score for Factor 01.</div>
      <a href="#" class="btn sm primary">Take the Assessment ↗</a>
    </div>` : ''}
    <div class="info-box" style="background:rgba(29,158,117,.06);border:1px solid rgba(29,158,117,.25);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <span style="font-size:11px;color:#3A6A44"><strong style="color:#1D9E75">Box breathing</strong> — 4 counts in · hold 4 · out 4 · hold 4 · repeat 4 times</span>
      <a href="https://youtube.com/watch?v=tybOi4hjZFQ" target="_blank" class="btn xs primary">▶ Watch</a>
    </div>
    <div class="ftab-row">${tabBtns}</div>
    <div style="margin-bottom:14px">${content}</div>
    <label>My personal action plan for this factor</label>
    <textarea placeholder="What specifically will I do? When? How will I measure progress?"
      oninput="portalField('factorPlans.${f.n}',this.value)">${esc(W.factorPlans[f.n] ?? '')}</textarea>
  </div>`;
}

function renderDash(W: Workbook): string {
  const af = auditFilled(W), at = auditTotal(W), m = mornings(W), c = colds(W);
  const risk = af === 14 ? riskBand(at) : null;
  return `
  <div class="page-title" style="color:#1D9E75">Mind · Muscle · Mitigate · Motivate</div>
  <div class="page-sub">Month 1 — Brain Optimization for Men 35+</div>

  <div class="card">
    <div class="card-title">Your Profile</div>
    <div class="g3">
      <div><label>Full name</label>
        <input value="${esc(W.name)}" placeholder="Your name"
          oninput="portalField('name',this.value)"></div>
      <div><label>Start date</label>
        <input value="${esc(W.startDate)}" placeholder="e.g. April 14, 2026"
          oninput="portalField('startDate',this.value)"></div>
      <div><label>Cohort</label>
        <input value="${esc(W.cohortId ?? '')}" placeholder="Cohort #"
          oninput="portalField('cohortId',this.value)"></div>
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-card"><div class="stat-num" style="color:#1D9E75">${af}/14</div><div class="stat-lbl">FACTORS SCORED</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#1D9E75">${af === 14 ? at : '—'}</div><div class="stat-lbl">AUDIT SCORE /70</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#2E7FD9">${m}</div><div class="stat-lbl">MORNINGS DONE</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#2E7FD9">${c}</div><div class="stat-lbl">COLD SHOWERS</div></div>
  </div>

  ${risk ? `<div class="card" style="background:${risk.bg};border-color:${risk.color}55;margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:15px;font-weight:700;color:${risk.color};margin-bottom:3px">${risk.label}</div>
        <div style="font-size:12px;color:#4A7A54">
          ${at <= 28 ? 'Strong foundations — focus on fine-tuning and optimization.'
      : at <= 49 ? 'Multiple factors working against you. Targeted action yields rapid results.'
        : 'This program was built for you. Major gains are available very quickly.'}
        </div>
      </div>
      <div style="font-size:52px;font-weight:700;color:${risk.color};line-height:1">${at}</div>
    </div>
  </div>` : ''}

  <div class="card">
    <div class="card-title">Month 1 Progress</div>
    ${[
      { l: 'Mitigate audit (14 factors)', v: af, mx: 14, c: '#1D9E75' },
      { l: 'Morning protocol (28 days)', v: m, mx: 28, c: '#2E7FD9' },
      { l: 'Cold shower streak', v: c, mx: 28, c: '#2E7FD9' }
    ].map(p => `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#4A7A54;margin-bottom:5px">
          <span>${p.l}</span><span style="color:${p.c}">${p.v} / ${p.mx}</span>
        </div>
        <div class="pbar-wrap">
          <div class="pbar-fill" style="width:${Math.min(100, (p.v / p.mx) * 100)}%;background:${p.c}"></div>
        </div>
      </div>`).join('')}
  </div>

  <div class="card">
    <div class="card-title">Quick Navigation</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${tabs.slice(1).map(t =>
        `<button class="btn" onclick="portalAction('goTo','${t.id}')">${t.icon} ${t.label}</button>`
      ).join('')}
    </div>
  </div>`;
}

function renderW1(ctx: RenderContext): string {
  const { W, openFactor, factorTab } = ctx;
  const af = auditFilled(W), at = auditTotal(W);

  const pillarHeader = (num: string, title: string, color: string, tagline: string): string =>
    `<div style="display:flex;align-items:center;gap:14px;padding:14px 20px;
      background:${color};border-radius:10px 10px 0 0;margin:-20px -20px 16px">
      <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);
        display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;
        color:#fff;flex-shrink:0">${num}</div>
      <div>
        <div style="font-size:15px;font-weight:700;color:#fff;letter-spacing:.02em">${title}</div>
        <div style="font-size:10px;color:rgba(255,255,255,.8);letter-spacing:.04em">${tagline}</div>
      </div>
    </div>`;

  const thisWeekBox = (items: string[], color: string): string =>
    `<div style="background:${color}0F;border:1.5px solid ${color}44;border-radius:9px;
      padding:13px 16px;margin-top:14px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:${color};margin-bottom:9px">
        ▶ START THIS WEEK
      </div>
      ${items.map(i => `<div style="display:flex;gap:9px;padding:5px 0;font-size:12px;
        color:#1A2E1E;line-height:1.5;border-bottom:1px solid ${color}22">
        <span style="color:${color};flex-shrink:0;font-weight:700">✓</span>
        <span>${i}</span>
      </div>`).join('')}
    </div>`;

  const factorCards = factors.map(f => {
    const open = openFactor === f.n;
    return `<div class="factor-card" style="${f.cm ? 'border-color:#2E7FD955' : ''}">
      <div class="factor-header" onclick="portalAction('toggleFactor','${f.n}')">
        <span class="factor-num">${f.n}</span>
        <div style="flex:1">
          <div class="factor-name">${esc(f.name)}
            ${f.tag ? `<span class="pill" style="background:${f.tc || '#1D9E75'}20;color:${f.tc || '#1D9E75'};margin-left:8px;font-size:9px">${f.tag}</span>` : ''}
          </div>
          <div class="factor-sub">${esc(f.sub ?? '')}</div>
        </div>
        <div style="display:flex;gap:5px;align-items:center">${scoreBtns(W, f.n)}</div>
        <span style="color:#6A8A6E;margin-left:8px;font-size:13px">${open ? '▲' : '▼'}</span>
      </div>
      ${open ? factorDetail(W, f, factorTab) : ''}
    </div>`;
  }).join('');

  const motivationOptions = [
    "Fear of cognitive decline — I don't want to lose my sharpness or independence as I age",
    'Desire to optimize — I want to perform at my absolute peak for as long as possible',
    'Both equally — motivated by avoiding decline AND reaching my highest potential'
  ];

  return `${weekBanner(1)}

  <div style="background:#F0FAF5;border:1.5px solid #B8E8D0;border-radius:11px;padding:16px 20px;margin-bottom:20px">
    <div style="font-size:13px;font-weight:700;color:#1A5A34;margin-bottom:6px">Week 1 — All 4 Pillars Begin Today</div>
    <div style="font-size:12px;color:#3A7A4E;line-height:1.75">
      Week 1 introduces the foundation of every pillar. You will go deep on Mitigate — scoring all 14 risk factors —
      and establish your baselines for Muscle, Mind, and Motivate. Each pillar gets its own dedicated deep-dive in weeks 2–4.
      But everything starts <strong>today</strong>.
    </div>
  </div>

  <div class="card">
    ${pillarHeader('M4', 'MOTIVATE — Foundation', '#6B5ED4', 'Why are you here? Lock in your reason before anything else.')}
    <div style="margin-bottom:14px">
    ${motivationOptions.map((opt, i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
        background:${W.motivation === String(i) ? 'rgba(107,94,212,.07)' : '#FFFFFF'};
        border:1.5px solid ${W.motivation === String(i) ? '#6B5ED4' : '#D8E8DC'};
        border-radius:8px;cursor:pointer;margin-bottom:7px"
        onclick="portalField('motivation','${i}')">
        <div style="width:16px;height:16px;border-radius:50%;
          border:2px solid ${W.motivation === String(i) ? '#6B5ED4' : '#D8E8DC'};
          background:${W.motivation === String(i) ? '#6B5ED4' : 'transparent'};flex-shrink:0"></div>
        <span style="font-size:12.5px;color:#1A2E1E">${esc(opt)}</span>
      </div>`).join('')}
    </div>
    <label>My "why" — the man I want to be at age 70</label>
    <textarea style="min-height:70px" placeholder="Write it here — you will read this aloud on graduation day..."
      oninput="portalField('personalWhy',this.value)">${esc(W.personalWhy)}</textarea>
    <label style="margin-top:12px">My identity statement (draft) — "I am a man who..."</label>
    <input placeholder="I am a man who..." value="${esc(W.identityStatement)}"
      oninput="portalField('identityStatement',this.value)">
    ${thisWeekBox([
      'Write your "why" above — be specific about the man you want to be at 70',
      'Complete the Morning Protocol Level 1 every morning starting tomorrow — fasted, outdoors',
      'Cold shower closes every morning from Day 1 — 1 minute minimum, non-negotiable'
    ], '#6B5ED4')}
  </div>

  <div class="card">
    ${pillarHeader('M1', 'MITIGATE — Week 1 Deep Focus', '#1D9E75', 'Score all 14 risk factors. Identify your top 3 leverage points.')}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-size:12px;color:#5A8A64">Score each factor honestly 1–5. High score = fastest results when addressed.</div>
      <div style="text-align:right">
        <div style="font-size:28px;font-weight:700;color:${af === 14 ? riskBand(at).color : '#1D9E75'}">
          ${af === 14 ? at : `${af}/14`}
        </div>
        <div style="font-size:9px;color:#6A8A6E">${af === 14 ? '/ 70 total' : 'factors scored'}</div>
      </div>
    </div>
    <div class="pbar-wrap" style="margin-bottom:16px">
      <div class="pbar-fill" style="width:${(af / 14) * 100}%;background:#1D9E75"></div>
    </div>
    ${factorCards}
    <div style="margin-top:16px">
      <div class="card-title">My Top 3 Priority Factors</div>
      ${[0, 1, 2].map(i => `
        <div style="margin-bottom:9px">
          <label>${i + 1}. ${['Highest score — fastest results', 'Second priority', 'Third priority'][i]}</label>
          <input value="${esc(W.priorities[i] ?? '')}" placeholder="Factor name and number..."
            oninput="portalField('priorities.${i}',this.value)">
        </div>`).join('')}
      <div class="card-title" style="margin-top:12px">My Specific Commitments</div>
      ${[0, 1, 2].map(i => `
        <div style="margin-bottom:9px">
          <label>Priority ${i + 1} — this week I will</label>
          <input value="${esc(W.commitments[i] ?? '')}" placeholder="Be specific — what, when, how..."
            oninput="portalField('commitments.${i}',this.value)">
        </div>`).join('')}
    </div>
  </div>

  <div class="card">
    ${pillarHeader('M2', 'MUSCLE — Establish Your Baseline', '#E05C2A', 'Record where you are starting.')}
    <div class="card-title">Body Composition — Week 1 Baseline</div>
    <div class="g2" style="margin-bottom:16px">
      ${([['weight', 'Body weight (lbs)'], ['waist', 'Waist at navel (in)'], ['energy', 'Morning energy (1–10)'], ['mood', 'Mood rating (1–10)']] as const).map(([k, l]) => `
        <div>
          <label>${l}</label>
          <input value="${esc(W.bodyBaseline[k] ?? '')}" placeholder="Record now..."
            oninput="portalField('bodyBaseline.${k}',this.value)">
        </div>`).join('')}
    </div>
    <label>Target bodyweight for protein calc (lbs)</label>
    <input type="number" placeholder="e.g. 185" value="${esc(W.protein)}"
      oninput="portalField('protein',this.value)">
    ${Number(W.protein) > 0 ? `<div style="margin-top:10px;background:#F0FAF5;border:1.5px solid #B8E8D0;border-radius:9px;padding:12px;display:flex;align-items:center;justify-content:center;gap:10px">
      <div style="font-size:28px;font-weight:700;color:#1D9E75">${Math.round(Number(W.protein) * 0.9)}g</div>
      <div style="font-size:10px;color:#5A8A64">protein per day target</div>
    </div>` : ''}
  </div>

  ${morningTracker(W, 1)}`;
}

function renderMorn(W: Workbook): string {
  return `
  <div class="page-title" style="color:#1D9E75">4M Morning Protocol</div>
  <div class="page-sub">Level 1 · Done fasted · Outdoors · Every morning · Cold shower closes</div>

  <div class="info-box" style="background:rgba(29,158,117,.06);border:1px solid rgba(29,158,117,.2)">
    <strong style="color:#1D9E75">Stack all elements simultaneously outdoors.</strong>
    Step outside fasted within 60 min of waking. Box breathe throughout. Move through the full sequence.
    Cold shower closes every morning — non-negotiable. First meal after 9AM, only after morning routine is complete.
  </div>

  <div class="card">
    <div class="card-title">Level 1 — All Elements</div>
    ${morningProtocol.map((mv, i) => `
      <div style="display:flex;gap:13px;padding:12px 0;${i < morningProtocol.length - 1 ? 'border-bottom:1px solid #E8F0E855' : ''};align-items:flex-start">
        <div style="width:28px;height:28px;border-radius:50%;background:#0D2E1A;border:1px solid #1D9E75;
          display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;
          color:#1D9E75;flex-shrink:0">${i + 1}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:#1A3A20;margin-bottom:3px">${esc(mv.n)}</div>
          <div style="font-size:11px;color:#4A7A54;margin-bottom:6px">${esc(mv.p)}</div>
          ${mv.u ? `<a href="${mv.u}" target="_blank" class="btn xs" style="color:#1D9E75;border-color:#1D9E7555">▶ Watch tutorial ↗</a>` : ''}
        </div>
      </div>`).join('')}
  </div>

  ${([1, 2, 3, 4] as const).map(w => morningTracker(W, w)).join('')}`;
}

function renderWeekStub(W: Workbook, w: 1 | 2 | 3 | 4, title: string, intro: string): string {
  const keyPrefix = `w${w}_`;
  return `${weekBanner(w)}
  <div class="card">
    <div class="card-title">${title}</div>
    <div style="font-size:12.5px;color:#3A5A44;line-height:1.7;margin-bottom:14px">${intro}</div>
    <div class="card-title">Weekly Reflection</div>
    ${[['motivate', 'MOTIVATE reflection'], ['mitigate', 'MITIGATE reflection'],
       ['muscle', 'MUSCLE reflection'], ['mind', 'MIND reflection']
    ].map(([k, l]) => `
      <div style="margin-bottom:12px">
        <label>${l}</label>
        <textarea oninput="portalField('weekReflections.${keyPrefix}${k}_ref',this.value)">${esc(W.weekReflections[`${keyPrefix}${k}_ref`] ?? '')}</textarea>
      </div>`).join('')}
  </div>
  ${morningTracker(W, w)}`;
}

function renderNutr(W: Workbook): string {
  const pt = Number(W.protein) || 0;
  return `
  <div class="page-title" style="color:#1D9E75">Keto-Paleo Ancestral Nutrition</div>
  <div class="page-sub">Food quality determines brain quality · 9am–7pm eating window · Morning fasted</div>

  <div class="card">
    <div class="card-title">My Daily Protein Target</div>
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:180px">
        <label>Target bodyweight (lbs)</label>
        <input type="number" placeholder="e.g. 185" value="${esc(W.protein)}"
          oninput="portalField('protein',this.value)">
      </div>
      ${pt > 0 ? `<div style="background:rgba(29,158,117,.06);border:1px solid rgba(29,158,117,.25);
        border-radius:10px;padding:14px 20px;text-align:center;flex-shrink:0">
        <div style="font-size:34px;font-weight:700;color:#1D9E75;line-height:1">${Math.round(pt * 0.9)}g</div>
        <div style="font-size:10px;color:#6A8A6E;margin-top:2px">protein per day</div>
      </div>` : ''}
    </div>
  </div>

  <div class="card">
    <div class="card-title">4M Food Quality Hierarchy</div>
    ${foodTiers.map(({ tier, color, items }) => `
      <div style="margin-bottom:14px">
        <span class="pill" style="background:${color}15;color:${color};margin-bottom:8px;display:inline-block">${tier}</span>
        ${items.map(item => `
          <div class="bitem">
            <span class="dot" style="color:${color}">${tier.includes('Elim') ? '✕' : '▸'}</span>
            <span style="font-size:12px;color:#1A3A20">${esc(item)}</span>
          </div>`).join('')}
      </div>`).join('')}
  </div>

  <div class="card">
    <div class="card-title">4M Fasting Progression — 120 Days</div>
    ${fasting.map(r => `
      <div style="display:grid;grid-template-columns:1fr 0.7fr 1fr 1fr 1.6fr;gap:8px;
        padding:10px 0;border-bottom:1px solid #E8F0E855;align-items:center;font-size:12px">
        <span style="font-weight:700;color:${r.c}">${r.m}</span>
        <span class="pill" style="background:#FAFBF9;border:1px solid #D8E8DC;color:#1A2E1E">${r.w}</span>
        <span style="color:#5A8A64">First: <span style="color:#1A3A20">${r.f}</span></span>
        <span style="color:#5A8A64">Last: <span style="color:#1A3A20">${r.l}</span></span>
        <span style="font-size:10px;color:#6A8A6E">${r.n}</span>
      </div>`).join('')}
  </div>`;
}

function renderSupplementsPanel(W: Workbook): string {
  return supplements.map((s, i) => {
    const key = `s${i}`;
    const resp = W.supplements[key]?.response ?? '';
    return `<div class="supp-row">
      <div>
        <div class="supp-name">${esc(s.n)}</div>
        <div class="supp-why">${esc(s.w)}</div>
      </div>
      <div style="font-size:11px;color:#3A6A44">${esc(s.d)}</div>
      <div style="font-size:10px;color:#4A7A54">${esc(s.t)}</div>
      <div style="display:flex;gap:5px">
        ${(['Yes', 'No'] as const).map(v => `
          <button class="btn xs"
            style="background:${resp === v ? (v === 'Yes' ? '#1D9E75' : '#E8E8E8') : '#FFFFFF'};
              color:${resp === v ? '#fff' : '#6A9A74'};
              border-color:${resp === v ? (v === 'Yes' ? '#1D9E75' : '#999') : '#D8E8DC'}"
            onclick="portalAction('setSupp','${key}','${v}')">${v}</button>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function renderRegen(W: Workbook): string {
  return `
  <div style="background:linear-gradient(135deg,#042C53,#0C2040);border-radius:12px;
    padding:20px;margin-bottom:20px;border:1px solid #2E7FD944">
    <div style="font-size:10px;font-weight:700;letter-spacing:.12em;color:#2E7FD9;margin-bottom:6px">WEEK 4 BONUS LESSON</div>
    <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:6px">Regenerative Medicine & Genesis RPA</div>
    <div style="font-size:12.5px;color:#B5D4F4;line-height:1.7">Everything you have done this month has been activating your body's innate regenerative pathways.</div>
  </div>

  <div class="card">
    <div class="card-title">My Regenerative Medicine Reflection</div>
    <label>Which conditions are most relevant to me personally?</label>
    <textarea style="margin-bottom:12px"
      oninput="portalField('regenPriority',this.value)">${esc(W.regenPriority)}</textarea>
    <label>My commitment to investigate this further</label>
    <textarea oninput="portalField('regenNext',this.value)">${esc(W.regenNext)}</textarea>
  </div>

  <div class="card">
    <div class="card-title">Month 1 Supplement Stack</div>
    ${renderSupplementsPanel(W)}
  </div>`;
}

export function renderPage(ctx: RenderContext): string {
  switch (ctx.curTab) {
    case 'w1': return renderW1(ctx);
    case 'morn': return renderMorn(ctx.W);
    case 'w2': return renderWeekStub(ctx.W, 2, 'Week 2 — Build the Foundation',
      'Your baseline is set. This week everything moves from measurement to action. Deep focus this week is Muscle — your movement protocol and protein target.');
    case 'nutr': return renderNutr(ctx.W);
    case 'w3': return renderWeekStub(ctx.W, 3, 'Week 3 — Deepen the Work',
      'Mid-month deep work. Deep focus this week is Mind — we introduce the full 7-supplement brain stack.');
    case 'w4': return renderWeekStub(ctx.W, 4, 'Week 4 — Integration & Identity',
      'Final week of Month 1. Deep focus is Motivate — locking in your identity and committing to Month 2.');
    case 'regen': return renderRegen(ctx.W);
    case 'dash':
    default: return renderDash(ctx.W);
  }
}

export function renderSidebar(ctx: RenderContext): string {
  return tabs.map(t =>
    `<div class="nav-item${ctx.curTab === t.id ? ' active' : ''}" onclick="portalAction('goTo','${t.id}')">
      <span class="icon">${t.icon}</span>
      <span>${t.label}</span>
    </div>`
  ).join('');
}

export function sidebarStats(W: Workbook): {
  audit: string; score: string; morn: string; cold: string;
} {
  const af = auditFilled(W), at = auditTotal(W), m = mornings(W), c = colds(W);
  return {
    audit: `Audit: ${af} / 14 factors`,
    score: `Score: ${af >= 14 ? at + ' / 70' : af + ' / 14 factors'}`,
    morn: `Mornings: ${m} days`,
    cold: `Cold showers: ${c} days`
  };
}
