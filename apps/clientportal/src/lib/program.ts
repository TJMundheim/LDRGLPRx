/**
 * 12-week program — the Move ladder + program-paced MindSpan scoring (v2).
 *
 * Structure (TJ 2026-07-06, from app-week-mockups Direction 2 + 3):
 *   - Every week has the identical standing tape (gut protocol + protein-first
 *     daily; eating window 5 of 7; walks ×2 + strength ×3–4 weekly; cohort Zoom).
 *   - Each week adds exactly ONE Move — the same Move for the whole cohort —
 *     tracked into the MindSpan Score.
 *   - Months carry the locked 4M arc: M1 MITIGATE, M2 MUSCLE, M3 MOTIVATE→MIND.
 *
 * Scoring (v2, program-paced — the gold ring fills toward 100 across ~12 weeks):
 *   score = round(
 *       0.40 * cumulativePct          // % of ALL program slots completed to date
 *     + 0.20 * (movesDone / 12) * 100 // Moves completed
 *     + 0.15 * rollingPct             // trailing-7-day adherence (daily liveness)
 *     + 0.25 * (100 - riskLoad)       // audit risk, inverted; retest in week 12
 *   )
 *   A perfect week 1 lands ~30-35; only finishing the program approaches 100.
 *
 * Pure module: no Date.now(), no app imports beyond types-by-shape.
 */

export interface ProgramMove {
  week: number;
  month: 1 | 2 | 3;
  theme: 'MITIGATE' | 'MUSCLE' | 'MOTIVATE → MIND';
  title: string;
  /** adherence actionId that measures this Move */
  actionId: string;
  /** distinct days required within the week to complete the Move */
  target: number;
  /** true when the Move rides a standing tape row (no extra tap row needed) */
  standing: boolean;
}

export const PROGRAM_WEEKS = 12;

export const MOVES: ProgramMove[] = [
  { week: 1,  month: 1, theme: 'MITIGATE', title: 'Start Biome NS Ultra — with your first meal, every day', actionId: 'biome-ns-ultra', target: 7, standing: true },
  { week: 2,  month: 1, theme: 'MITIGATE', title: 'Hold the 9–6 eating window 5 of 7 days', actionId: 'eating-window', target: 5, standing: true },
  { week: 3,  month: 1, theme: 'MITIGATE', title: 'Protein-first 30–40g at every fast-break', actionId: 'protein-breakfast', target: 7, standing: true },
  { week: 4,  month: 1, theme: 'MITIGATE', title: 'Pantry purge — zero seed oils in the house', actionId: 'move-pantry-purge', target: 1, standing: false },
  { week: 5,  month: 2, theme: 'MUSCLE', title: 'Strength ×3 — log the lifts', actionId: 'strength', target: 3, standing: true },
  { week: 6,  month: 2, theme: 'MUSCLE', title: 'Fasted dawn walk ×5', actionId: 'fasted-walk', target: 5, standing: true },
  { week: 7,  month: 2, theme: 'MUSCLE', title: 'Add one intensity day — hills or sprints', actionId: 'move-intensity', target: 1, standing: false },
  { week: 8,  month: 2, theme: 'MUSCLE', title: 'Sleep week — 3-hour cutoff + cold dark room', actionId: 'move-sleep-protocol', target: 5, standing: false },
  { week: 9,  month: 3, theme: 'MOTIVATE → MIND', title: 'Name your face — write who you are doing this for', actionId: 'move-name-your-face', target: 1, standing: false },
  { week: 10, month: 3, theme: 'MOTIVATE → MIND', title: 'Heat or cold exposure ×2', actionId: 'move-heat-cold', target: 2, standing: false },
  { week: 11, month: 3, theme: 'MOTIVATE → MIND', title: 'Book your labs — measure, don’t guess', actionId: 'move-book-labs', target: 1, standing: false },
  { week: 12, month: 3, theme: 'MOTIVATE → MIND', title: 'Retake the assessment — new MindSpan baseline', actionId: 'move-retake-assessment', target: 1, standing: false },
];

export function moveForWeek(week: number): ProgramMove {
  const w = Math.min(PROGRAM_WEEKS, Math.max(1, Math.round(week)));
  return MOVES[w - 1];
}

