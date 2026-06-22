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

import { factors } from './content/factors';
import type { Factor } from './content/factors';
import { supplements } from './content/supplements';
import { stepsForWeek } from './content/morningProtocol';
// nutrition.ts content is no longer imported centrally — fasting data lives in weekNutrData below
import { tabs, weekMeta } from './content/weeks';
import type { Workbook } from './data/schema';
import { AUDIT_CATEGORIES } from './data/audit';

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

// ── Gut Health Self-Assessment ────────────────────────────────────────────────
// State is persisted to localStorage under key `gut-assessment-v1` and managed
// entirely by gutAssessmentAction() exposed on window in App.svelte.
// No workbook state is touched — assessment is self-contained.

const GUT_QUESTIONS: string[] = [
  'I frequently feel bloated after meals.',
  'I have excess gas or flatulence on a regular basis.',
  'I experience abdominal discomfort, cramping, or pain.',
  'My stools are irregular — constipation, diarrhea, or both.',
  'I have multiple food sensitivities or reactions.',
  'I feel brain fog or fatigue after eating.',
  'I have skin issues — acne, eczema, rashes, or rosacea.',
  'I have joint pain without injury, or an autoimmune diagnosis.',
  "I've had 3+ courses of antibiotics in the past 5 years.",
  "I'm under chronic stress, or had a major stress event in the past year.",
];

interface GutAssessmentState {
  answers: Record<number, boolean>;   // index → true (yes) / false (no)
  score: number | null;
  completedAt: string | null;         // ISO date string
}

function loadGutState(): GutAssessmentState {
  if (typeof localStorage === 'undefined') {
    return { answers: {}, score: null, completedAt: null };
  }
  try {
    const raw = localStorage.getItem('gut-assessment-v1');
    if (raw) return JSON.parse(raw) as GutAssessmentState;
  } catch (_) { /* ignore */ }
  return { answers: {}, score: null, completedAt: null };
}

function isGutResultRecent(completedAt: string | null): boolean {
  if (!completedAt) return false;
  const diff = Date.now() - new Date(completedAt).getTime();
  return diff < 90 * 24 * 60 * 60 * 1000; // 90 days
}

function gutBand(score: number): { title: string; body: string; cta: string } {
  if (score <= 2) {
    return {
      title: 'Your gut is in good shape.',
      body: "Stay consistent with Week 1's protocol — bone broth, fermented foods, and your foundational stack maintain what you've built.",
      cta: 'Anchor with Biome NS Ultra',
    };
  }
  if (score <= 5) {
    return {
      title: 'Clear gut-axis signals.',
      body: "Your gut is sending signals worth listening to. Week 1's gut-repair protocol plus Biome NS Ultra daily will drive measurable change in 30 days. Retake this assessment then.",
      cta: 'Start with Biome NS Ultra',
    };
  }
  return {
    title: 'Strong gut-repair indication.',
    body: 'These are the patterns Biome NS Ultra was built for. Anchor your entire Month 1 in gut repair: Biome NS Ultra daily, eliminate sugar/seed oils/alcohol immediately, prioritize bone broth and fermented foods. Retake in 30 days.',
    cta: 'Begin with Biome NS Ultra today',
  };
}

