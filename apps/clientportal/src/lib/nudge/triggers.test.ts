/**
 * Unit tests for Phase 1 Nudge trigger logic.
 * Uses vitest + jsdom (localStorage is simulated).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ── Minimal localStorage mock ────────────────────────────────────────────────
// jsdom provides localStorage, but we reset between tests for isolation.
function clearLS(): void {
  localStorage.clear();
}

// ── Stub window.addNudge to capture pushes ────────────────────────────────────
type NudgeCapture = { id: string; title: string; tone?: string };
let captured: NudgeCapture[] = [];

beforeEach(() => {
  clearLS();
  captured = [];
  (window as Window & { addNudge?: (n: NudgeCapture) => void }).addNudge = (n) => {
    captured.push(n);
  };
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Dynamic import so each test gets fresh module state ──────────────────────
// We re-import after localStorage is set so the module reads fresh state.
async function importTriggers() {
  // Vite/vitest resets module cache between files but not between tests by default.
  // We work around by just calling the functions after setting up localStorage.
  return await import('./triggers');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Tests: Welcome-back ───────────────────────────────────────────────────────

describe('welcome-back trigger', () => {
  it('fires when intake-complete and lastSeen is 3 days old', async () => {
    localStorage.setItem('intake-complete-v1', '1');
    localStorage.setItem('last-seen-v1', daysAgo(3));
    const { runNudgeTriggers } = await importTriggers();
    runNudgeTriggers();
    expect(captured.some(n => n.id.startsWith('welcome-back-'))).toBe(true);
  });

  it('does NOT fire when lastSeen is only 1 day ago', async () => {
    localStorage.setItem('intake-complete-v1', '1');
    localStorage.setItem('last-seen-v1', daysAgo(1));
    const { runNudgeTriggers } = await importTriggers();
    runNudgeTriggers();
    expect(captured.some(n => n.id.startsWith('welcome-back-'))).toBe(false);
  });

  it('does NOT fire if already shown today', async () => {
    localStorage.setItem('intake-complete-v1', '1');
    localStorage.setItem('last-seen-v1', daysAgo(3));
    // Pre-mark as shown today
    const id = `welcome-back-${today()}`;
    localStorage.setItem('nudges-shown-today-v1', JSON.stringify({ date: today(), ids: { [id]: true } }));
    const { runNudgeTriggers } = await importTriggers();
    runNudgeTriggers();
    expect(captured.some(n => n.id.startsWith('welcome-back-'))).toBe(false);
  });

  it('does NOT fire when intake-complete is not set', async () => {
    localStorage.setItem('last-seen-v1', daysAgo(5));
    const { runNudgeTriggers } = await importTriggers();
    runNudgeTriggers();
    expect(captured.some(n => n.id.startsWith('welcome-back-'))).toBe(false);
  });
});

// ── Tests: Intake celebration ─────────────────────────────────────────────────

describe('intake celebration trigger', () => {
  it('fires once when intake-complete is set and intake-celebrated is NOT set', async () => {
    localStorage.setItem('intake-complete-v1', '1');
    const { runNudgeTriggers } = await importTriggers();
    runNudgeTriggers();
    expect(captured.some(n => n.id === 'intake-celebrated')).toBe(true);
  });

  it('does NOT fire a second time once intake-celebrated-v1 is set', async () => {
    localStorage.setItem('intake-complete-v1', '1');
    localStorage.setItem('intake-celebrated-v1', daysAgo(0));
    const { runNudgeTriggers } = await importTriggers();
    runNudgeTriggers();
    expect(captured.some(n => n.id === 'intake-celebrated')).toBe(false);
  });

  it('does NOT fire when intake-complete is not set', async () => {
    const { runNudgeTriggers } = await importTriggers();
    runNudgeTriggers();
    expect(captured.some(n => n.id === 'intake-celebrated')).toBe(false);
  });
});

// ── Tests: Week milestone ─────────────────────────────────────────────────────

describe('week milestone trigger', () => {
  it('fires for week 1 if not previously shown', async () => {
    const { triggerWeekMilestone } = await importTriggers();
    triggerWeekMilestone(1);
    expect(captured.some(n => n.id === 'week-1-milestone')).toBe(true);
  });

  it('does NOT fire for week 1 if already shown', async () => {
    localStorage.setItem('nudges-week-1-shown-v1', today());
    const { triggerWeekMilestone } = await importTriggers();
    triggerWeekMilestone(1);
    expect(captured.some(n => n.id === 'week-1-milestone')).toBe(false);
  });

  it('fires independently per week', async () => {
    const { triggerWeekMilestone } = await importTriggers();
    triggerWeekMilestone(2);
    triggerWeekMilestone(3);
    expect(captured.some(n => n.id === 'week-2-milestone')).toBe(true);
    expect(captured.some(n => n.id === 'week-3-milestone')).toBe(true);
  });

  it('uses celebrate tone', async () => {
    const { triggerWeekMilestone } = await importTriggers();
    triggerWeekMilestone(4);
    const nudge = captured.find(n => n.id === 'week-4-milestone');
    expect(nudge?.tone).toBe('celebrate');
  });
});

// ── Tests: Upgrade nudge ─────────────────────────────────────────────────────

describe('upgrade nudge trigger', () => {
  it('fires when user has been active 14+ days and visited 5+ screens', async () => {
    localStorage.setItem('intake-complete-v1', '1');
    localStorage.setItem('intake-date-v1', daysAgo(15));
    localStorage.setItem('screens-visited-v1', JSON.stringify(['dash', 'week1', 'week2', 'week3', 'week4']));
    const { runNudgeTriggers } = await importTriggers();
    runNudgeTriggers();
    expect(captured.some(n => n.id === 'upgrade-nudge')).toBe(true);
  });

  it('does NOT fire if intake date is only 10 days ago', async () => {
    localStorage.setItem('intake-complete-v1', '1');
    localStorage.setItem('intake-date-v1', daysAgo(10));
    localStorage.setItem('screens-visited-v1', JSON.stringify(['dash', 'week1', 'week2', 'week3', 'week4']));
    const { runNudgeTriggers } = await importTriggers();
    runNudgeTriggers();
    expect(captured.some(n => n.id === 'upgrade-nudge')).toBe(false);
  });

  it('does NOT fire if fewer than 5 screens visited', async () => {
    localStorage.setItem('intake-complete-v1', '1');
    localStorage.setItem('intake-date-v1', daysAgo(20));
    localStorage.setItem('screens-visited-v1', JSON.stringify(['dash', 'week1']));
    const { runNudgeTriggers } = await importTriggers();
    runNudgeTriggers();
    expect(captured.some(n => n.id === 'upgrade-nudge')).toBe(false);
  });

  it('respects 7-day spacing between upgrade nudge shows', async () => {
    localStorage.setItem('intake-complete-v1', '1');
    localStorage.setItem('intake-date-v1', daysAgo(20));
    localStorage.setItem('screens-visited-v1', JSON.stringify(['dash', 'week1', 'week2', 'week3', 'week4']));
    localStorage.setItem('last-upgrade-nudge-v1', daysAgo(3)); // shown 3 days ago
    const { runNudgeTriggers } = await importTriggers();
    runNudgeTriggers();
    expect(captured.some(n => n.id === 'upgrade-nudge')).toBe(false);
  });

  it('fires after 7-day spacing has elapsed', async () => {
    localStorage.setItem('intake-complete-v1', '1');
    localStorage.setItem('intake-date-v1', daysAgo(20));
    localStorage.setItem('screens-visited-v1', JSON.stringify(['dash', 'week1', 'week2', 'week3', 'week4']));
    localStorage.setItem('last-upgrade-nudge-v1', daysAgo(8)); // shown 8 days ago
    const { runNudgeTriggers } = await importTriggers();
    runNudgeTriggers();
    expect(captured.some(n => n.id === 'upgrade-nudge')).toBe(true);
  });
});