// ── date helpers (local time, mirror mindspan.ts) ───────────────────────────
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
export function startOfWeekMon(d: Date): Date {
  const out = new Date(d);
  const dow = out.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Monday of program week 1, given "now" and the member's current week.
 * LEGACY derivation — drifts if the member attests early. Prefer anchoring
 * to the signup date via programAnchor()/calendarWeek(). */
export function programStart(now: Date, currentWeek: number): Date {
  return addDays(startOfWeekMon(now), -7 * (Math.max(1, currentWeek) - 1));
}

/** Fixed program anchor: Monday of the week the member signed up. */
export function programAnchor(createdAt: string | Date | null | undefined, now: Date): Date {
  const d = createdAt ? new Date(createdAt) : now;
  return startOfWeekMon(Number.isNaN(d.getTime()) ? now : d);
}

/** Calendar program week (1-12) elapsed since the anchor Monday. */
export function calendarWeek(anchor: Date, now: Date): number {
  const weeks = Math.floor((startOfWeekMon(now).getTime() - anchor.getTime()) / (7 * 86400000)) + 1;
  return Math.min(PROGRAM_WEEKS, Math.max(1, weeks));
}

export interface EntryLike {
  dateActionId: string;
}

function parse(e: EntryLike): { date: string; actionId: string } | null {
  const i = e.dateActionId.indexOf('#');
  if (i === -1) return null;
  return { date: e.dateActionId.slice(0, i), actionId: e.dateActionId.slice(i + 1) };
}

/** Distinct days with `actionId` inside [weekStart, weekStart+6]. */
export function daysHitInWeek(entries: EntryLike[], actionId: string, weekStart: Date): number {
  const days = new Set<string>();
  for (let i = 0; i < 7; i++) days.add(toDateStr(addDays(weekStart, i)));
  const hits = new Set<string>();
  for (const e of entries) {
    const p = parse(e);
    if (p && p.actionId === actionId && days.has(p.date)) hits.add(p.date);
  }
  return hits.size;
}

export interface MoveProgress {
  done: number;
  target: number;
  complete: boolean;
}

export function moveProgress(entries: EntryLike[], move: ProgramMove, weekStart: Date): MoveProgress {
  const done = Math.min(daysHitInWeek(entries, move.actionId, weekStart), move.target);
  return { done, target: move.target, complete: done >= move.target };
}

/** Number of Moves (weeks 1..upToWeek) whose target was hit in their own week. */
export function movesCompleted(entries: EntryLike[], now: Date, currentWeek: number, startDate?: Date): number {
  const start = startDate ?? programStart(now, currentWeek);
  let done = 0;
  for (let w = 1; w <= Math.min(currentWeek, PROGRAM_WEEKS); w++) {
    const ws = addDays(start, (w - 1) * 7);
    if (moveProgress(entries, MOVES[w - 1], ws).complete) done++;
  }
  return done;
}

// Program slot model (TJ 2026-07-06): 2 dailies × 84 days + (window 5 +
// walks 2 + strength 4) × 12 weeks + 12 Moves. The eating window allows two
// off-days (breakfast with the grandkids — walk 30 min after); strength 3–4×.
const DAILY_IDS = ['biome-ns-ultra', 'protein-breakfast'];
const WEEKLY_TARGETS: Array<[string, number]> = [['eating-window', 5], ['fasted-walk', 2], ['strength', 4]];
export const TOTAL_PROGRAM_SLOTS = 2 * 7 * PROGRAM_WEEKS + 11 * PROGRAM_WEEKS + PROGRAM_WEEKS; // 312

/**
 * Percent (0-100) of the WHOLE program completed so far. The denominator is
 * always the full 12 weeks — this is the "ring slowly fills over three months"
 * semantic, not a rolling-quality number.
 */
export function programCumulativePct(entries: EntryLike[], now: Date, currentWeek: number, startDate?: Date): number {
  const start = startDate ?? programStart(now, currentWeek);
  const today = toDateStr(now);
  let hits = 0;

  // dailies: distinct day#action from program start through today
  const dailySeen = new Set<string>();
  for (const e of entries) {
    const p = parse(e);
    if (!p || !DAILY_IDS.includes(p.actionId)) continue;
    if (p.date < toDateStr(start) || p.date > today) continue;
    dailySeen.add(`${p.date}#${p.actionId}`);
  }
  hits += dailySeen.size;

  // weeklies: capped per week
  for (let w = 1; w <= Math.min(currentWeek, PROGRAM_WEEKS); w++) {
    const ws = addDays(start, (w - 1) * 7);
    for (const [id, cap] of WEEKLY_TARGETS) {
      hits += Math.min(daysHitInWeek(entries, id, ws), cap);
    }
  }

  hits += movesCompleted(entries, now, currentWeek);
  return Math.round((100 * hits) / TOTAL_PROGRAM_SLOTS);
}

export interface ProgramScoreInputs {
  cumulativePct: number; // 0-100
  rollingPct: number;    // 0-100 trailing 7-day adherence
  riskLoad: number;      // 0-100, higher worse
  movesDone: number;     // 0-12
}

/** MindSpan Score v2 — program-paced. See module header for weights. */
export function programMindspanScore({ cumulativePct, rollingPct, riskLoad, movesDone }: ProgramScoreInputs): number {
  const raw =
    0.40 * cumulativePct +
    0.20 * (Math.min(movesDone, PROGRAM_WEEKS) / PROGRAM_WEEKS) * 100 +
    0.15 * rollingPct +
    0.25 * (100 - riskLoad);
  return Math.min(100, Math.max(0, Math.round(raw)));
}

/** Per-week adherence % (of that week's 3×7 + 4 + 1 = 26 slots) for the 12-week bars. */
export function weeklyPctSeries(entries: EntryLike[], now: Date, currentWeek: number, startDate?: Date): number[] {
  const start = startDate ?? programStart(now, currentWeek);
  const out: number[] = [];
  for (let w = 1; w <= PROGRAM_WEEKS; w++) {
    if (w > currentWeek) { out.push(0); continue; }
    const ws = addDays(start, (w - 1) * 7);
    let hits = 0;
    for (const id of DAILY_IDS) hits += daysHitInWeek(entries, id, ws);
    for (const [id, cap] of WEEKLY_TARGETS) hits += Math.min(daysHitInWeek(entries, id, ws), cap);
    if (moveProgress(entries, MOVES[w - 1], ws).complete) hits += 1;
    out.push(Math.round((100 * hits) / (2 * 7 + 11 + 1)));
  }
  return out;
}