export function renderGutAssessment(): string {
  const state = loadGutState();
  const showResult = state.score !== null && isGutResultRecent(state.completedAt);
  const ac = '#1D9E75';

  // Build question rows
  const questionRows = GUT_QUESTIONS.map((q, i) => {
    // JSON serialisation turns numeric keys to strings; coerce both sides.
    const ans = (state.answers as Record<string, boolean>)[String(i)];
    const yesActive = ans === true;
    const noActive = ans === false;
    return `<div data-gut-row="${i}" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #1D9E7518">
      <span style="font-size:12.5px;color:#1A2E1E;line-height:1.5;flex:1">${esc(q)}</span>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="day-btn"
          style="background:${yesActive ? ac : '#FFFFFF'};color:${yesActive ? '#fff' : '#5A8A64'};border-color:${yesActive ? ac : '#D8E8DC'};min-width:44px;font-size:12px;font-weight:700;padding:5px 10px"
          onclick="gutAssessmentAction('answer',${i},true)">Yes</button>
        <button class="day-btn"
          style="background:${noActive ? '#6B5ED4' : '#FFFFFF'};color:${noActive ? '#fff' : '#5A8A64'};border-color:${noActive ? '#6B5ED4' : '#D8E8DC'};min-width:44px;font-size:12px;font-weight:700;padding:5px 10px"
          onclick="gutAssessmentAction('answer',${i},false)">No</button>
      </div>
    </div>`;
  }).join('');

  const answeredCount = Object.keys(state.answers).length;
  const allAnswered = answeredCount === GUT_QUESTIONS.length;

  // Result block
  let resultHtml = '';
  if (showResult && state.score !== null) {
    const band = gutBand(state.score);
    const scoreColor = state.score <= 2 ? '#1D9E75' : state.score <= 5 ? '#D4920A' : '#E05C2A';
    resultHtml = `<div id="gut-result-block" style="display:block">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <div style="width:56px;height:56px;border-radius:50%;background:${scoreColor}20;border:2px solid ${scoreColor};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span style="font-size:22px;font-weight:800;color:${scoreColor}">${state.score}</span>
        </div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#1A2E1E;line-height:1.3">${esc(band.title)}</div>
          <div style="font-size:10px;color:#6A8A6E;margin-top:2px">Score: ${state.score}/10</div>
        </div>
      </div>
      <div style="font-size:12.5px;color:#3A6A44;line-height:1.7;margin-bottom:16px">${esc(band.body)}</div>
      <a href="https://my4mlife.com/assessment" style="display:inline-block;background:${ac};color:#fff;font-size:13px;font-weight:700;padding:11px 20px;border-radius:8px;text-decoration:none;letter-spacing:.02em">${esc(band.cta)} →</a>
      <div style="margin-top:16px">
        <button onclick="gutAssessmentAction('retake')"
          style="background:none;border:none;color:#6A8A6E;font-size:12px;cursor:pointer;text-decoration:underline;padding:0">Retake assessment</button>
      </div>
    </div>
    <div id="gut-questions-block" style="display:none">
      ${questionRows}
      <div style="margin-top:16px;text-align:center">
        <button id="gut-submit-btn" onclick="gutAssessmentAction('submit')"
          style="background:${ac};color:#fff;font-size:13px;font-weight:700;padding:12px 28px;border-radius:8px;border:none;cursor:pointer;opacity:${allAnswered ? '1' : '.45'};pointer-events:${allAnswered ? 'auto' : 'none'}"
          ${allAnswered ? '' : 'disabled'}>See your result</button>
      </div>
    </div>`;
  } else {
    resultHtml = `<div id="gut-questions-block" style="display:block">
      ${questionRows}
      <div style="margin-top:16px;text-align:center">
        <button id="gut-submit-btn" onclick="gutAssessmentAction('submit')"
          style="background:${ac};color:#fff;font-size:13px;font-weight:700;padding:12px 28px;border-radius:8px;border:none;cursor:pointer;opacity:${allAnswered ? '1' : '.45'};pointer-events:${allAnswered ? 'auto' : 'none'}"
          ${allAnswered ? '' : 'disabled'}>See your result</button>
      </div>
    </div>
    <div id="gut-result-block" style="display:none"></div>`;
  }

  return `<div class="card" style="border-color:${ac}55">
    <div class="card-title" style="color:${ac}">Gut Health Self-Assessment — 5 minutes</div>
    <div style="font-size:12px;color:#5A6A6E;margin-bottom:16px;line-height:1.5">How much of what's happening in your brain starts in your gut? Find out.</div>
    ${resultHtml}
  </div>`;
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
  const steps = stepsForWeek(w);
  const week4Note = w === 4 ? ' — with more focus and passion' : '';
  const stepsHtml = steps.length > 0 ? `
    <div style="margin-bottom:12px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.07em;color:#6A8A6E;margin-bottom:6px;text-transform:uppercase">Today's morning practice${week4Note} — check off as you complete:</div>
      <ol style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px">
        ${steps.map(s => `<li style="font-size:12px;color:#1A2E1E;line-height:1.4"><strong>${esc(s.n)}</strong> — <span style="color:#5A6A6E">${esc(s.p)}</span>${s.u ? ` <a href="${s.u}" target="_blank" rel="noopener noreferrer" style="color:${wc.ac};font-size:10px;margin-left:4px">▶ video</a>` : ''}</li>`).join('')}
      </ol>
    </div>` : '';
  return `<div class="card" style="border-color:${wc.ac}55">
    <div class="card-title"><span style="color:${wc.ac}">Week ${w}</span> Morning Protocol Tracker</div>
    ${stepsHtml}
    <div style="font-size:11px;color:#6A8A6E;margin-bottom:8px">Tap each day you completed all elements</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">${dayBtns}</div>
    <div class="g2" style="margin-bottom:12px">
      <div>
        <span style="font-size:0.85rem;font-weight:600;color:#3A6A44">Days completed</span>
        <div style="font-size:26px;font-weight:700;color:${wc.ac};margin-top:4px">${doneCt} / 7</div>
      </div>
      <div>
        <span style="font-size:0.85rem;font-weight:600;color:#3A6A44">Cold showers</span>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${coldBtns}</div>
      </div>
    </div>
    ${(() => {
      const mood = wl.reflectionMood ?? '';
      const wins = (wl.reflectionWins ?? '').split(',').filter(Boolean);
      const moods: Array<[string, string]> = [['strong', 'Strong'], ['ok', 'OK'], ['hard', 'Hard']];
      const winOpts = ['Sleep', 'Energy', 'Mood', 'Focus', 'Digestion', 'Strength', 'Cravings'];
      const moodChips = moods.map(([v, l]) => {
        const sel = mood === v;
        return `<button type="button"
          onclick="var p=this.parentNode;Array.prototype.forEach.call(p.children,function(c){c.style.background='#fff';c.style.borderColor='#D8E8DC';c.style.color='#5A8A64'});this.style.background='#1D9E75';this.style.borderColor='#1D9E75';this.style.color='#fff';window.portalField&&window.portalField('weekLogs.${w}.reflectionMood','${v}')"
          style="flex:1;font-size:12px;font-weight:600;padding:9px 6px;border-radius:8px;cursor:pointer;background:${sel ? '#1D9E75' : '#fff'};border:1.5px solid ${sel ? '#1D9E75' : '#D8E8DC'};color:${sel ? '#fff' : '#5A8A64'}">${l}</button>`;
      }).join('');
      const winChips = winOpts.map(o => {
        const sel = wins.includes(o);
        return `<button type="button" data-v="${o}" class="${sel ? 'sel' : ''}"
          onclick="this.classList.toggle('sel');var s=this.classList.contains('sel');this.style.background=s?'#1D9E75':'#fff';this.style.color=s?'#fff':'#5A8A64';this.style.borderColor=s?'#1D9E75':'#D8E8DC';var box=this.parentNode;var vals=Array.prototype.slice.call(box.querySelectorAll('.sel')).map(function(e){return e.getAttribute('data-v')}).join(',');window.portalField&&window.portalField('weekLogs.${w}.reflectionWins',vals)"
          style="font-size:11.5px;font-weight:600;padding:6px 11px;border-radius:18px;cursor:pointer;background:${sel ? '#1D9E75' : '#fff'};border:1.5px solid ${sel ? '#1D9E75' : '#D8E8DC'};color:${sel ? '#fff' : '#5A8A64'}">${o}</button>`;
      }).join('');
      return `
      <div style="font-size:11px;font-weight:700;letter-spacing:.04em;color:#5A8A64;margin-bottom:6px">HOW DID WEEK ${w} FEEL?</div>
      <div style="display:flex;gap:6px;margin-bottom:12px">${moodChips}</div>
      <div style="font-size:11px;font-weight:700;letter-spacing:.04em;color:#5A8A64;margin-bottom:6px">WHAT IMPROVED? <span style="font-weight:400;text-transform:none;letter-spacing:0">(tap any)</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">${winChips}</div>`;
    })()}
    <label for="morn-reflection-w${w}">Anything else worth noting? (optional)</label>
    <textarea id="morn-reflection-w${w}" placeholder="Optional — a sentence on what was hard or what clicked."
      oninput="portalField('weekLogs.${w}.reflection',this.value)">${esc(wl.reflection)}</textarea>
  </div>`;
}

function workoutLog(W: Workbook, w: 1 | 2 | 3 | 4): string {
  // Per-exercise completion checkboxes — one tap, nothing to type.
  // Zone 2 cardio + HIIT are optional (not done every session) but always available to check off.
  const exercises: Array<[string, string, boolean]> = [
    ['squat', 'Squat / goblet squat', false],
    ['hingeRDL', 'Hip hinge / RDL', false],
    ['pushPull', 'Push + pull superset', false],
    ['zone2', 'Zone 2 cardio', true],
    ['hiit', 'HIIT training', true]
  ];
  const days = ['Day 1', 'Day 2', 'Day 3'];
  const color = '#E05C2A';

  // Strength baseline tests — Day 1 of each week is a retest. Show prior week's value for comparison.
  const baselineFields: Array<[string, string]> = [
    ['pushups', 'Max push-ups (single set)'],
    ['pullups', 'Max pull-ups (single set)'],
    ['squats', 'Max bodyweight squats'],
    ['plankSec', 'Plank hold (seconds)'],
    ['deadhang', 'Dead hang (seconds)']
  ];
  const baselineHeader = `
    <div style="background:rgba(224,92,42,.08);border:1.5px solid rgba(224,92,42,.3);border-radius:9px;padding:14px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:${color};letter-spacing:.07em;margin-bottom:5px">⭐ STRENGTH BASELINE — RETEST DAY 1 OF WEEK ${w}</div>
      <div style="font-size:11.5px;color:#7A3A20;line-height:1.55;margin-bottom:12px">
        Day 1 of every week starts with retesting your baselines. ${w === 1
          ? 'These numbers become your benchmark for the rest of the program.'
          : `Compare to last week — let your new numbers shape the rest of this week's work.`}
      </div>
      <div style="overflow-x:auto">
      <div style="display:grid;grid-template-columns:1.6fr 1fr 1fr 0.7fr;gap:8px;margin-bottom:5px;min-width:320px">
        ${['Test', `Week ${w} retest`, w > 1 ? `Week ${w - 1}` : 'Notes', 'Δ'].map(h =>
          `<div style="font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#6A8A6E">${h}</div>`
        ).join('')}
      </div>
      ${baselineFields.map(([k, l]) => {
        const curKey = `w${w}_baseline_${k}`;
        const cur = W.trainLog[curKey] ?? '';
        const prevKey = w > 1 ? `w${w - 1}_baseline_${k}` : '';
        const prev = prevKey ? (W.trainLog[prevKey] ?? '') : '';
        const delta = cur && prev ? (Number(cur) - Number(prev)).toFixed(0) : '';
        const deltaColor = delta && Number(delta) > 0 ? '#1D9E75' : delta && Number(delta) < 0 ? '#E05C2A' : '#6A8A6E';
        return `
        <div style="display:grid;grid-template-columns:1.6fr 1fr 1fr 0.7fr;gap:8px;margin-bottom:6px;align-items:center;min-width:320px">
          <div style="font-size:11px;color:#5A3020">${l}</div>
          <input placeholder="this week" style="font-size:11px"
            value="${esc(cur)}"
            oninput="portalField('trainLog.${curKey}',this.value)">
          ${w > 1
            ? `<div style="font-size:11px;color:#8A6A50;padding:7px 9px;background:rgba(224,92,42,.04);border-radius:7px">${prev || '—'}</div>`
            : `<input placeholder="form / notes" style="font-size:11px" value="${esc(W.trainLog[`w1_baseline_${k}_notes`] ?? '')}" oninput="portalField('trainLog.w1_baseline_${k}_notes',this.value)">`}
          <div style="font-size:12px;font-weight:700;color:${deltaColor};text-align:center">
            ${delta ? (Number(delta) > 0 ? '+' : '') + delta : '—'}
          </div>
        </div>`;
      }).join('')}
      </div>
    </div>

    <div class="card-title" style="font-size:10px;margin-bottom:6px">WORKOUT LOG — WEEK ${w}</div>
    <div style="font-size:11px;color:#6A8A6E;margin-bottom:10px">
      3 sessions this week — recommend every other day (Mon/Wed/Fri or Tue/Thu/Sat). Just tap to check off what you did; no numbers to log here. Day 1 is your retest day above.
    </div>`;
  return baselineHeader + `
    ${days.map((dLabel, di) => {
      const d = di + 1;
      return `
      <div style="border:1px solid rgba(224,92,42,.2);border-radius:9px;padding:12px;margin-bottom:10px;background:rgba(224,92,42,.03)">
        <div style="font-size:11px;font-weight:700;color:${color};letter-spacing:.07em;margin-bottom:10px">${dLabel.toUpperCase()}</div>
        <div style="display:flex;flex-direction:column;gap:5px">
        ${exercises.map(([k, l, opt]) => {
          const done = W.trainLog[`w${w}d${d}_${k}_done`] === '1';
          return `
          <label style="display:flex;align-items:center;gap:10px;padding:9px 11px;border:1.5px solid ${done ? '#1D9E75' : '#D8E8DC'};border-radius:8px;background:${done ? '#EAF7EF' : '#FFFFFF'};cursor:pointer;font-size:12.5px;color:#1A2E1E">
            <input type="checkbox" ${done ? 'checked' : ''} style="width:20px;height:20px;flex-shrink:0;accent-color:#1D9E75;cursor:pointer"
              onchange="var l=this.closest('label');l.style.borderColor=this.checked?'#1D9E75':'#D8E8DC';l.style.background=this.checked?'#EAF7EF':'#FFFFFF';window.portalField&&window.portalField('trainLog.w${w}d${d}_${k}_done',this.checked?'1':'')">
            <span style="flex:1">${l}${opt ? ` <span style="font-size:10px;color:#8AB89A">(optional)</span>` : ``}</span>
          </label>`;
        }).join('')}
        </div>
      </div>`;
    }).join('')}`;
}

function fastingDailyTracker(W: Workbook, w: 1 | 2 | 3 | 4): string {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return `
    <div class="card-title" style="font-size:10px;margin-bottom:6px">DAILY FASTING LOG — WEEK ${w} (target 14:10)</div>
    <div style="font-size:11px;color:#6A8A6E;margin-bottom:10px">
      Target: first meal after 9am, last before 7pm (14-hour fast, 10-hour eating window). Most days, just tap "Stuck to my window." Want to log exact meal times? Tap "exact times" on any day. Month 1 stays at 14:10.
    </div>
    ${days.map((d, i) => {
      const fKey = `w${w}d${i + 1}_firstMeal`;
      const lKey = `w${w}d${i + 1}_lastMeal`;
      const first = W.fastingLog?.[fKey] ?? '';
      const last = W.fastingLog?.[lKey] ?? '';
      const stuck = (W.fastingLog?.[`w${w}d${i + 1}_stuck`] ?? '') === '1';
      let windowHrs = '';
      if (first && last) {
        const [fh, fm] = first.split(':').map(Number);
        const [lh, lm] = last.split(':').map(Number);
        if (!isNaN(fh!) && !isNaN(lh!)) {
          const diff = ((lh! * 60 + (lm ?? 0)) - (fh! * 60 + (fm ?? 0))) / 60;
          windowHrs = diff > 0 ? diff.toFixed(1) : '';
        }
      }
      const hasTimes = !!(first || last);
      return `<div style="border:1px solid #E0EBE0;border-radius:8px;padding:9px 11px;margin-bottom:7px;background:${stuck ? '#F4FBF6' : '#FFFFFF'}">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" ${stuck ? 'checked' : ''} style="width:22px;height:22px;flex-shrink:0;accent-color:#1D9E75;cursor:pointer"
            onchange="this.closest('div').style.background=this.checked?'#F4FBF6':'#FFFFFF';window.portalField&&window.portalField('fastingLog.w${w}d${i + 1}_stuck',this.checked?'1':'')">
          <span style="font-size:12.5px;font-weight:600;color:#1A2E1E;min-width:34px">${d}</span>
          <span style="flex:1;font-size:12px;color:${stuck ? '#1D9E75' : '#6A8A6E'};font-weight:600">Stuck to my window</span>
        </label>
        <button type="button" onclick="var e=document.getElementById('ft-w${w}d${i + 1}');e.style.display=(e.style.display==='none')?'block':'none'" style="background:none;border:none;color:#5A8A64;font-size:10.5px;cursor:pointer;padding:5px 0 0;margin-left:32px;text-decoration:underline">exact times (optional)</button>
        <div id="ft-w${w}d${i + 1}" style="display:${hasTimes ? 'block' : 'none'};margin:7px 0 0 32px">
          <div style="display:grid;grid-template-columns:1fr 1fr 0.6fr;gap:8px;align-items:center;max-width:320px">
            <input type="time" style="font-size:11px" value="${esc(first)}" oninput="portalField('fastingLog.${fKey}',this.value)" aria-label="First meal ${d}">
            <input type="time" style="font-size:11px" value="${esc(last)}" oninput="portalField('fastingLog.${lKey}',this.value)" aria-label="Last meal ${d}">
            <div style="font-size:11px;color:${windowHrs ? (Number(windowHrs) <= 10 ? '#1D9E75' : '#E05C2A') : '#8AB89A'};font-weight:600;text-align:center">${windowHrs ? windowHrs + 'h' : '—'}</div>
          </div>
        </div>
      </div>`;
    }).join('')}`;
}

function priorityActionReminder(W: Workbook, selectedName: string): string {
  if (!selectedName) return '';
  const f = factors.find(x => x.name === selectedName);
  if (!f) return '';
  const actions = f.imm ?? f.act ?? [];
  if (!actions.length) return '';
  return `<div style="margin-top:10px;background:rgba(29,158,117,.06);border:1px solid rgba(29,158,117,.22);border-radius:8px;padding:10px 12px">
    <div style="font-size:10px;font-weight:700;color:#1D9E75;letter-spacing:.06em;margin-bottom:6px">
      ▸ IMMEDIATE ACTIONS FOR THIS FACTOR
    </div>
    ${actions.map(a => `<div style="display:flex;gap:8px;padding:3px 0;font-size:11.5px;color:#1A3A20;line-height:1.5">
      <span style="color:#1D9E75;flex-shrink:0;font-weight:700">✓</span>
      <span>${esc(a)}</span>
    </div>`).join('')}
  </div>`;
}

function factorNameSelect(currentVal: string, field: string): string {
  const opts = factors.map(f =>
    `<option value="${esc(f.name)}" ${currentVal === f.name ? 'selected' : ''}>${f.n}. ${esc(f.name)}</option>`
  ).join('');
  return `<select onchange="portalField('${field}',this.value)">
    <option value="" ${!currentVal ? 'selected' : ''}>— select factor —</option>
    ${opts}
  </select>`;
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
      <div style="font-size:11px;color:#B5D4F4">Complete this assessment before finalizing your score for Factor 01.</div>
    </div>` : ''}
    <div class="info-box" style="background:rgba(29,158,117,.06);border:1px solid rgba(29,158,117,.25);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <span style="font-size:11px;color:#3A6A44"><strong style="color:#1D9E75">Box breathing</strong> — 4 counts in · hold 4 · out 4 · hold 4 · repeat 4 times</span>
      <a href="https://youtube.com/watch?v=tybOi4hjZFQ" target="_blank" class="btn xs primary">▶ Watch</a>
    </div>
    <div class="ftab-row">${tabBtns}</div>
    <div style="margin-bottom:14px">${content}</div>
    <label for="factor-plan-${f.n}">My personal action plan for this factor</label>
    ${(() => {
      const sugg = (f.imm ?? f.act ?? []).slice(0, 5);
      if (!sugg.length) return '';
      return `<div style="margin-bottom:8px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.06em;color:#6A8A6E;text-transform:uppercase;margin-bottom:6px">Tap to add a commitment</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${sugg.map(s => `<button type="button" data-text="${esc(s)}"
            onclick="var t=document.getElementById('factor-plan-${f.n}');var a=this.getAttribute('data-text');t.value=(t.value?t.value+'\\n':'')+a;window.portalField&&window.portalField('factorPlans.${f.n}',t.value);this.style.opacity='0.45';this.disabled=true"
            style="text-align:left;font-size:11.5px;line-height:1.4;color:#1A3A20;background:#F0FAF5;border:1px solid #C8E8D4;border-radius:8px;padding:8px 11px;cursor:pointer">+ ${esc(s)}</button>`).join('')}
        </div>
      </div>` ;
    })()}
    <textarea id="factor-plan-${f.n}" placeholder="Tap a commitment above, or write your own: what specifically will I do? When? How will I measure progress?"
      oninput="portalField('factorPlans.${f.n}',this.value)">${esc(W.factorPlans[f.n] ?? '')}</textarea>
  </div>`;
}

// ── Audit Summary Card (Fix 1) ────────────────────────────────────────────────
// Reads audit-v1.scores from localStorage (set by intake Stage 4).
// Only renders if intake-complete-v1 is set and at least one score is non-zero.

interface AuditScores { [categoryId: string]: number }

const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';

function loadAuditScores(): AuditScores | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('audit-v1');
    if (DEBUG) console.debug('[4M] audit-v1 raw:', raw);
    if (!raw) { if (DEBUG) console.debug('[4M] audit-v1 not found in localStorage'); return null; }
    const intakeOk = !!localStorage.getItem('intake-complete-v1');
    if (DEBUG) console.debug('[4M] intake-complete-v1 present:', intakeOk);
    if (!intakeOk) { if (DEBUG) console.debug('[4M] intake not complete — audit suppressed'); return null; }
    const outer = JSON.parse(raw) as { scores?: AuditScores };
    const parsed: AuditScores = outer.scores ?? (outer as unknown as AuditScores);
    if (DEBUG) console.debug('[4M] parsed audit scores:', parsed);
    if (Object.values(parsed).every(v => v === 0)) { if (DEBUG) console.debug('[4M] all scores are 0 — returning null'); return null; }
    return parsed;
  } catch (e) { if (DEBUG) console.debug('[4M] loadAuditScores error:', e); return null; }
}

// Scoring rules locked 2026-06-01 (revised mid-assessment — mirror in
// website assessment.astro + website/src/data/audit-questions.ts +
// website/src/lib/survey-scoring.ts):
//   - already-diagnosed >= 3 → automatic #1 in top-3 (override)
//   - already-diagnosed 0/1/2 → ranked normally with raw score, no bonus
//   - gut-microbiome and weight-body-fat get +2 bonus
//   - everything else uses raw score only (no bonus)
const AUDIT_BONUS_BY_ID: Record<string, number> = {
  'gut-microbiome': 2,
  'weight-body-fat': 2,
};

function selectTop3(scores: AuditScores): Array<{ label: string; score: number }> {
  const diagId = 'already-diagnosed';
  const diagScore = scores[diagId] ?? 0;

  // Override: diag >= 3 → forced #1, remaining 2 from others.
  if (diagScore >= 3) {
    const diagCat = AUDIT_CATEGORIES.find(c => c.id === diagId);
    const others = AUDIT_CATEGORIES
      .filter(cat => cat.id !== diagId)
      .map(cat => ({
        label: cat.label,
        id: cat.id,
        raw: scores[cat.id] ?? 0,
        bonus: AUDIT_BONUS_BY_ID[cat.id] ?? 0,
        priorityTier: cat.priorityTier,
      }))
      .filter(x => x.raw > 0)
      .map(x => ({ ...x, total: x.raw + x.bonus }))
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.bonus !== a.bonus) return b.bonus - a.bonus;
        if (a.priorityTier && !b.priorityTier) return -1;
        if (!a.priorityTier && b.priorityTier) return 1;
        return a.id.localeCompare(b.id);
      });
    return [
      ...(diagCat ? [{ label: diagCat.label, score: diagScore }] : []),
      ...others.slice(0, 2).map(({ label, total }) => ({ label, score: total })),
    ];
  }

  // Diagnosis 0/1/2: rank all categories normally with raw + bonus.
  const sorted = AUDIT_CATEGORIES
    .map(cat => ({
      label: cat.label,
      id: cat.id,
      raw: scores[cat.id] ?? 0,
      bonus: AUDIT_BONUS_BY_ID[cat.id] ?? 0,
      priorityTier: cat.priorityTier,
    }))
    .filter(x => x.raw > 0)
    .map(x => ({ ...x, total: x.raw + x.bonus }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.bonus !== a.bonus) return b.bonus - a.bonus;
      if (a.priorityTier && !b.priorityTier) return -1;
      if (!a.priorityTier && b.priorityTier) return 1;
      return a.id.localeCompare(b.id);
    });
  return sorted.slice(0, 3).map(({ label, total }) => ({ label, score: total }));
}

function auditBand200(total: number): { label: string; color: string; bg: string } {
  // Risk bands tuned to the 10-category Personal Risk Assessment (legacy thresholds).
  if (total <= 24) return { label: 'Low', color: '#1D9E75', bg: 'rgba(29,158,117,.08)' };
  if (total <= 48) return { label: 'Moderate', color: '#D4920A', bg: 'rgba(212,146,10,.08)' };
  return { label: 'Elevated', color: '#E05C2A', bg: 'rgba(224,92,42,.08)' };
}

function renderAuditSummaryCard(): string {
  const scores = loadAuditScores();
  if (!scores) return '';
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const band = auditBand200(total);
  const top3 = selectTop3(scores);

  const top3Html = top3.map(item => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;
      padding:8px 12px;background:#FFFFFF;border:1px solid #D8E8DC;border-radius:8px;margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:13px">⭐</span>
        <span style="font-size:12.5px;color:#1A2E1E;font-weight:600">${esc(item.label)}</span>
      </div>
      <span style="font-size:13px;font-weight:700;color:${band.color}">${item.score}</span>
    </div>`).join('');

  return `<div class="card" style="background:${band.bg};border-color:${band.color}55">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
      <div>
        <div class="card-title" style="color:${band.color}">Your Personal Risk Assessment</div>
        <div style="font-size:11px;color:#6A8A6E">10-category intake assessment</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:42px;font-weight:800;color:${band.color};line-height:1">${total}</div>
        <div style="font-size:9px;color:#6A8A6E">/ 200</div>
        <div style="font-size:10px;font-weight:700;color:${band.color};margin-top:2px">${band.label}</div>
      </div>
    </div>
    ${top3.length > 0 ? `
    <div style="font-size:10px;font-weight:700;letter-spacing:.07em;color:#6A8A6E;margin-bottom:8px;text-transform:uppercase">Top 3 Priorities</div>
    ${top3Html}` : ''}
    <button class="btn" style="margin-top:12px;width:100%;justify-content:center"
      onclick="portalAction('goTo','audit-review')">Review Full Assessment →</button>
  </div>`;
}

