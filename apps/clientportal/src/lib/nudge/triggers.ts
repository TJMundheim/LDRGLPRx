/**
 * Phase 1 AI Concierge — static client-side Nudge triggers.
 * No Bedrock / backend; all state from localStorage.
 */

import type { NudgeItem } from './types';

// ── Storage keys ────────────────────────────────────────────────────────────
const INTAKE_COMPLETE_KEY       = 'intake-complete-v1';
const LAST_SEEN_KEY             = 'last-seen-v1';
const INTAKE_CELEBRATED_KEY     = 'intake-celebrated-v1';
const SHOWN_TODAY_KEY           = 'nudges-shown-today-v1';
const DISMISSED_KEY             = 'nudges-dismissed-v1';
const WEEK_NUDGE_PREFIX         = 'nudges-week-';
const WEEK_NUDGE_SUFFIX         = '-shown-v1';
const SCREENS_VISITED_KEY       = 'screens-visited-v1';
const LAST_UPGRADE_NUDGE_KEY    = 'last-upgrade-nudge-v1';
const INTAKE_DATE_KEY           = 'intake-date-v1';

// ── Helpers ──────────────────────────────────────────────────────────────────

function ls(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDismissed(): Set<string> {
  try {
    const raw = ls(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

/** Returns an object keyed by nudge-id for today, clears if date has changed. */
function getShownToday(): Record<string, boolean> {
  try {
    const raw = ls(SHOWN_TODAY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { date: string; ids: Record<string, boolean> };
    if (parsed.date !== today()) {
      localStorage.removeItem(SHOWN_TODAY_KEY);
      return {};
    }
    return parsed.ids ?? {};
  } catch { return {}; }
}

function markShownToday(id: string): void {
  const shown = getShownToday();
  shown[id] = true;
  lsSet(SHOWN_TODAY_KEY, JSON.stringify({ date: today(), ids: shown }));
}

function isDismissed(id: string): boolean {
  return getDismissed().has(id);
}

function wasShownToday(id: string): boolean {
  return !!getShownToday()[id];
}

/**
 * Estimate current week number based on intake date.
 * Returns 1-4 (clamped).
 */
function getCurrentWeek(): number {
  const intakeDateRaw = ls(INTAKE_DATE_KEY);
  if (!intakeDateRaw) return 1;
  const intakeDate = new Date(intakeDateRaw);
  const daysSince = Math.floor((Date.now() - intakeDate.getTime()) / 86_400_000);
  return Math.min(4, Math.max(1, Math.ceil((daysSince + 1) / 7)));
}

/** Days since a given ISO timestamp string; Infinity if null. */
function daysSince(isoTs: string | null): number {
  if (!isoTs) return Infinity;
  return (Date.now() - new Date(isoTs).getTime()) / 86_400_000;
}

// ── Push a nudge via the global API mounted by NudgeStack ────────────────────
type AddNudge = (nudge: NudgeItem) => void;

function push(nudge: NudgeItem): void {
  const api = (window as Window & { addNudge?: AddNudge }).addNudge;
  if (typeof api === 'function') {
    api(nudge);
    markShownToday(nudge.id);
  }
}

// ── Trigger A — Welcome-back (returning user) ────────────────────────────────
function triggerWelcomeBack(): void {
  const intakeComplete = !!ls(INTAKE_COMPLETE_KEY);
  if (!intakeComplete) return;

  const id = `welcome-back-${today()}`;
  if (isDismissed(id) || wasShownToday(id)) return;

  const lastSeen = ls(LAST_SEEN_KEY);
  if (daysSince(lastSeen) < 2) return; // seen within 2 days — skip

  const week = getCurrentWeek();

  push({
    id,
    title: 'Welcome back.',
    body: `You're into Week ${week} — pick up where you left off. The protocol works when it's run, not when it's read.`,
    action: { label: `Open Week ${week} →`, href: `#week${week}` },
    tone: 'reminder',
    autoDismissMs: 10_000,
  });
}

// ── Trigger B — Intake-complete celebration ───────────────────────────────────
function triggerIntakeCelebration(): void {
  const intakeComplete = !!ls(INTAKE_COMPLETE_KEY);
  if (!intakeComplete) return;

  const id = 'intake-celebrated';
  if (isDismissed(id) || wasShownToday(id)) return;
  if (ls(INTAKE_CELEBRATED_KEY)) return; // already shown once ever

  // Mark celebrated before pushing to prevent re-fire on rapid re-mounts
  lsSet(INTAKE_CELEBRATED_KEY, new Date().toISOString());

  push({
    id,
    title: "You're in. Here are your top 3 priorities.",
    body: 'Your audit auto-populated. The dashboard now shows where to focus. Mind is the destination — every other M is in service of it.',
    action: { label: 'Review my top 3 →', href: '#top3' },
    tone: 'celebrate',
    autoDismissMs: 12_000,
  });
}

// ── Trigger C — End-of-Week milestone ────────────────────────────────────────

const WEEK_COPY: Record<number, { title: string; actionLabel: string; actionHref: string }> = {
  1: {
    title: 'Week 1 in the books. Gut repair is foundational — everything else compounds on it.',
    actionLabel: 'Start Week 2 →',
    actionHref: '#week2',
  },
  2: {
    title: 'Week 2 done. Muscle is brain-protection. Stack on the foundation.',
    actionLabel: 'Start Week 3 →',
    actionHref: '#week3',
  },
  3: {
    title: 'Week 3 down. The mind work this week is what most people skip — and it\'s where 4M earns its name.',
    actionLabel: 'Start Week 4 →',
    actionHref: '#week4',
  },
  4: {
    title: 'Month 1 complete. Take the audit re-take to see your before/after. Then — Insider opens here.',
    actionLabel: 'See Insider tiers →',
    actionHref: '/membership',
  },
};

/**
 * Fire the end-of-week nudge for `weekN` (1-4) if not already shown.
 * Caller is responsible for checking that the user has actually entered that week's tab.
 */
export function triggerWeekMilestone(weekN: 1 | 2 | 3 | 4): void {
  const storageKey = `${WEEK_NUDGE_PREFIX}${weekN}${WEEK_NUDGE_SUFFIX}`;
  if (ls(storageKey)) return; // already shown for this week

  const copy = WEEK_COPY[weekN];
  if (!copy) return;

  const id = `week-${weekN}-milestone`;
  if (isDismissed(id)) return;

  lsSet(storageKey, today());

  push({
    id,
    title: copy.title,
    action: { label: copy.actionLabel, href: copy.actionHref },
    body: '', // title carries the full message for milestone nudges
    tone: 'celebrate',
    autoDismissMs: 12_000,
  });
}

// ── Trigger E — Substance-use LDN awareness ──────────────────────────────────

const SUBSTANCE_USE_SHOWN_KEY = 'nudges-substance-use-shown-v1';
const AUDIT_KEY = 'audit-v1';
const SUBSTANCE_USE_CATEGORY = 'substance-use';
const SUBSTANCE_USE_THRESHOLD = 6;
const TOP3_COUNT = 3;

function readAuditScores(): Record<string, number> | null {
  try {
    const raw = ls(AUDIT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.scores ?? null;
  } catch { return null; }
}

/** Returns top-N category keys by score (descending). */
function selectTopN(scores: Record<string, number>, n: number): string[] {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key);
}

function triggerSubstanceUseLdn(): void {
  if (!ls(INTAKE_COMPLETE_KEY)) return;
  if (ls(SUBSTANCE_USE_SHOWN_KEY)) return; // one-time only

  const scores = readAuditScores();
  if (!scores) return;

  const substanceScore = scores[SUBSTANCE_USE_CATEGORY] ?? 0;
  const inTop3 = selectTopN(scores, TOP3_COUNT).includes(SUBSTANCE_USE_CATEGORY);

  if (substanceScore < SUBSTANCE_USE_THRESHOLD && !inTop3) return;

  const id = 'substance-use-ldn';
  if (isDismissed(id)) return;

  // Mark shown before pushing to prevent re-fire
  lsSet(SUBSTANCE_USE_SHOWN_KEY, JSON.stringify({ shownAt: new Date().toISOString() }));

  push({
    id,
    title: 'Your audit flagged alcohol or substance use as a priority.',
    body: "There's a prescription tool worth knowing about — Low-Dose Naltrexone (LDN) — available through our contracted licensed telemedicine practice and partner compounding pharmacy. Pairs with whatever free program you're running. Not for everyone, but worth a 60-second read.",
    action: { label: 'Learn about LDN →', href: 'https://my4mlife.com/solutions/substance-use#about-ldn' },
    tone: 'info',
  });
}

// ── Trigger D — Free-tier upgrade nudge ──────────────────────────────────────
function triggerUpgradeNudge(): void {
  const intakeComplete = !!ls(INTAKE_COMPLETE_KEY);
  if (!intakeComplete) return;

  const intakeDateRaw = ls(INTAKE_DATE_KEY);
  if (!intakeDateRaw || daysSince(intakeDateRaw) < 14) return;

  const lastUpgrade = ls(LAST_UPGRADE_NUDGE_KEY);
  if (daysSince(lastUpgrade) < 7) return;

  // Check visited screens count
  try {
    const raw = ls(SCREENS_VISITED_KEY);
    const visited: string[] = raw ? JSON.parse(raw) : [];
    if (visited.length < 5) return;
  } catch { return; }

  const id = 'upgrade-nudge';
  if (isDismissed(id)) return;

  lsSet(LAST_UPGRADE_NUDGE_KEY, new Date().toISOString());

  push({
    id,
    title: "Ready for what's next?",
    body: "You've put in real work. Insider unlocks live coaching with Dr. TJ, member-only Rx + supplement pricing, and the deeper monthly protocols.",
    action: { label: 'See Insider tiers →', href: '/membership' },
    tone: 'info',
    autoDismissMs: 10_000,
  });
}

// ── Screen tracking ───────────────────────────────────────────────────────────

/**
 * Track unique screen visits for upgrade-nudge eligibility.
 * Call this whenever the user navigates to a new tab.
 */
export function trackScreenVisit(screenId: string): void {
  try {
    const raw = ls(SCREENS_VISITED_KEY);
    const visited: string[] = raw ? JSON.parse(raw) : [];
    if (!visited.includes(screenId)) {
      visited.push(screenId);
      lsSet(SCREENS_VISITED_KEY, JSON.stringify(visited));
    }
  } catch { /* ignore */ }
}

// ── Last-seen timestamp ───────────────────────────────────────────────────────

export function updateLastSeen(): void {
  lsSet(LAST_SEEN_KEY, new Date().toISOString());
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Evaluate all Phase 1 trigger conditions and push qualifying Nudges.
 * Call this from App.svelte onMount after NudgeStack is mounted.
 */
export function runNudgeTriggers(): void {
  triggerIntakeCelebration();
  triggerWelcomeBack();
  triggerUpgradeNudge();
  triggerSubstanceUseLdn();
  // Week milestone triggers are fired from tab navigation, not here.
}