function renderConsultCTA(): string {
  if (typeof localStorage === 'undefined') return '';
  if (!localStorage.getItem('intake-complete-v1')) return '';
  return `<div class="card" style="background:linear-gradient(135deg,#064030,#085041);border:2px solid #1D9E75;margin-bottom:4px">
    <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#6A8A6E;text-transform:uppercase;margin-bottom:8px">Next Step</div>
    <div style="font-size:17px;font-weight:800;color:#1D9E75;line-height:1.25;margin-bottom:8px">
      Schedule Your Comprehensive 4M Consult
    </div>
    <div style="font-size:12.5px;color:#A8D8C0;line-height:1.7;margin-bottom:10px">
      One consult, full review — see if you're a candidate for weight loss medication (GLP-1s), peptides (nootropic + GH), hormone optimization, prescription protocols, practitioner-grade supplements, and the rest of your personalized 4M plan.
    </div>
    <ul style="margin:0 0 14px;padding:0 0 0 1rem;list-style:none">
      <li style="font-size:11.5px;color:#A8D8C0;padding:2px 0;padding-left:1rem;position:relative"><span style="position:absolute;left:0;color:#1D9E75;font-weight:700">•</span>Weight loss medication candidacy (GLP-1s)</li>
      <li style="font-size:11.5px;color:#A8D8C0;padding:2px 0;padding-left:1rem;position:relative"><span style="position:absolute;left:0;color:#1D9E75;font-weight:700">•</span>Hormone optimization (TRT, thyroid, peptides)</li>
      <li style="font-size:11.5px;color:#A8D8C0;padding:2px 0;padding-left:1rem;position:relative"><span style="position:absolute;left:0;color:#1D9E75;font-weight:700">•</span>Nootropic peptides &amp; cognitive support</li>
      <li style="font-size:11.5px;color:#A8D8C0;padding:2px 0;padding-left:1rem;position:relative"><span style="position:absolute;left:0;color:#1D9E75;font-weight:700">•</span>Practitioner-grade supplement protocol</li>
      <li style="font-size:11.5px;color:#A8D8C0;padding:2px 0;padding-left:1rem;position:relative"><span style="position:absolute;left:0;color:#1D9E75;font-weight:700">•</span>Prescription protocols &amp; lab review</li>
    </ul>
    <a href="https://calendly.com/my4mlife/consult" target="_blank" rel="noopener noreferrer"
      style="display:block;text-align:center;background:#1D9E75;color:#fff;font-size:14px;font-weight:700;padding:14px 20px;border-radius:9px;text-decoration:none;letter-spacing:.02em;margin-bottom:12px">
      Book My Comprehensive 4M Consult →
    </a>
    <div style="text-align:center">
      <button onclick="portalAction('goTo','w1')"
        style="background:none;border:none;color:#6A8A6E;font-size:12px;cursor:pointer;text-decoration:underline;padding:0;font-family:inherit">
        Skip for now — explore my Month 1 plan
      </button>
    </div>
  </div>`;
}

// Strength trend — the weekly Monday retest numbers laid out side by side, with the
// month-over-month change. This is the "month in review" view, surfaced on the dashboard
// so progress is always visible.
//
// FORWARD-COMPATIBLE FOR THE FULL PROGRAM ARC: today the columns read Month 1's weekly
// baseline keys (`w1..w4_baseline_<metric>`). As Months 2-6 ship, append their columns here
// using month-prefixed keys (e.g. `m2w1_baseline_<metric>`) and the same trend renders across
// the entire time a Protégé stays engaged. The metric set never changes, so the line stays
// continuous month over month.
function strengthTrendCard(W: Workbook): string {
  const metrics: Array<[string, string, string]> = [
    ['pushups', 'Max push-ups', ''],
    ['pullups', 'Max pull-ups', ''],
    ['squats', 'Max air squats', ''],
    ['plankSec', 'Plank hold', 's'],
    ['deadhang', 'Dead hang', 's']
  ];
  // Month 1 week columns. (Cross-month: future months append their own [label, keyPrefix] pairs.)
  const cols: Array<[string, string]> = [['W1', 'w1'], ['W2', 'w2'], ['W3', 'w3'], ['W4', 'w4']];

  const val = (k: string, wk: string): string => W.trainLog[`${wk}_baseline_${k}`] ?? '';
  const anyData = metrics.some(([k]) => cols.some(([, wk]) => val(k, wk) !== ''));

  const head = `<div class="card"><div class="card-title">⭐ Strength Trend — Month 1</div>`;

  if (!anyData) {
    return head + `<div style="font-size:12px;color:#6A8A6E;line-height:1.6">
      Every Monday you'll retest five basics — push-ups, pull-ups, air squats, plank hold, dead hang —
      in your weekly workout. Your week-over-week progress shows up here, side by side, so you can watch the numbers climb.
      This trend keeps following you across every month you stay in the program.
    </div></div>`;
  }

  const cellCols = `1.5fr repeat(${cols.length}, 1fr) 0.7fr`;
  const headRow = `<div style="display:grid;grid-template-columns:${cellCols};gap:6px;margin-bottom:6px;min-width:360px">
    ${['Test', ...cols.map(([l]) => l), 'Δ'].map(h =>
      `<div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6A8A6E;text-align:center">${h}</div>`
    ).join('')}
  </div>`;

  const rows = metrics.map(([k, label, unit]) => {
    const vals = cols.map(([, wk]) => val(k, wk));
    const present = vals.map((v, i) => [v, i] as [string, number]).filter(([v]) => v !== '');
    let deltaCell = '—';
    let dColor = '#6A8A6E';
    if (present.length >= 2) {
      const first = Number(present[0][0]);
      const last = Number(present[present.length - 1][0]);
      if (!isNaN(first) && !isNaN(last)) {
        const delta = last - first;
        dColor = delta > 0 ? '#1D9E75' : delta < 0 ? '#E05C2A' : '#6A8A6E';
        deltaCell = (delta > 0 ? '+' : '') + delta;
      }
    }
    return `<div style="display:grid;grid-template-columns:${cellCols};gap:6px;margin-bottom:6px;align-items:center;min-width:360px">
      <div style="font-size:11px;color:#5A3020;font-weight:600">${label}</div>
      ${vals.map(v => `<div style="font-size:12px;color:${v ? '#1A2E1E' : '#C8C8C8'};text-align:center">${v ? esc(v) + unit : '—'}</div>`).join('')}
      <div style="font-size:12px;font-weight:700;color:${dColor};text-align:center">${deltaCell}</div>
    </div>`;
  }).join('');

  return head + `
    <div style="font-size:11px;color:#6A8A6E;margin-bottom:10px;line-height:1.5">Your weekly Monday retest, side by side. Δ = change from your first logged week to your latest. This trend keeps tracking across every month you stay in the program.</div>
    <div style="overflow-x:auto"><div style="min-width:360px">${headRow}${rows}</div></div>
    </div>`;
}

// Protein target reminder line — shows the gram goal carried from the Week 1 calc.
function proteinTargetLine(W: Workbook): string {
  const n = Math.round(Number(W.protein));
  if (!(n > 0)) return '';
  return `<div style="background:#FFF4EC;border:1px solid #F0C8A8;border-radius:9px;padding:10px 13px;margin-bottom:14px;font-size:12px;color:#7A3A20;line-height:1.5">
    <strong>Protein target: ${n} g/day</strong> — carried from your Week 1 calculation (1 g per pound of ideal body weight). Hit it at least 5 of 7 days.
  </div>`;
}

// Vitals tracker — baseline + weekly BP / resting pulse / SpO2 on one cumulative chart so
// the trend is visible across Month 1. Cells are editable everywhere it's shown (values
// persist to W.vitalsLog). Not a medical device — for the member's own tracking.
function vitalsTracker(W: Workbook): string {
  const metrics: Array<[string, string]> = [
    ['sys', 'Systolic (mmHg)'],
    ['dia', 'Diastolic (mmHg)'],
    ['pulse', 'Resting pulse (bpm)'],
    ['spo2', 'SpO₂ (%)']
  ];
  const cols: Array<[string, string]> = [['Baseline', 'base'], ['Wk 1', 'w1'], ['Wk 2', 'w2'], ['Wk 3', 'w3'], ['Wk 4', 'w4']];
  const headRow = `<div style="display:grid;grid-template-columns:1.5fr repeat(5,1fr);gap:6px;margin-bottom:6px;min-width:440px">
    ${['Measure', ...cols.map(c => c[0])].map(h => `<div style="font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#6A8A6E;text-align:center">${h}</div>`).join('')}
  </div>`;
  const rows = metrics.map(([m, label]) => {
    const cells = cols.map(([, c]) => {
      const k = `${c}_${m}`;
      return `<input type="number" inputmode="numeric" value="${esc(W.vitalsLog?.[k] ?? '')}" placeholder="—"
        oninput="portalField('vitalsLog.${k}',this.value)"
        style="font-size:12px;text-align:center;padding:6px 3px;width:100%">`;
    }).join('');
    return `<div style="display:grid;grid-template-columns:1.5fr repeat(5,1fr);gap:6px;margin-bottom:6px;align-items:center;min-width:440px">
      <div style="font-size:11px;color:#1A2E1E;font-weight:600">${label}</div>
      ${cells}
    </div>`;
  }).join('');
  return `<div class="card">
    <div class="card-title">❤️ Vitals Tracker — Blood Pressure &amp; Pulse Ox</div>
    <div style="font-size:11px;color:#6A8A6E;line-height:1.55;margin-bottom:12px">
      Take a baseline blood-pressure and pulse-oximeter reading now, then retest at least once each week. Every reading stays on this chart so you can watch the trend across Month 1.
    </div>
    <div style="overflow-x:auto"><div style="min-width:440px">${headRow}${rows}</div></div>
    <div style="font-size:10px;color:#8A9A88;font-style:italic;margin-top:8px">For your own tracking — not a medical device or diagnosis. Share these numbers with your physician.</div>
  </div>`;
}

function renderDash(W: Workbook): string {
  const m = mornings(W), c = colds(W);
  // Use intake audit data (localStorage audit-v1) for dashboard stats
  const auditScores = loadAuditScores();
  const auditTotal200 = auditScores ? Object.values(auditScores).reduce((a, b) => a + b, 0) : null;
  const auditBand = auditTotal200 !== null ? auditBand200(auditTotal200) : null;
  const auditCategoryCount = auditScores ? Object.values(auditScores).filter(v => v > 0).length : 0;

  // Read name from workbook first; fall back to basics-v1 captured during intake
  let displayName = W.name?.trim() ?? '';
  if (!displayName && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('basics-v1');
      if (raw) {
        const basics = JSON.parse(raw) as { name?: string };
        if (basics.name?.trim()) displayName = basics.name.trim();
      }
    } catch { /* ignore */ }
  }
  const greeting = displayName
    ? `Welcome back, ${esc(displayName)}`
    : 'Welcome to your 4M Dashboard';

  return `
  <div class="page-title" style="color:#1D9E75">${greeting}</div>
  <div class="page-sub">Mind · Muscle · Mitigate · Motivate — Month 1 Brain Optimization</div>

  <div class="card">
    <div class="card-title">Your Profile</div>
    <div class="g3">
      <div><label for="dash-name">Full name</label>
        <input id="dash-name" value="${esc(W.name)}" placeholder="Your name"
          oninput="portalField('name',this.value)"></div>
      <div><label for="dash-startdate">Start date</label>
        <input id="dash-startdate" value="${esc(W.startDate)}" placeholder="e.g. April 14, 2026"
          oninput="portalField('startDate',this.value)"></div>
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-card"><div class="stat-num" style="color:#1D9E75">${auditTotal200 !== null ? auditTotal200 : '—'}</div><div class="stat-lbl">ASSESSMENT SCORE /200</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#1D9E75">${auditBand ? auditBand.label : '—'}</div><div class="stat-lbl">RISK BAND</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#2E7FD9">${m}</div><div class="stat-lbl">MORNINGS DONE</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#2E7FD9">${c}</div><div class="stat-lbl">COLD SHOWERS</div></div>
  </div>

  ${auditBand && auditTotal200 !== null ? `<div class="card" style="background:${auditBand.bg};border-color:${auditBand.color}55;margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:15px;font-weight:700;color:${auditBand.color};margin-bottom:3px">${auditBand.label} Risk</div>
        <div style="font-size:12px;color:#4A7A54">
          ${auditTotal200 <= 60 ? 'Strong foundations — focus on fine-tuning and optimization.'
            : auditTotal200 <= 120 ? 'Multiple factors working against you. Targeted action yields rapid results.'
              : 'This program was built for you. Major gains are available very quickly.'}
        </div>
        <div style="font-size:11px;color:#6A8A6E;margin-top:4px">${auditCategoryCount} of 10 categories scored</div>
      </div>
      <div style="font-size:52px;font-weight:700;color:${auditBand.color};line-height:1">${auditTotal200}</div>
    </div>
  </div>` : ''}

  <div class="card">
    <div class="card-title">Month 1 Progress</div>
    ${[
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

  ${strengthTrendCard(W)}

  ${vitalsTracker(W)}

  ${renderAuditSummaryCard()}

  <div class="card">
    <div class="card-title">Quick Navigation</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${tabs.slice(1).map(t =>
        `<button class="btn" onclick="portalAction('goTo','${t.id}')">${t.icon} ${t.label}</button>`
      ).join('')}
    </div>
  </div>`;
}

// ── Week 1 adherence helpers ────────────────────────────────────────────────
// localStorage cache key pattern: `adherence-cache-<YYYY-MM-DD>-<actionId>` = '1'
// For weekly counters we read all 7 dates of the current ISO week and count
// entries for that actionId. App.svelte writes the same keys when logAdherence
// succeeds; the source of truth is DDB, this is purely a render-time cache.
function todayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function weekDates(): string[] {
  const out: string[] = [];
  const today = new Date();
  const dow = today.getDay(); // 0 = Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return out;
}
function adhDoneToday(actionId: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  return !!localStorage.getItem(`adherence-cache-${todayYMD()}-${actionId}`);
}
function adhCountThisWeek(actionId: string): number {
  if (typeof localStorage === 'undefined') return 0;
  return weekDates().filter(d => !!localStorage.getItem(`adherence-cache-${d}-${actionId}`)).length;
}

function w1ActiveDaily(actionId: string, label: string): string {
  const done = adhDoneToday(actionId);
  return `<div class="w1-action-row${done ? ' done' : ''}" onclick="portalAction('logAdherence','${actionId}')">
    <div class="w1-action-text">${label}</div>
    <div class="w1-action-state ${done ? '' : 'pending'}">${done ? '✓ Done today' : 'Tap to log'}</div>
  </div>`;
}
function w1ActiveWeekly(actionId: string, label: string, target: number): string {
  const count = adhCountThisWeek(actionId);
  const doneToday = adhDoneToday(actionId);
  const reached = count >= target;
  return `<div class="w1-action-row${reached ? ' done' : ''}" onclick="portalAction('logAdherence','${actionId}')">
    <div class="w1-action-text">${label}</div>
    <div class="w1-action-state ${reached ? '' : 'pending'}">${count}/${target}${doneToday && !reached ? ' · logged today' : ''}</div>
  </div>`;
}
function w1DimWrap(_unlockWeek: number, inner: string): string {
  // 2026-06-14: gating disabled for UX-testing access — full Month 1 (all 4 weeks) is open
  // to every Protégé. The dim/lock pattern stays in source so we can re-enable later by
  // reverting this one function. The unlockWeek arg is preserved for callers.
  return inner;
}

// Compute Mon..Sun YYYY-MM-DD strings for the current ISO week (Mon-anchored).
function weekdayDates(): { mon: string; tue: string; wed: string; thu: string; fri: string; sat: string; sun: string } {
  const all = weekDates();
  return { mon: all[0], tue: all[1], wed: all[2], thu: all[3], fri: all[4], sat: all[5], sun: all[6] };
}

// Renders a row of weekday checkboxes for a given adherence actionId.
// days: 'mf' = Mon-Fri (5 boxes), 'all' = Mon-Sun (7 boxes).
function w1WeekdayRow(actionId: string, label: string, days: 'mf' | 'all', minimum: number): string {
  const wd = weekdayDates();
  const labels: Array<[string, string]> = days === 'mf'
    ? [['M', wd.mon], ['T', wd.tue], ['W', wd.wed], ['T', wd.thu], ['F', wd.fri]]
    : [['M', wd.mon], ['T', wd.tue], ['W', wd.wed], ['T', wd.thu], ['F', wd.fri], ['S', wd.sat], ['S', wd.sun]];
  const today = todayYMD();
  const boxes = labels.map(([dl, date]) => {
    const done = typeof localStorage !== 'undefined' && !!localStorage.getItem(`adherence-cache-${date}-${actionId}`);
    const isFuture = date > today;
    const bg = done ? '#1D9E75' : isFuture ? '#F4F4F4' : '#FFFFFF';
    const fg = done ? '#FFFFFF' : isFuture ? '#B8B8B8' : '#1A3A20';
    const border = done ? '#1D9E75' : '#D8E8DC';
    const cursor = isFuture ? 'not-allowed' : 'pointer';
    const onclick = isFuture ? '' : `onclick="portalAction('logAdherence','${actionId}','${date}')"`;
    return `<div ${onclick} style="display:flex;flex-direction:column;align-items:center;gap:3px;cursor:${cursor};flex:1;min-width:0">
      <div style="width:34px;height:34px;border-radius:8px;border:1.5px solid ${border};background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">${done ? '✓' : ''}</div>
      <div style="font-size:10px;font-weight:600;color:#5A8A64">${dl}</div>
    </div>`;
  }).join('');
  const done = labels.filter(([, date]) => typeof localStorage !== 'undefined' && !!localStorage.getItem(`adherence-cache-${date}-${actionId}`)).length;
  return `<div style="background:#FFFFFF;border:1.5px solid #D8E8DC;border-radius:9px;padding:11px 12px;margin-bottom:9px">
    <div style="font-size:12.5px;font-weight:700;color:#1A2E1E;margin-bottom:8px">${label}</div>
    <div style="display:flex;gap:6px;justify-content:space-between;margin-bottom:6px">${boxes}</div>
    <div style="font-size:10.5px;color:#5A8A64;text-align:center">Recommended minimum: ${minimum} per week · Logged: ${done}</div>
  </div>`;
}

// Standing carry-forward rule (TJ 2026-06-19): data entered once is recalled
// automatically in later weeks. Returns the value to display — the user's per-week
// override if they've typed one, otherwise the canonical earlier-week value — plus a
// "(carried from Week 1)" hint shown only while the carried-over value is in use.
function carryForward(override: string | undefined, source: string, fromLabel = 'carried from Week 1'): { value: string; hint: string } {
  const hasOverride = (override ?? '').trim() !== '';
  const value = hasOverride ? (override as string) : (source ?? '');
  const hint = !hasOverride && (source ?? '').trim() !== ''
    ? ` <span style="font-size:10px;color:#6B5ED4;font-style:italic;font-weight:600">(${fromLabel})</span>`
    : '';
  return { value, hint };
}

function renderW1(ctx: RenderContext): string {
  const { W } = ctx;

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

  const motivationOptions = [
    "Fear of cognitive decline — I don't want to lose my sharpness or independence as I age",
    'Desire to optimize — I want to perform at my absolute peak for as long as possible',
    'Both equally — motivated by avoiding decline AND reaching my highest potential'
  ];

  return `${weekBanner(1)}

  ${vitalsTracker(W)}

  <div style="background:linear-gradient(135deg,#064030,#085041);border:2px solid #1D9E75;border-radius:13px;padding:20px 22px;margin-bottom:20px">
    <div style="font-size:17px;font-weight:800;color:#1D9E75;margin-bottom:7px;letter-spacing:.01em;line-height:1.25">
      Week 1: Repair the Gut. Restore the Brain.
    </div>
    <div style="font-size:12.5px;color:#A8D8C0;line-height:1.75">
      Most cognitive issues start in the gut. This week we calm inflammation, rebuild the lining, and restore the gut–brain axis so your neurotransmitters can do their job.
    </div>
  </div>


  <div class="card">
    ${pillarHeader('M4', 'MOTIVATE — Foundation', '#6B5ED4', 'Why are you here? Lock in your reason before anything else.')}
    <div class="w1-active">
      <div class="w1-active-label">This week</div>
      ${w1ActiveWeekly('motivate-zoom', "Attend (or watch the recording of) this week's Protégé Zoom", 1)}
    </div>
    <div style="margin-top:6px;margin-bottom:14px">
      <div style="font-size:12.5px;font-weight:700;color:#1A2E1E;margin-bottom:8px">What is driving you?</div>
      ${motivationOptions.map((opt, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
          background:${W.motivation === String(i) ? 'rgba(107,94,212,.10)' : '#FFFFFF'};
          border:1.5px solid ${W.motivation === String(i) ? '#6B5ED4' : '#D8E8DC'};
          border-radius:8px;cursor:pointer;margin-bottom:7px"
          onclick="portalFieldRender('motivation','${i}')">
          <div style="width:16px;height:16px;border-radius:50%;
            border:2px solid ${W.motivation === String(i) ? '#6B5ED4' : '#D8E8DC'};
            background:${W.motivation === String(i) ? '#6B5ED4' : 'transparent'};flex-shrink:0"></div>
          <span style="font-size:12.5px;color:#1A2E1E;font-weight:500">${esc(opt)}</span>
        </div>`).join('')}
    </div>
    ${w1DimWrap(2, `<label for="w1-personal-why">My "why" — the man I want to be at age 70</label>
    <textarea id="w1-personal-why" style="min-height:70px" placeholder="Write it here — you will read this aloud on graduation day..."
      oninput="portalField('personalWhy',this.value)">${esc(W.personalWhy)}</textarea>`)}
    ${w1DimWrap(3, `<label for="w1-accountability">Who are you doing this for? (you'll read your "why" aloud to them on graduation day)</label>
    <input id="w1-accountability" placeholder="e.g. my wife, my kids, my parents, myself — pick one face" value="${esc(W.accountabilityTarget)}"
      oninput="portalField('accountabilityTarget',this.value)">
    <div style="font-size:11.5px;color:#4A7A54;margin:6px 0 0">If no one is on the other end of this, you won't do it. Pick a person — see their face.</div>`)}
    ${w1DimWrap(4, `<label for="w1-identity-stmt">My identity statement (draft) — "I am a man who..."</label>
    <input id="w1-identity-stmt" placeholder="I am a man who..." value="${esc(W.identityStatement)}"
      oninput="portalField('identityStatement',this.value)">`)}
  </div>

  <div class="card">
    ${pillarHeader('M1', 'MITIGATE — Week 1 Deep Focus', '#1D9E75', 'Review your assessment results. Gut first — what you remove matters more than what you add.')}
    <div class="w1-active">
      <div class="w1-active-label">This week</div>
      ${w1WeekdayRow('mitigate-biome-ns', 'Take Biome NS Ultra (with breakfast)', 'mf', 5)}
      ${w1WeekdayRow('mitigate-eating-window', 'Stayed in eating window today', 'mf', 5)}
    </div>
    <div style="font-size:12px;font-weight:600;color:#1D9E75;margin-bottom:12px;font-style:italic">
      Your 10-category Personal Risk Assessment was completed during intake. Review your scores on the dashboard.
    </div>
    <button class="btn" style="margin-bottom:16px" onclick="portalAction('goTo','audit-review')">View Full Assessment →</button>
    <div>
      <div class="card-title">My Top 3 Priority Factors</div>
      ${(() => {
        const intakeOk = typeof localStorage !== 'undefined' && !!localStorage.getItem('intake-complete-v1');
        if (!intakeOk) return `<div style="font-size:12px;color:#6A8A6E;font-style:italic;padding:8px 0">Complete your assessment to see your top 3 priorities.</div>`;
        const auditScores = loadAuditScores();
        const top3 = auditScores ? selectTop3(auditScores) : [];
        const PRIORITY_TIER_IDS = ['leaky-gut', 'gut-microbiome', 'weight-body-fat', 'hormone-balance'];
        return [0, 1, 2].map(i => {
          const fromAudit = top3[i];
          const isPriority = fromAudit ? PRIORITY_TIER_IDS.includes(
            AUDIT_CATEGORIES.find(c => c.label === fromAudit.label)?.id ?? ''
          ) : false;
          const auditPrefill = fromAudit ? `${fromAudit.label} (${fromAudit.score}/10)` : '';
          const displayVal = W.priorities[i] || auditPrefill || '—';
          const label = ['Highest score — fastest results', 'Second priority', 'Third priority'][i];
          return `<div style="margin-bottom:10px;padding:10px 12px;background:#F4FBF6;border:1.5px solid #B8E8D0;border-radius:8px">
            <div style="font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1A5A34;margin-bottom:3px">${i + 1}. ${label}${isPriority ? ` <span style="font-size:9.5px;background:#D4920A22;color:#D4920A;border-radius:4px;padding:2px 6px;font-weight:700">⭐ Priority</span>` : ''}</div>
            <div style="font-size:14px;font-weight:700;color:#0E2E1A">${esc(displayVal)}</div>
          </div>`;
        }).join('');
      })()}
    </div>
    ${w1DimWrap(2, `<div class="card-title" style="margin-top:12px">My Specific Commitments</div>
    ${[0, 1, 2].map(i => `
      <div style="margin-bottom:9px">
        <label for="w1-commitment-${i}">Priority ${i + 1} — this week I will</label>
        <input id="w1-commitment-${i}" value="${esc(W.commitments[i] ?? '')}" placeholder="Be specific — what, when, how..."
          oninput="portalField('commitments.${i}',this.value)">
      </div>`).join('')}`)}
  </div>

  <div class="card">
    ${pillarHeader('M2', 'MUSCLE — Establish Your Baseline', '#E05C2A', 'Record where you are starting.')}
    <div class="w1-active">
      <div class="w1-active-label">This week</div>
      ${w1WeekdayRow('muscle-strength', 'Strength session — countertop push-ups 3×10 + supported air squats 3×10', 'all', 2)}
    </div>
    <div class="card-title">Body Composition — Week 1 Baseline</div>
    ${(() => {
      // Pre-fill weight from basics-v1 (captured in Stage 1 intake)
      let basicsWeight = '';
      try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('basics-v1') : null;
        if (raw) {
          const basics = JSON.parse(raw) as { weight?: string | number };
          if (basics.weight !== undefined && String(basics.weight).trim()) basicsWeight = String(basics.weight);
        }
      } catch { /* ignore */ }
      const fields: [string, string, string][] = [
        ['weight', 'Body weight (lbs)', basicsWeight],
        ['waist', 'Waist at navel (in)', ''],
        ['energy', 'Morning energy (1–10)', ''],
        ['mood', 'Mood rating (1–10)', ''],
      ];
      return `<div class="g2" style="margin-bottom:16px">
      ${fields.map(([k, l, prefill]) => {
        const val = W.bodyBaseline[k as keyof typeof W.bodyBaseline] || prefill;
        const hint = prefill && !W.bodyBaseline[k as keyof typeof W.bodyBaseline]
          ? `<div style="font-size:10px;color:#6A8A6E;font-style:italic;margin-top:3px">from intake answers</div>` : '';
        return `<div>
          <label for="bodyBaseline-${k}">${esc(l)}</label>
          <input id="bodyBaseline-${k}" value="${esc(val)}" placeholder="Record now..."
            oninput="portalField('bodyBaseline.${k}',this.value)">${hint}
        </div>`;
      }).join('')}
    </div>`;
    })()}
    <label for="w1-protein-target">Ideal body weight (lbs)</label>
    <div style="font-size:11px;color:#5A8A64;margin:0 0 6px;line-height:1.5">Your daily protein target = <strong>1 gram per pound of ideal body weight</strong> (e.g. 200 lb ideal = 200 g/day).</div>
    <input id="w1-protein-target" type="number" placeholder="e.g. 185" value="${esc(W.protein)}"
      oninput="portalField('protein',this.value);(function(v){var n=Number(v);var r=document.getElementById('w1-protein-result');var g=document.getElementById('w1-protein-grams');if(r)r.style.display=n>0?'flex':'none';if(g)g.textContent=(n>0?Math.round(n):0)+'g';})(this.value)">
    <div id="w1-protein-result" style="margin-top:10px;background:#F0FAF5;border:1.5px solid #B8E8D0;border-radius:9px;padding:12px;align-items:center;justify-content:center;gap:10px;display:${Number(W.protein) > 0 ? 'flex' : 'none'}">
      <div id="w1-protein-grams" style="font-size:28px;font-weight:700;color:#1D9E75">${Math.round(Number(W.protein))}g</div>
      <div style="font-size:10px;color:#5A8A64">protein per day target</div>
    </div>
  </div>

  <div class="card" style="border-left:4px solid #E05C2A">
    <div class="card-title" style="color:#E05C2A">🟠 M2 — MUSCLE: Week 1 Workout Log — Baseline</div>
    <div style="background:rgba(224,92,42,.06);border:1px solid rgba(224,92,42,.18);border-radius:9px;padding:12px 14px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;color:#E05C2A;letter-spacing:.07em;margin-bottom:5px">⭐ THIS WEEK</div>
      <div style="font-size:12.5px;color:#7A3A20;line-height:1.6">
        Record where you start. No judgment — just honest numbers. These become your comparison point for Week 4.
      </div>
    </div>

    ${workoutLog(W, 1)}

    <div style="margin-top:14px">
      <label for="w1-other-workout">Any other workout activity completed this week you'd like to document?</label>
      <textarea id="w1-other-workout" style="min-height:60px" placeholder="Walks, yard work, bike rides, sports — anything that got you moving..."
        oninput="portalField('weekReflections.w1_other_workout',this.value)">${esc(W.weekReflections['w1_other_workout'] ?? '')}</textarea>
    </div>
  </div>

  <div class="card">
    ${pillarHeader('M3', 'MIND — Circadian Anchor', '#2E7FD9', 'Anchor your day with light. The brain runs on signal, not effort.')}
    <div class="w1-active">
      <div class="w1-active-label">This week</div>
      ${w1WeekdayRow('mind-sunlight-walk', 'Fasted morning sunlight walk (10 min, no food yet, eyes toward sun, sunglasses off)', 'all', 2)}
    </div>
  </div>

  <div class="card" style="border-color:#2E7FD955;background:rgba(46,127,217,.04)">
    <div class="card-title" style="color:#2E7FD9">How to Box Breathe (~2 minutes daily)</div>
    <ol style="margin:10px 0 12px;padding-left:20px;display:flex;flex-direction:column;gap:7px">
      <li style="font-size:12.5px;color:#1A2E1E;line-height:1.5"><strong>Inhale</strong> through your nose for 4 seconds.</li>
      <li style="font-size:12.5px;color:#1A2E1E;line-height:1.5"><strong>Hold</strong> at the top for 4 seconds.</li>
      <li style="font-size:12.5px;color:#1A2E1E;line-height:1.5"><strong>Exhale</strong> through your mouth for 4 seconds.</li>
      <li style="font-size:12.5px;color:#1A2E1E;line-height:1.5"><strong>Hold</strong> at the bottom for 4 seconds.</li>
      <li style="font-size:12.5px;color:#1A2E1E;line-height:1.5">Repeat for 5–10 cycles.</li>
    </ol>
    <div style="font-size:12px;color:#1f4f7a;line-height:1.65;border-top:1px solid rgba(46,127,217,.2);padding-top:10px">
      Box breathing calms the autonomic nervous system, lowers cortisol, and primes focus for the day. Used by Navy SEALs and elite performers.
    </div>
  </div>

  ${morningTracker(W, 1)}

  ${renderWeekCogTraining(W, 1)}

  <div style="margin-top:16px">
    ${fastingDailyTracker(W, 1)}
  </div>

  ${renderWeekNutritionSection(W, 1)}`;
}

// Audit category id → factor.name in factors.ts. Used to carry the audit
// top 3 forward into Week 2's MITIGATE picker. Categories without a direct
// factor in the catalog stay blank — user picks manually.
const AUDIT_ID_TO_FACTOR_NAME: Record<string, string> = {
  'gut-microbiome': 'Gut microbiome health',
  'sleep': 'Sleep quality & duration',
  'weight-body-fat': 'Excess body fat',
  'nutrition': 'Poor nutrition quality',
  'cognitive': 'Cognitive disengagement',
};

function auditTop3WithIds(): Array<{ id: string; rawScore: number }> {
  const scores = loadAuditScores();
  if (!scores) return [];

  // Honor the same override rule as selectTop3 (locked 2026-06-01):
  // already-diagnosed >= 3 → forced #1, remaining 2 picked from others.
  const diagId = 'already-diagnosed';
  const diagScore = scores[diagId] ?? 0;
  const ranked = AUDIT_CATEGORIES
    .map(cat => ({ id: cat.id, raw: scores[cat.id] ?? 0, bonus: AUDIT_BONUS_BY_ID[cat.id] ?? 0 }))
    .map(x => ({ ...x, total: x.raw + x.bonus }));

  if (diagScore >= 3) {
    const diag = ranked.find(x => x.id === diagId);
    if (diag) {
      const others = ranked
        .filter(x => x.id !== diagId && x.raw > 0)
        .sort((a, b) => b.total - a.total || b.bonus - a.bonus || a.id.localeCompare(b.id))
        .slice(0, 2);
      return [diag, ...others].map(x => ({ id: x.id, rawScore: x.raw }));
    }
  }

  return ranked
    .filter(x => x.raw > 0)
    .sort((a, b) => b.total - a.total || b.bonus - a.bonus || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map(x => ({ id: x.id, rawScore: x.raw }));
}

function renderW2(W: Workbook): string {
  const wRef = W.weekReflections;
  const g = (k: string) => esc(wRef[k] ?? '');
  const top3 = auditTop3WithIds();
  const proteinTargetFallback = Number(W.protein) > 0 ? `${Math.round(Number(W.protein))}g/day` : '';

  const pillarActionBox = (color: string, content: string) =>
    `<div style="background:${color}0F;border:1px solid ${color}33;border-radius:9px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:${color};letter-spacing:.07em;margin-bottom:5px">▶ ACTION THIS WEEK</div>
      <div style="font-size:12px;color:#1A2E1E;line-height:1.6">${content}</div>
    </div>`;

  return `${weekBanner(2)}

  ${vitalsTracker(W)}

  <div class="card" style="background:rgba(224,92,42,.04);border:1px solid rgba(224,92,42,.18)">
    <div style="font-size:14px;font-weight:700;color:#7A2E14;margin-bottom:6px">All 4 Pillars Continue — Week 2</div>
    <div style="font-size:12.5px;color:#5A3020;line-height:1.7">
      Your baseline is set. This week everything moves from measurement to action.
      Deep focus this week is <strong>Muscle</strong> — your movement protocol and protein target.
      All four pillars get check-ins and action items below.
    </div>
  </div>

  <!-- MOTIVATE W2 -->
  <div class="card" style="border-left:4px solid #6B5ED4">
    <div class="card-title" style="color:#6B5ED4">🟣 M4 — MOTIVATE: Week 2 Check-In</div>
    <div style="margin-bottom:12px">
      ${(() => { const c = carryForward(wRef['w2_why'], W.personalWhy); return `
      <label for="w2-my-why">My WHY (from Week 1) — read it out loud right now${c.hint}</label>
      <textarea id="w2-my-why" style="min-height:52px;background:#F9F7FF;border-color:#C8C0F0;font-size:13px;font-style:italic"
        placeholder="Your Week 1 why carries over here automatically — edit it if it has evolved."
        oninput="portalField('weekReflections.w2_why',this.value)">${esc(c.value)}</textarea>`; })()}
    </div>
    <div class="g2" style="margin-bottom:12px">
      <div>
        <label for="w2-identity-check">Did my Week 1 identity statement feel true?</label>
        <textarea id="w2-identity-check" style="min-height:52px" placeholder="Honest reflection..."
          oninput="portalField('weekReflections.w2_identity_check',this.value)">${g('w2_identity_check')}</textarea>
      </div>
      <div>
        ${(() => { const c = carryForward(wRef['w2_acct'], W.accountabilityTarget); return `
        <label for="w2-acct">Who is my accountability partner in this program?${c.hint}</label>
        <input id="w2-acct" placeholder="Name and check-in method..."
          value="${esc(c.value)}" oninput="portalField('weekReflections.w2_acct',this.value)">`; })()}
        <div style="margin-top:6px">
          <label for="w2-acct-freq">We agreed to check in every</label>
          <input id="w2-acct-freq" placeholder="e.g. Sunday evening by text..."
            value="${g('w2_acct_freq')}" oninput="portalField('weekReflections.w2_acct_freq',this.value)">
        </div>
      </div>
    </div>
    ${pillarActionBox('#6B5ED4', 'Send your WHY statement to your accountability partner by Wednesday. No explanation needed — just send it. Let someone outside your own head know what you are doing and why.')}
  </div>

  <!-- MITIGATE W2 -->
  <div class="card" style="border-left:4px solid #1D9E75">
    <div class="card-title" style="color:#1D9E75">🟢 M1 — MITIGATE: Top 3 Factor Actions</div>
    <div style="font-size:12.5px;color:#3A6A44;margin-bottom:12px;line-height:1.6">
      You identified your top 3 highest-scoring risk factors in Week 1.
      This week (Week 2): execute one immediate action for each factor, then assess it at the end of Week 2.
    </div>
    ${[1, 2, 3].map(n => {
      const userSetName = g(`w2_factor${n}_name`);
      const userSetScore = g(`w2_factor${n}_score`);
      const auditItem = top3[n - 1];
      const fallbackName = auditItem ? (AUDIT_ID_TO_FACTOR_NAME[auditItem.id] ?? '') : '';
      const fallbackScore = auditItem ? String(auditItem.rawScore) : '';
      const selectedName = userSetName || fallbackName;
      const displayScore = userSetScore || fallbackScore;
      const prefilled = !userSetName && !!fallbackName;
      const prefillTag = prefilled ? ` <span style="font-size:10px;color:#3A6A44;font-style:italic;font-weight:600">(auto-filled from assessment)</span>` : '';
      return `
    <div style="background:#F5FAF6;border:1px solid #D8E8DC;border-radius:9px;padding:14px;margin-bottom:10px">
      <div style="font-size:10px;font-weight:700;color:#1D9E75;letter-spacing:.06em;margin-bottom:7px">PRIORITY FACTOR ${n}</div>
      <div class="g2">
        <div>
          <label for="w2-f${n}-name">Factor name (from your Week 1 assessment)${prefillTag}</label>
          ${factorNameSelect(selectedName, `weekReflections.w2_factor${n}_name`)}
        </div>
        <div>
          <label for="w2-f${n}-score">Week 1 score (0–10) you gave it</label>
          <input id="w2-f${n}-score" type="number" min="0" max="10" placeholder="0–10"
            value="${esc(displayScore)}"
            oninput="portalField('weekReflections.w2_factor${n}_score',this.value)">
        </div>
      </div>
      ${priorityActionReminder(W, selectedName)}
      <div style="margin-top:8px">
        <label for="w2-f${n}-action">Immediate action I took in Week 2 for this factor</label>
        <textarea id="w2-f${n}-action" style="min-height:48px" placeholder="What did you actually do?"
          oninput="portalField('weekReflections.w2_factor${n}_action',this.value)">${g(`w2_factor${n}_action`)}</textarea>
      </div>
      <div style="margin-top:8px">
        <label for="w2-f${n}-result">End of Week 2 — did this action move the needle? How?</label>
        <input id="w2-f${n}-result" placeholder="Honest assessment..."
          value="${g(`w2_factor${n}_result`)}"
          oninput="portalField('weekReflections.w2_factor${n}_result',this.value)">
      </div>
    </div>`;
    }).join('')}
    ${pillarActionBox('#1D9E75', 'One immediate action per factor. No perfect plans. Just one small move on each of your top 3. Progress compounds — even a 4/10 is better than an 8/10 by week 4.')}
  </div>

  <!-- MUSCLE W2 DEEP FOCUS -->
  <div class="card" style="border-left:4px solid #E05C2A">
    <div class="card-title" style="color:#E05C2A">🟠 M2 — MUSCLE: Week 2 Deep Focus — Movement & Protein</div>
    <div style="background:rgba(224,92,42,.06);border:1px solid rgba(224,92,42,.18);border-radius:9px;padding:12px 14px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;color:#E05C2A;letter-spacing:.07em;margin-bottom:5px">⭐ THIS WEEK'S DEEP FOCUS</div>
      <div style="font-size:12.5px;color:#7A3A20;line-height:1.6">
        <strong>Movement starts now.</strong> The KOT beginner playlist (Ben Patrick / Knees Over Toes Guy)
        is your gym-free foundation. 3 sessions this week.
        Protein target must be hit at least 5 out of 7 days.
        Eating window: still 14:10 (first meal after 9am, last before 7pm).
      </div>
    </div>

    ${workoutLog(W, 2)}

    <div style="margin-top:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">PROTEIN & EATING WINDOW COMPLIANCE</div>
      <div class="g2">
        <div>
          <label for="w2-protein-target">My protein target (from Week 1 calculator)${!wRef['w2_protein_target'] && proteinTargetFallback ? ` <span style="font-size:10px;color:#7A3A20;font-style:italic;font-weight:600">(from Week 1)</span>` : ''}</label>
          <input id="w2-protein-target" placeholder="e.g. 165g/day" value="${esc(wRef['w2_protein_target'] ?? proteinTargetFallback)}"
            oninput="portalField('weekReflections.w2_protein_target',this.value)">
        </div>
        <div>
          <label for="w2-protein-days">Days I hit protein target (out of 7)</label>
          <input id="w2-protein-days" type="number" min="0" max="7" placeholder="0–7"
            value="${g('w2_protein_days')}"
            oninput="portalField('weekReflections.w2_protein_days',this.value)">
        </div>
        <div>
          <label for="w2-fasting-days">Days I held 14:10 eating window (out of 7)</label>
          <input id="w2-fasting-days" type="number" min="0" max="7" placeholder="0–7"
            value="${g('w2_fasting_days')}"
            oninput="portalField('weekReflections.w2_fasting_days',this.value)">
        </div>
        <div>
          <label for="w2-nutr-win">Biggest nutrition win this week</label>
          <input id="w2-nutr-win" placeholder="What worked?"
            value="${g('w2_nutr_win')}" oninput="portalField('weekReflections.w2_nutr_win',this.value)">
        </div>
      </div>
    </div>

    <div style="margin-top:16px">
      ${fastingDailyTracker(W, 2)}
    </div>

    ${pillarActionBox('#E05C2A', `3 KOT sessions. Hit protein 5 of 7 days. Hold your 14:10 window.
      These three numbers are the only scorecard that matters this week.
      <a class="res-pill" href="https://www.youtube.com/c/TheKneesovertoesguy"
        target="_blank" style="margin-left:8px">KOT Playlist ↗</a>`)}
  </div>

  <!-- MIND W2 -->
  <div class="card" style="border-left:4px solid #2E7FD9">
    <div class="card-title" style="color:#2E7FD9">🔵 M3 — MIND: Week 2 Cognitive Check-In</div>
    <div class="g3" style="margin-bottom:14px">
      ${[['focus', 'Focus'], ['memory', 'Memory'], ['mood', 'Mood']].map(([k, l]) => `
        <div>
          <label for="w2-cog-${k}">W2 ${l} (1–10)</label>
          <input id="w2-cog-${k}" type="number" min="1" max="10" placeholder="1–10"
            value="${esc(W.cogRatings[`w2_${k}`] ?? '')}"
            oninput="portalField('cogRatings.w2_${k}',this.value)">
          <div style="font-size:9px;color:#8AB89A;margin-top:3px">W1 baseline: ${esc(W.cogRatings[`w1_${k}`] ?? '—')}</div>
        </div>`).join('')}
    </div>

    <div style="margin-bottom:12px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">WEEK 2 SUPPLEMENT COMPLIANCE</div>
      ${['Biome NS Ultra (BPC-157 + L-Glutamine)', 'SleepRestore (magnesium bisglycinate + glycine + apigenin + L-theanine + KSM-66 — before bed)'].map((name, i) => {
        const key = `w2s${i}`;
        const resp = W.supplements[key]?.response ?? '';
        return `<div style="display:flex;justify-content:space-between;align-items:center;
          padding:9px 0;border-bottom:1px solid #E8F0E8">
          <div style="font-size:12px;color:#1A2E1E">${esc(name)}</div>
          <div style="display:flex;gap:5px">
            ${(['Yes', 'No'] as const).map(v => `
              <button class="btn xs"
                style="background:${resp === v ? (v === 'Yes' ? '#1D9E75' : '#E8E8E8') : '#FFFFFF'};
                  color:${resp === v ? '#fff' : '#4A7A54'};
                  border-color:${resp === v ? (v === 'Yes' ? '#1D9E75' : '#999') : '#D8E8DC'}"
                onclick="portalAction('setSupp','${key}','${v}')">${v}</button>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>

    <div>
      <label for="w2-mind-obs">Am I noticing anything different? Sleep, energy, digestion, focus — anything?</label>
      <textarea id="w2-mind-obs" style="min-height:58px" placeholder="Honest early observations only. No judgment."
        oninput="portalField('weekReflections.w2_mind_obs',this.value)">${g('w2_mind_obs')}</textarea>
    </div>

    ${pillarActionBox('#2E7FD9', `Both Week 1 supplements continue every day (Biome NS Ultra + SleepRestore).
      <strong>Week 2 — Add: OmegaCN Prime</strong> (2 softgels with dinner — EPA/DHA + Kaneka QH® ubiquinol CoQ10) and <strong>ArmorVita</strong> (1 softgel with a fatty meal — D3 + K2 + Boron + A + Astaxanthin).
      Score your cognitive triad (focus / memory / mood) on Sunday.
      Read at least 10 pages of <em>Begin with the End in Mind</em> each day — check off each day in the Cognitive Training section below.`)}
  </div>

  ${renderWeekCogTraining(W, 2)}

  ${morningTracker(W, 2)}

  <div class="card">
    <div class="card-title">Week 2 Reflection — All 4 Pillars</div>
    ${[['w2_motivate_ref', 'MOTIVATE: Did sharing your WHY make it feel more real?'],
       ['w2_mitigate_ref', 'MITIGATE: Which factor action was hardest to start?'],
       ['w2_muscle_ref', 'MUSCLE: How did your body feel after your first KOT sessions?'],
       ['w2_mind_ref', 'MIND: Any early signals from supplements or sleep quality change?']
    ].map(([k, l]) => `
      <div style="margin-bottom:12px">
        <label for="ref-${k}">${l}</label>
        <textarea id="ref-${k}" oninput="portalField('weekReflections.${k}',this.value)">${g(k)}</textarea>
      </div>`).join('')}
  </div>

  ${renderWeekNutritionSection(W, 2)}`;
}

function renderW3(W: Workbook): string {
  const wRef = W.weekReflections;
  const g = (k: string) => esc(wRef[k] ?? '');
  const { supplements } = W;

  const pillarActionBox = (color: string, content: string) =>
    `<div style="background:${color}0F;border:1px solid ${color}33;border-radius:9px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:${color};letter-spacing:.07em;margin-bottom:5px">▶ ACTION THIS WEEK</div>
      <div style="font-size:12px;color:#1A2E1E;line-height:1.6">${content}</div>
    </div>`;

  return `${weekBanner(3)}

  ${proteinTargetLine(W)}

  ${vitalsTracker(W)}

  <div class="card" style="background:rgba(46,127,217,.04);border:1px solid rgba(46,127,217,.18)">
    <div style="font-size:14px;font-weight:700;color:#0C447C;margin-bottom:6px">All 4 Pillars — Mid-Month Deep Work</div>
    <div style="font-size:12.5px;color:#1A3050;line-height:1.7">
      Two weeks in. This is where it gets real. Deep focus this week is <strong>Mind</strong> —
      we introduce the full 7-supplement brain stack.
      Every other pillar gets a mid-month check-in and upgraded actions.
    </div>
  </div>

  <!-- MOTIVATE W3 -->
  <div class="card" style="border-left:4px solid #6B5ED4">
    <div class="card-title" style="color:#6B5ED4">🟣 M4 — MOTIVATE: Momentum & Obstacles</div>
    <div class="g2" style="margin-bottom:12px">
      <div>
        <label for="w3-big-win">My biggest win from the first 2 weeks</label>
        <textarea id="w3-big-win" style="min-height:52px" placeholder="Something that actually happened..."
          oninput="portalField('weekReflections.w3_big_win',this.value)">${g('w3_big_win')}</textarea>
      </div>
      <div>
        <label for="w3-obstacle">The hardest obstacle I ran into</label>
        <textarea id="w3-obstacle" style="min-height:52px" placeholder="Be specific — what exactly got in the way?"
          oninput="portalField('weekReflections.w3_obstacle',this.value)">${g('w3_obstacle')}</textarea>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <label for="w3-recovery">What did I do when I missed a day or fell short? Did I get back on track?</label>
      <textarea id="w3-recovery" style="min-height:52px" placeholder="The recovery pattern matters more than perfection..."
        oninput="portalField('weekReflections.w3_recovery',this.value)">${g('w3_recovery')}</textarea>
    </div>
    <div style="margin-bottom:12px">
      <label for="w3-identity-evolve">My identity is evolving — complete this sentence: "The man I am becoming..."</label>
      <textarea id="w3-identity-evolve" style="min-height:52px;font-size:13px;font-style:italic;border-color:#C8C0F0"
        placeholder="The man I am becoming..."
        oninput="portalField('weekReflections.w3_identity_evolve',this.value)">${g('w3_identity_evolve')}</textarea>
    </div>
    ${pillarActionBox('#6B5ED4', 'Share your Week 3 identity sentence with your accountability partner. Tell someone what you are actually doing — not just that you are "eating better." Specifics only.')}
  </div>

  <!-- MITIGATE W3 -->
  <div class="card" style="border-left:4px solid #1D9E75">
    <div class="card-title" style="color:#1D9E75">🟢 M1 — MITIGATE: Mid-Month Factor Progress</div>
    <div style="font-size:12.5px;color:#3A6A44;margin-bottom:12px;line-height:1.6">
      Progress-check your top 3 factors from Week 1.
      Rescore each one based on what you have actually done. Then identify your next step.
    </div>
    ${[1, 2, 3].map(n => {
      const selectedName = g(`w3_factor${n}_name`) || g(`w2_factor${n}_name`);
      return `
    <div style="background:#F5FAF6;border:1px solid #D8E8DC;border-radius:9px;padding:14px;margin-bottom:10px">
      <div style="font-size:10px;font-weight:700;color:#1D9E75;letter-spacing:.06em;margin-bottom:7px">FACTOR ${n} — MID-MONTH UPDATE</div>
      <div class="g2" style="margin-bottom:8px">
        <div>
          <label for="w3-f${n}-name">Factor name</label>
          ${factorNameSelect(selectedName, `weekReflections.w3_factor${n}_name`)}
        </div>
        <div>
          <label for="w3-f${n}-rescore">Re-score this factor (0–10)</label>
          <input id="w3-f${n}-rescore" type="number" min="0" max="10" placeholder="Better than Week 1?"
            value="${g(`w3_factor${n}_rescore`)}"
            oninput="portalField('weekReflections.w3_factor${n}_rescore',this.value)">
        </div>
      </div>
      ${priorityActionReminder(W, selectedName)}
      <div>
        <label for="w3-f${n}-progress">What specifically changed? What is still stuck?</label>
        <textarea id="w3-f${n}-progress" style="min-height:44px" placeholder="Honest update..."
          oninput="portalField('weekReflections.w3_factor${n}_progress',this.value)">${g(`w3_factor${n}_progress`)}</textarea>
      </div>
      <div style="margin-top:8px">
        <label for="w3-f${n}-next">Next concrete action — before Week 4 check-in</label>
        <input id="w3-f${n}-next" placeholder="Specific, time-bound action..."
          value="${g(`w3_factor${n}_next`)}"
          oninput="portalField('weekReflections.w3_factor${n}_next',this.value)">
      </div>
    </div>`;
    }).join('')}
    ${pillarActionBox('#1D9E75', 'Rescore all three factors. Even a half-point improvement is real progress. Focus your Week 4 deep-dive on whichever factor has moved the least.')}
  </div>

  <!-- MUSCLE W3 -->
  <div class="card" style="border-left:4px solid #E05C2A">
    <div class="card-title" style="color:#E05C2A">🟠 M2 — MUSCLE: Mid-Month Body Check + Progression</div>

    <div style="margin-bottom:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">MID-MONTH BODY COMPOSITION CHECK</div>
      <div class="g2">
        ${[['weight_w3', 'Body weight (lbs)'], ['waist_w3', 'Waist at navel (in)'],
           ['energy_w3', 'Morning energy (1–10)'], ['sleep_w3', 'Sleep quality (1–10)']].map(([k, l]) => `
          <div>
            <label for="w3-body-${k}">${l}</label>
            <input id="w3-body-${k}" placeholder="Week 3 measurement..." value="${g(k)}"
              oninput="portalField('weekReflections.${k}',this.value)">
          </div>`).join('')}
      </div>
    </div>

    <div style="margin-bottom:14px">
      ${workoutLog(W, 3)}
    </div>

    ${fastingDailyTracker(W, 3)}

    ${pillarActionBox('#E05C2A', '4 sessions this week. Hold the 14:10 window — first meal after 9am, last before 7pm. Month 1 stays at 14:10; we do not progress the fasting window this month.')}
  </div>

  <!-- MIND W3 DEEP FOCUS -->
  <div class="card" style="border-left:4px solid #2E7FD9">
    <div class="card-title" style="color:#2E7FD9">🔵 M3 — MIND: Week 3 Deep Focus — Full Supplement Stack</div>

    <div style="background:rgba(46,127,217,.06);border:1px solid rgba(46,127,217,.18);border-radius:9px;padding:12px 14px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;color:#2E7FD9;letter-spacing:.07em;margin-bottom:5px">⭐ THIS WEEK'S DEEP FOCUS</div>
      <div style="font-size:12.5px;color:#1A3050;line-height:1.6">
        Week 3 completes your Month 1 stack. You've been running <strong>Biome NS Ultra</strong> + <strong>SleepRestore</strong> for two weeks and added <strong>OmegaCN Prime</strong> + <strong>ArmorVita</strong> in Week 2.
        <strong>Week 3 — Add: NeuroBridge</strong> (methylated B-complex — P-5-P, methylcobalamin, methylfolate) and <strong>MitoVita</strong> (creatine + L-citrulline + beetroot + electrolytes).
        This completes your full 6-supplement Month 1 stack.
      </div>
    </div>

    <div class="card-title" style="font-size:10px;margin-bottom:8px">MONTH 1 COMPLETE SUPPLEMENT STACK (6 SUPPLEMENTS)</div>
    <div style="display:grid;grid-template-columns:1.8fr 0.9fr 0.9fr 0.7fr;gap:8px;padding:8px 0;margin-bottom:4px">
      ${['Supplement', 'Dose', 'Timing', 'Taking?'].map(h =>
        `<div style="font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#6A8A6E">${h}</div>`
      ).join('')}
    </div>
    ${renderSupplementsPanel(W)}

    <div style="margin-top:16px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">COGNITIVE PERFORMANCE — WEEKLY SCORES</div>
      <div style="font-size:12px;color:#3A6A44;margin-bottom:10px">
        Score focus, memory, and mood every Sunday evening (1–10). The trend across 4 weeks is your data.
      </div>
      ${[1, 2, 3, 4].map(w => `
        <div style="margin-bottom:13px">
          <div style="font-size:10px;font-weight:700;letter-spacing:.07em;color:#4A7A54;margin-bottom:7px">WEEK ${w}</div>
          <div class="g3">
            ${[['focus', 'Focus'], ['memory', 'Memory'], ['mood', 'Mood']].map(([k, l]) => `
              <div>
                <label for="cog-w${w}-${k}">${l}</label>
                <input id="cog-w${w}-${k}" type="number" min="1" max="10" placeholder="1–10"
                  value="${esc(W.cogRatings[`w${w}_${k}`] ?? '')}"
                  oninput="portalField('cogRatings.w${w}_${k}',this.value)">
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>

    <div style="margin-top:12px">
      <label for="w3-cog-changes">What cognitive changes have I noticed across the first 3 weeks?</label>
      <textarea id="w3-cog-changes" style="min-height:58px" placeholder="Sleep quality, energy on waking, afternoon focus, stress tolerance..."
        oninput="portalField('weekReflections.w3_cog_changes',this.value)">${g('w3_cog_changes')}</textarea>
    </div>

    ${pillarActionBox('#2E7FD9', `Add your final two Month 1 supplements: <strong>NeuroBridge</strong> (with breakfast) and <strong>MitoVita</strong> (pre-workout or mid-day). Your Month 1 stack is now complete — 6 supplements total. Keep your daily 10-page reading habit going.`)}
  </div>

  ${renderWeekCogTraining(W, 3)}

  ${morningTracker(W, 3)}

  <div class="card">
    <div class="card-title">Week 3 Reflection — All 4 Pillars</div>
    ${[['w3_motivate_ref', 'MOTIVATE: How has your sense of identity shifted in 3 weeks?'],
       ['w3_mitigate_ref', 'MITIGATE: Which factor showed the most improvement?'],
       ['w3_muscle_ref', 'MUSCLE: Am I stronger or more capable than Week 1?'],
       ['w3_mind_ref', 'MIND: What is my body telling me about the new supplements?']
    ].map(([k, l]) => `
      <div style="margin-bottom:12px">
        <label for="ref-${k}">${l}</label>
        <textarea id="ref-${k}" oninput="portalField('weekReflections.${k}',this.value)">${g(k)}</textarea>
      </div>`).join('')}
  </div>

  ${renderWeekNutritionSection(W, 3)}`;
}

function renderW4(W: Workbook): string {
  const wRef = W.weekReflections;
  const g = (k: string) => esc(wRef[k] ?? '');

  const pillarActionBox = (color: string, content: string) =>
    `<div style="background:${color}0F;border:1px solid ${color}33;border-radius:9px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:${color};letter-spacing:.07em;margin-bottom:5px">▶ ACTION THIS WEEK</div>
      <div style="font-size:12px;color:#1A2E1E;line-height:1.6">${content}</div>
    </div>`;

  const metrics: [string, string][] = [
    ['Mitigate assessment score (/200)', 'audit'],
    ['Body weight (lbs)', 'weight'],
    ['Waist at navel (in)', 'waist'],
    ['Morning energy (1–10)', 'energy'],
    ['Afternoon focus (1–10)', 'focus'],
    ['Sleep quality (1–10)', 'sleep'],
    ['Mood rating (1–10)', 'mood'],
    ['Squat baseline', 'squat'],
    ['Morning protocol (days/wk)', 'mornDays'],
    ['Cold shower (days/wk)', 'coldDays']
  ];

  const factorList: Factor[] = factors;

  return `${weekBanner(4)}

  ${proteinTargetLine(W)}

  ${vitalsTracker(W)}

  <div class="card" style="background:rgba(107,94,212,.05);border:1px solid rgba(107,94,212,.2)">
    <div style="font-size:14px;font-weight:700;color:#3C3489;margin-bottom:6px">Month 1 Completion — All 4 Pillars</div>
    <div style="font-size:12.5px;color:#3A3070;line-height:1.7">
      This is the final week of Month 1. Deep focus this week is <strong>Motivate</strong> —
      locking in your identity and committing to Month 2.
      Every other pillar gets a final check-in, re-assessment, and Month 2 plan.
    </div>
  </div>

  <!-- MOTIVATE W4 DEEP FOCUS -->
  <div class="card" style="border-left:4px solid #6B5ED4">
    <div class="card-title" style="color:#6B5ED4">🟣 M4 — MOTIVATE: Week 4 Deep Focus — Identity & Month 2 Vision</div>
    <div style="background:rgba(107,94,212,.06);border:1px solid rgba(107,94,212,.2);border-radius:9px;padding:12px 14px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;color:#6B5ED4;letter-spacing:.07em;margin-bottom:5px">⭐ THIS WEEK'S DEEP FOCUS</div>
      <div style="font-size:12.5px;color:#4A3A80;line-height:1.6">
        The man who finishes Month 1 is not the same man who started it.
        This week you name that man, commit to Month 2, and declare who you are becoming.
      </div>
    </div>

    <div style="margin-bottom:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">IDENTITY STATEMENT — Month 1 Final</div>
      <div style="font-size:11.5px;color:#4A7A54;margin-bottom:10px">Write in present tense. "I am a man who..." — not "I will try to..."</div>
      <textarea style="min-height:80px;border-color:#6B5ED455;font-size:14px"
        placeholder="I am a man who..."
        oninput="portalField('identityStatement',this.value)">${esc(W.identityStatement)}</textarea>
    </div>

    <div style="margin-bottom:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">MY 3 BIGGEST WINS FROM MONTH 1</div>
      ${[0, 1, 2].map(i => `
        <div style="margin-bottom:10px">
          <label for="w4-win-${i}">Win ${i + 1}</label>
          <input id="w4-win-${i}" value="${esc(W.month1Wins[i] ?? '')}" placeholder="Describe this win..."
            oninput="portalField('month1Wins.${i}',this.value)">
        </div>`).join('')}
    </div>

    <div style="margin-bottom:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">MONTH 2 COMMITMENT</div>
      ${[['training', 'Training plan — 3 days/week + Zone 2'],
         ['nutrition', 'Nutrition focus (holding 14:10 eating window through Month 1)'],
         ['supplements', 'Supplements to continue or add in Month 2'],
         ['cognitive', 'Cognitive practice — daily reading schedule (10+ pages/day)'],
         ['accountability', 'Accountability partner and weekly check-in plan']
      ].map(([k, l]) => `
        <div style="margin-bottom:11px">
          <label for="m2-${k}">${l}</label>
          <input id="m2-${k}" value="${esc(W.month2[k as keyof typeof W.month2] ?? '')}" placeholder="${l}..."
            oninput="portalField('month2.${k}',this.value)">
        </div>`).join('')}
    </div>

    <div style="border:2px solid #6B5ED455;border-radius:10px;padding:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px;color:#6B5ED4">GRADUATION COMMITMENT — Read Aloud on the Final Call</div>
      <textarea style="min-height:85px;border-color:#6B5ED444;font-size:13.5px"
        placeholder="Write your graduation commitment here..."
        oninput="portalField('graduation',this.value)">${esc(W.graduation)}</textarea>
      <div style="margin-top:13px;padding:12px 14px;background:rgba(107,94,212,.07);
        border-radius:8px;font-size:11.5px;color:#7060A8;font-style:italic;text-align:center;line-height:1.6">
        "In completing Month 1 of the 4M program I commit to continuing my brain optimization practice because the man I am becoming is worth protecting."
      </div>
    </div>
  </div>

  <!-- MITIGATE W4 RE-AUDIT -->
  <div class="card" style="border-left:4px solid #1D9E75">
    <div class="card-title" style="color:#1D9E75">🟢 M1 — MITIGATE: Full Re-Assessment — 10-Category Personal Risk Assessment</div>
    <div style="font-size:12.5px;color:#3A6A44;margin-bottom:12px;line-height:1.6">
      Score every category again using the 0–10 scale from your Week 1 intake.
      Compare your final assessment score to your baseline to see how far you moved in 30 days.
      Week 1 scores are <strong>auto-populated from your original assessment</strong> — no manual entry needed.
    </div>
    ${(() => {
      const w1Scores = loadAuditScores() ?? {};
      const w1Total = AUDIT_CATEGORIES.reduce((s, c) => s + (w1Scores[c.id] ?? 0), 0);
      const w4Total = AUDIT_CATEGORIES.reduce((s, c) => s + (Number(W.w4audit[c.id]) || 0), 0);
      return `
    <div style="background:#F5FAF6;border:1.5px solid #1D9E7533;border-radius:10px;padding:14px 16px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
        <div style="font-size:13px;font-weight:700;color:#1A3A20">Side-by-Side Assessment Comparison</div>
        <div style="display:flex;gap:12px;font-size:11px">
          <span style="color:#6A8A6E">Week 1 total: <strong style="color:#1D9E75">${w1Total} / 200</strong></span>
          ${w4Total > 0 ? `<span style="color:#6A8A6E">Week 4 total: <strong style="color:#6B5ED4">${w4Total} / 200</strong></span>` : ''}
        </div>
      </div>
      <div style="overflow-x:auto">
      <div style="display:grid;grid-template-columns:1fr auto auto auto;gap:0;font-size:10.5px;min-width:320px">
        <div style="padding:5px 8px;background:#E8F0E8;font-weight:700;color:#3A6A44;border-radius:6px 0 0 0">Category</div>
        <div style="padding:5px 8px;background:#E8F0E8;font-weight:700;color:#3A6A44;text-align:center">Week 1</div>
        <div style="padding:5px 8px;background:#E8F0E8;font-weight:700;color:#6B5ED4;text-align:center">Week 4</div>
        <div style="padding:5px 8px;background:#E8F0E8;font-weight:700;color:#E05C2A;text-align:center;border-radius:0 6px 0 0">Δ</div>
        ${AUDIT_CATEGORIES.map((cat, i) => {
          const bg = i % 2 === 0 ? '#FFFFFF' : '#F8FBF8';
          const w1Raw = w1Scores[cat.id];
          const w1: number | null = typeof w1Raw === 'number' ? w1Raw : null;
          const w4Raw: unknown = W.w4audit?.[cat.id];
          const w4Str = w4Raw == null ? '' : String(w4Raw);
          const w4: number | null = w4Str !== '' && !isNaN(Number(w4Str)) ? Number(w4Str) : null;
          const delta: number | null = w1 !== null && w4 !== null ? (w4 - w1) : null;
          const color = delta === null ? '#3A5A42' : (delta < 0 ? '#1D9E75' : delta > 0 ? '#E05C2A' : '#3A5A42');
          return `<div style="padding:6px 8px;background:${bg};color:#1A3A20">${esc(cat.label)}</div>
            <div style="padding:6px 8px;background:${bg};text-align:center;color:#5A8A64">${w1 !== null ? w1 : '—'}</div>
            <div style="padding:6px 8px;background:${bg};text-align:center"><input type="number" style="width:44px;text-align:center" min="0" max="10" value="${esc(String(w4 !== null ? w4 : ''))}" placeholder="—" oninput="portalField('w4audit.${cat.id}',this.value)"></div>
            <div style="padding:6px 8px;background:${bg};text-align:center;color:${color};font-weight:700">${delta === null ? '—' : (delta > 0 ? '+' : '') + delta}</div>`;
        }).join('')}
      </div>
      </div>
      <div style="margin-top:10px;font-size:11px;color:#6A8A6E">
        Score 0–10 per category. &nbsp; <strong>0 = fully addressed</strong> &nbsp;·&nbsp; <strong>10 = major risk still present</strong> &nbsp;·&nbsp; Lower Week 4 score = improvement.
      </div>
    </div>`;
    })()}

    <div>
      <label for="w4-most-improved">Which factor showed the most improvement over 30 days?</label>
      <input id="w4-most-improved" placeholder="Factor name and what changed..."
        value="${g('w4_most_improved')}" oninput="portalField('weekReflections.w4_most_improved',this.value)">
    </div>
    <div style="margin-top:10px">
      <label for="w4-needs-work">Which factor still needs the most work in Month 2?</label>
      <input id="w4-needs-work" placeholder="Factor name and why it is still sticky..."
        value="${g('w4_needs_work')}" oninput="portalField('weekReflections.w4_needs_work',this.value)">
    </div>

    ${pillarActionBox('#1D9E75', 'Complete the full re-assessment. Your score improvement is the concrete evidence that the work is real. Carry your lowest-scoring factors forward as Month 2 priorities.')}
  </div>

  <!-- MUSCLE W4 -->
  <div class="card" style="border-left:4px solid #E05C2A">
    <div class="card-title" style="color:#E05C2A">🟠 M2 — MUSCLE: Month 1 Progress Comparison</div>
    <div style="font-size:12.5px;color:#5A3020;margin-bottom:12px;line-height:1.6">
      Enter your Week 4 numbers. Week 1 baselines pull from your earlier entries.
    </div>
    <div style="overflow-x:auto">
      <table class="compare-table">
        <thead><tr style="background:rgba(224,92,42,.1)">
          ${['Metric', 'Week 1', 'Week 4', 'Change', 'Direction'].map(h =>
            `<th style="color:#7A3A20">${h}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${metrics.map(([label, key], i) => {
            const w1 = (W.bodyBaseline as unknown as Record<string, string>)[key] ?? '';
            const w4 = (W.w4 as unknown as Record<string, string>)[key] ?? '';
            const diff = w1 && w4 ? (Number(w4) - Number(w1)).toFixed(1) : '';
            const better = ['waist', 'weight'].includes(key) ? Number(diff) < 0 : Number(diff) > 0;
            return `<tr style="background:${i % 2 === 0 ? '#FFFFFF' : '#FFF8F5'}">
              <td style="color:#1A3A20">${label}</td>
              <td style="color:#5A8A64">${w1 || '—'}</td>
              <td><input value="${esc(w4)}" placeholder="Enter..."
                oninput="portalField('w4.${key}',this.value)"></td>
              <td style="color:${diff ? (better ? '#1D9E75' : '#E05C2A') : '#3A5A42'};font-weight:${diff ? '700' : '400'}">
                ${diff || '—'}
              </td>
              <td style="color:${diff ? (better ? '#1D9E75' : '#E05C2A') : '#3A5A42'}">
                ${diff ? (better ? '↑ Better' : '↓ Check') : '—'}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="margin-top:16px">
      ${workoutLog(W, 4)}
    </div>
    <div style="margin-top:16px">
      ${fastingDailyTracker(W, 4)}
    </div>
    ${pillarActionBox('#E05C2A', 'Record all your Week 4 measurements. Compare honestly. Strength and waist measurement are more meaningful than scale weight at this stage.')}
  </div>

  <!-- MIND W4 -->
  <div class="card" style="border-left:4px solid #2E7FD9">
    <div class="card-title" style="color:#2E7FD9">🔵 M3 — MIND: Month 1 Cognitive Wrap-Up</div>
    <div style="margin-bottom:14px">
      <div class="card-title" style="font-size:10px;margin-bottom:8px">FINAL COGNITIVE SCORES — WEEK 4</div>
      <div class="g3">
        ${[['focus', 'Focus'], ['memory', 'Memory'], ['mood', 'Mood']].map(([k, l]) => `
          <div>
            <label for="w4-cog-${k}">W4 ${l} (1–10)</label>
            <input id="w4-cog-${k}" type="number" min="1" max="10" placeholder="1–10"
              value="${esc(W.cogRatings[`w4_${k}`] ?? '')}"
              oninput="portalField('cogRatings.w4_${k}',this.value)">
            <div style="font-size:9px;color:#8AB89A;margin-top:3px">W1 baseline: ${esc(W.cogRatings[`w1_${k}`] ?? '—')}</div>
          </div>`).join('')}
      </div>
    </div>

    <div style="margin-bottom:12px">
      <label for="w4-best-supp">Which supplement or practice made the most noticeable cognitive difference?</label>
      <input id="w4-best-supp" placeholder="Be specific — what did you actually notice?"
        value="${g('w4_best_supp')}" oninput="portalField('weekReflections.w4_best_supp',this.value)">
    </div>

    <div style="margin-bottom:12px">
      <label for="w4-supp-plan">My supplement routine for Month 2 — what stays, what changes?</label>
      <textarea id="w4-supp-plan" style="min-height:52px" placeholder="Build on what worked..."
        oninput="portalField('weekReflections.w4_supp_plan',this.value)">${g('w4_supp_plan')}</textarea>
    </div>

    ${pillarActionBox('#2E7FD9', 'Score all 4 weeks in the cognitive tracker. The trend line is your Month 1 story. Decide which supplements are locked in for Month 2 and write it down.')}
  </div>

  ${renderWeekCogTraining(W, 4)}

  ${morningTracker(W, 4)}

  <div class="card" style="border:2px solid rgba(107,94,212,.2)">
    <div class="card-title">Month 1 Final Reflection — All 4 Pillars</div>
    ${[['w4_motivate_ref', 'MOTIVATE: In one sentence — who is the man who completed Month 1?'],
       ['w4_mitigate_ref', 'MITIGATE: How many points did your assessment score improve?'],
       ['w4_muscle_ref', 'MUSCLE: What is the most significant physical change you feel or see?'],
       ['w4_mind_ref', 'MIND: What cognitive change are you most proud of from Month 1?']
    ].map(([k, l]) => `
      <div style="margin-bottom:12px">
        <label for="ref-${k}">${l}</label>
        <textarea id="ref-${k}" oninput="portalField('weekReflections.${k}',this.value)">${g(k)}</textarea>
      </div>`).join('')}
  </div>

  ${renderWeekNutritionSection(W, 4)}`;
}

/** Affiliate supplier data for the pantry sourcing grid. */
const affiliateSuppliers = [
  { name: 'ButcherBox',              desc: 'Grass-fed beef & wild salmon delivered to your door.',      url: 'https://butcherbox.com' },
  { name: 'US Wellness Meats',       desc: 'Organ meats, game, and pasture-raised proteins.',           url: 'https://uswellnessmeats.com' },
  { name: 'Vital Choice',            desc: 'Wild-caught seafood — salmon, sardines, oysters.',          url: 'https://vitalchoice.com' },
  { name: 'Force of Nature',         desc: 'Ancestral blend — nose-to-tail regenerative meats.',        url: 'https://forceofnaturemeats.com' },
  { name: 'Ancestral Supplements',   desc: 'Grass-fed organ capsules — liver, heart, kidney.',          url: 'https://ancestralsupplements.com' },
  { name: 'Thrive Market',           desc: 'Pantry staples & keto/paleo essentials — members only pricing.', url: 'https://thrivemarket.com' },
];

/** Per-week cognitive training cue. */
const weekCogTrainData: Record<1 | 2 | 3 | 4, string> = {
  1: "Your cognitive training this month is reading. Read at least 10 pages of Begin with the End in Mind every day and check off each day below — you'll finish the book that anchors your whole protocol by the end of Month 1.",
  2: "Keep the daily 10-page reading habit. The framework compounds as the ideas connect across chapters.",
  3: "Stay with your daily reading — you should be past the halfway mark of the book this week.",
  4: "Finish the book this week. Jot down the ideas you want to carry into Month 2.",
};

// Weekday habit checkboxes (book reading, recipe use, etc.) persisted per program-week-day
// in W.habitLog via portalField. Native checkbox = instant toggle, no full re-render.
function habitWeekRow(W: Workbook, w: 1 | 2 | 3 | 4, key: string, heading: string, days: 'mf' | 'all', accent: string): string {
  const dayDefs: Array<[string, number]> = days === 'mf'
    ? [['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5]]
    : [['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6], ['S', 7]];
  const boxes = dayDefs.map(([dl, dn]) => {
    const k = `w${w}d${dn}_${key}`;
    const done = (W.habitLog?.[k] ?? '') === '1';
    return `<label style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1;min-width:0">
      <input type="checkbox" ${done ? 'checked' : ''} style="width:30px;height:30px;accent-color:${accent};cursor:pointer"
        onchange="window.portalField&&window.portalField('habitLog.${k}',this.checked?'1':'')">
      <span style="font-size:10px;font-weight:600;color:#5A8A64">${dl}</span>
    </label>`;
  }).join('');
  return `<div style="background:#FFFFFF;border:1.5px solid #D8E8DC;border-radius:9px;padding:12px 13px">
    <div style="font-size:12px;font-weight:700;color:#1A2E1E;margin-bottom:10px;line-height:1.45">${heading}</div>
    <div style="display:flex;gap:6px;justify-content:space-between">${boxes}</div>
  </div>`;
}

function renderWeekCogTraining(W: Workbook, w: 1 | 2 | 3 | 4): string {
  const cue = weekCogTrainData[w];
  return `
  <div class="card" style="border-top:3px solid #2E7FD9;margin-top:8px">
    <div style="font-size:14px;font-weight:700;color:#2E7FD9;margin-bottom:4px;letter-spacing:.01em">
      Cognitive Training — Week ${w}
    </div>
    <div style="font-size:11.5px;color:#3A5A7A;margin-bottom:16px;line-height:1.6;font-style:italic">${esc(cue)}</div>

    ${habitWeekRow(W, w, 'readbook', 'I read at least 10 pages of <em>Begin with the End in Mind</em> today', 'all', '#2E7FD9')}

    <div style="font-size:10px;color:#8A9A88;font-style:italic;margin-top:12px">
      Other cognitive tools (Lumosity, Duolingo, and more) become available in Month 2+.
    </div>
  </div>`;
}

/** Per-week fasting cue and supplement stack tagline. */
const weekNutrData: Record<1 | 2 | 3 | 4, { fastingCue: string; suppTagline: string; suppNames: string[] }> = {
  1: {
    fastingCue: 'Eat for gut repair — bone broth, fermented foods, organ meats, no inflammatory inputs (sugar, seed oils, alcohol). Three meals, no snacks.',
    suppTagline: 'This week, get familiar with your practitioner-grade stack. Start with the foundational formula — Biome NS Ultra — and add SleepRestore at bedtime.',
    suppNames: ['Biome NS Ultra', 'SleepRestore'],
  },
  2: {
    fastingCue: 'Hold your 14:10 window. Push your last meal 15 minutes earlier every 2 days — you are building the habit before we tighten the window next month.',
    suppTagline: 'Continue your stack. This week add ArmorVita with your largest meal — fat-soluble vitamins need dietary fat to absorb.',
    suppNames: ['Biome NS Ultra', 'SleepRestore', 'ArmorVita'],
  },
  3: {
    fastingCue: 'Tighten your eating window slightly. Aim for your first meal closer to 10–10:30am this week. You are preparing your metabolism for the Month 2 progression to 16:8.',
    suppTagline: 'Continue your stack. Week 3 completes your Month 1 protocol — add NeuroBridge with breakfast to activate your methylation cycle.',
    suppNames: ['Biome NS Ultra', 'SleepRestore', 'ArmorVita', 'NeuroBridge'],
  },
  4: {
    fastingCue: 'Run your full stack. Fast clean — water and black coffee only inside the fast window. Eat with intent — quality over quantity.',
    suppTagline: 'Your Month 1 stack is complete. Continue all four formulas. Review what you noticed and build your Month 2 commitment.',
    suppNames: ['Biome NS Ultra', 'SleepRestore', 'ArmorVita', 'NeuroBridge'],
  },
};

function renderWeekNutritionSection(W: Workbook, w: 1 | 2 | 3 | 4): string {
  const wc = weekMeta[w];
  const { fastingCue } = weekNutrData[w];

  return `
  <div class="card" style="border-top:3px solid ${wc.ac};margin-top:8px">
    <div style="font-size:14px;font-weight:700;color:${wc.ac};margin-bottom:4px;letter-spacing:.01em">
      Nutrition &amp; Fueling — Week ${w}
    </div>
    <div style="font-size:11.5px;color:#4A7A54;margin-bottom:16px;line-height:1.6;font-style:italic">${esc(fastingCue)}</div>

    <!-- MEAL PLAN PREVIEW -->
    <div style="position:relative;background:#F5FAF6;border:1.5px dashed #B8E8D0;border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <span style="position:absolute;top:-10px;right:14px;background:#D4920A;color:#fff;
        font-size:9px;font-weight:700;letter-spacing:.07em;padding:3px 9px;border-radius:4px">SAMPLE</span>
      <div style="font-size:11px;font-weight:700;color:#1D9E75;letter-spacing:.07em;margin-bottom:6px;text-transform:uppercase">
        Week ${w} Recommended Meal Plan
      </div>
      <ul style="margin:0;padding-left:16px;display:flex;flex-direction:column;gap:4px">
        <li style="font-size:11.5px;color:#3A6A44">Breakfast: 3–4 pasture-raised eggs + grass-fed beef or salmon + cooking fat</li>
        <li style="font-size:11.5px;color:#3A6A44">Lunch: Large grass-fed protein portion + leafy greens + avocado</li>
        <li style="font-size:11.5px;color:#3A6A44">Dinner: Ruminant protein or wild fish + cruciferous vegetable + bone broth</li>
      </ul>
    </div>

    <!-- RECOMMENDED RECIPE CHECK -->
    <div style="font-size:11px;color:#5A8A64;line-height:1.55;margin-bottom:10px">
      Your recommended recipes, shopping list, and a prep video arrive by email a few days before each Sunday Zoom.
    </div>
    ${habitWeekRow(W, w, 'recipe', 'Did you use at least one recommended recipe (with the recommended ingredients) today?', 'mf', wc.ac)}

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
    <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:6px">Regenerative Medicine & RPA</div>
    <div style="font-size:12.5px;color:#B5D4F4;line-height:1.7">Everything you have done this month has been activating your body's innate regenerative pathways.</div>
  </div>

  <div class="card">
    <div class="card-title">My Regenerative Medicine Reflection</div>
    <label for="regen-priority">Which conditions are most relevant to me personally?</label>
    <textarea id="regen-priority" style="margin-bottom:12px"
      oninput="portalField('regenPriority',this.value)">${esc(W.regenPriority)}</textarea>
    <label for="regen-next">My commitment to investigate this further</label>
    <textarea id="regen-next" oninput="portalField('regenNext',this.value)">${esc(W.regenNext)}</textarea>
  </div>

  <div class="card">
    <div class="card-title">Month 1 Supplement Stack</div>
    ${renderSupplementsPanel(W)}
  </div>`;
}

function renderAuditReview(): string {
  const scores = loadAuditScores();
  const backBtn = `<button class="btn" onclick="portalAction('goTo','dash')" style="margin-bottom:18px">← Back to Dashboard</button>`;
  if (!scores) {
    return `<div class="page-title">Personal Risk Assessment</div>${backBtn}
    <div class="card"><div style="color:#6A8A6E;font-size:13px">No assessment data found. Complete the intake questionnaire to generate your assessment scores.</div></div>`;
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const band = auditBand200(total);

  const rows = AUDIT_CATEGORIES.map(cat => {
    const s = scores[cat.id] ?? 0;
    const c = s <= 3 ? '#1D9E75' : s <= 6 ? '#D4920A' : '#E05C2A';
    const barW = Math.round((s / 10) * 100);
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:12px;color:#1A2E1E">${esc(cat.label)}</span>
        <span style="font-size:12px;font-weight:700;color:${c}">${s} / 10</span>
      </div>
      <div class="pbar-wrap">
        <div class="pbar-fill" style="width:${barW}%;background:${c}"></div>
      </div>
    </div>`;
  }).join('');

  return `<div class="page-title" style="color:${band.color}">Personal Risk Assessment</div>
  <div class="page-sub">Your 10-category intake assessment</div>
  ${backBtn}
  <div class="card" style="background:${band.bg};border-color:${band.color}55;margin-bottom:20px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:15px;font-weight:700;color:${band.color}">${band.label} Risk</div>
        <div style="font-size:12px;color:#6A8A6E">Total score</div>
      </div>
      <div style="font-size:52px;font-weight:800;color:${band.color};line-height:1">${total}</div>
    </div>
    <div style="font-size:11px;color:#6A8A6E;margin-top:6px">Lower is better. Each category scores 0–10.</div>
  </div>
  <div class="card">
    <div class="card-title">All ${AUDIT_CATEGORIES.length} Categories</div>
    ${rows}
  </div>`;
}

export function renderPage(ctx: RenderContext): string {
  switch (ctx.curTab) {
    case 'w1': return renderW1(ctx);
    case 'w2': return renderW2(ctx.W);
    case 'w3': return renderW3(ctx.W);
    case 'w4': return renderW4(ctx.W);
    case 'regen': return renderRegen(ctx.W);
    case 'audit-review': return renderAuditReview();
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
  const m = mornings(W), c = colds(W);
  const auditScores = loadAuditScores();
  const auditTotal200 = auditScores ? Object.values(auditScores).reduce((a, b) => a + b, 0) : null;
  return {
    audit: auditTotal200 !== null ? `Assessment: ${auditTotal200} / 200` : 'Assessment: not yet completed',
    score: auditTotal200 !== null ? `Score: ${auditTotal200} / 200` : 'Score: —',
    morn: `Mornings: ${m} days`,
    cold: `Cold showers: ${c} days`
  };
}
