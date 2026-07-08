import { describe, it, expect } from 'vitest';
import {
  MOVES,
  PROGRAM_WEEKS,
  TOTAL_PROGRAM_SLOTS,
  moveForWeek,
  programStart,
  startOfWeekMon,
  daysHitInWeek,
  effectiveTarget,
  calendarWeek,
  moveProgress,
  movesCompleted,
  programCumulativePct,
  programMindspanScore,
  weeklyPctSeries,
} from './program';

// Wed 2026-07-08 — mid-week reference date
const NOW = new Date(2026, 6, 8, 10, 0, 0);
const MON = new Date(2026, 6, 6); // Monday of that week

function e(date: string, actionId: string) {
  return { dateActionId: `${date}#${actionId}` };
}

describe('program ladder', () => {
  it('has exactly 12 moves, one per week, riding the 4M month arc', () => {
    expect(MOVES).toHaveLength(PROGRAM_WEEKS);
    MOVES.forEach((m, i) => expect(m.week).toBe(i + 1));
    expect(MOVES[0].theme).toBe('MITIGATE');
    expect(MOVES[5].theme).toBe('MUSCLE');
    expect(MOVES[11].actionId).toBe('move-retake-assessment');
  });

  it('moveForWeek clamps out-of-range weeks', () => {
    expect(moveForWeek(0).week).toBe(1);
    expect(moveForWeek(99).week).toBe(12);
  });

  it('slot model totals 312', () => {
    expect(TOTAL_PROGRAM_SLOTS).toBe(312);
  });
});

describe('week math', () => {
  it('programStart backs off (week-1) Mondays', () => {
    expect(startOfWeekMon(NOW).getDate()).toBe(6);
    expect(programStart(NOW, 1).getDate()).toBe(6);
    expect(programStart(NOW, 3).getDate()).toBe(22); // June 22
  });

  it('daysHitInWeek counts distinct days only, inside the week', () => {
    const entries = [
      e('2026-07-06', 'fasted-walk'),
      e('2026-07-06', 'fasted-walk'), // dup same day
      e('2026-07-07', 'fasted-walk'),
      e('2026-06-30', 'fasted-walk'), // prior week
    ];
    expect(daysHitInWeek(entries, 'fasted-walk', MON)).toBe(2);
  });

  it('moveProgress completes at target', () => {
    const move = moveForWeek(6); // walks ×5
    const entries = ['06', '07', '08', '09', '10'].map(d => e(`2026-07-${d}`, 'fasted-walk'));
    const p = moveProgress(entries, move, MON);
    expect(p).toEqual({ done: 5, target: 5, complete: true });
  });
});

describe('program-paced scoring (v2)', () => {
  it('a perfect first days-of-week-1 lands low — the ring must be earned', () => {
    // perfect Mon-Wed of week 1: dailies + window × 3 days, move (biome) not yet at 7 days
    const entries: { dateActionId: string }[] = [];
    for (const d of ['06', '07', '08']) {
      for (const a of ['biome-ns-ultra', 'eating-window', 'protein-breakfast']) {
        entries.push(e(`2026-07-${d}`, a));
      }
    }
    const cum = programCumulativePct(entries, NOW, 1);
    expect(cum).toBeLessThanOrEqual(5); // 9 of 312
    const score = programMindspanScore({
      cumulativePct: cum,
      rollingPct: 43, // 9 of 21 rolling slots
      riskLoad: 40,
      movesDone: 0,
    });
    expect(score).toBeGreaterThanOrEqual(20);
    expect(score).toBeLessThanOrEqual(40);
  });

  it('a completed program with lowered risk approaches 100', () => {
    const score = programMindspanScore({ cumulativePct: 100, rollingPct: 100, riskLoad: 10, movesDone: 12 });
    expect(score).toBeGreaterThanOrEqual(95);
  });

  it('movesCompleted honors each move inside its own week', () => {
    // week 1 (biome ×7) fully hit, currently week 2
    const entries: { dateActionId: string }[] = [];
    for (let d = 29; d <= 30; d++) entries.push(e(`2026-06-${d}`, 'biome-ns-ultra'));
    for (let d = 1; d <= 5; d++) entries.push(e(`2026-07-0${d}`, 'biome-ns-ultra'));
    expect(movesCompleted(entries, NOW, 2)).toBe(1);
  });

  it('weeklyPctSeries returns 12 bars, zeros for locked weeks', () => {
    const bars = weeklyPctSeries([], NOW, 3);
    expect(bars).toHaveLength(12);
    expect(bars.slice(3).every(v => v === 0)).toBe(true);
  });
});

describe('audit 2026-07-07 fixes', () => {
  it('effectiveTarget clamps a daily Move in the partial signup week', () => {
    const wkMon = new Date(2026, 6, 6);
    const signup = new Date(2026, 6, 9); // Thu → 4 days left
    expect(effectiveTarget(moveForWeek(1), wkMon, signup)).toBe(4);
    expect(effectiveTarget(moveForWeek(1), new Date(2026, 6, 13), signup)).toBe(7);
  });
  it('Week-1 Biome Move completes for a Thursday signup with 4 taps', () => {
    const wkMon = new Date(2026, 6, 6);
    const signup = new Date(2026, 6, 9);
    const entries = ['09','10','11','12'].map(d => e(`2026-07-${d}`, 'biome-ns-ultra'));
    expect(moveProgress(entries, moveForWeek(1), wkMon, signup).complete).toBe(true);
  });
  it('retired action ids are counted via alias', () => {
    const entries = ['06','07'].map(d => e(`2026-07-${d}`, 'mitigate-biome-ns'));
    expect(daysHitInWeek(entries, 'biome-ns-ultra', new Date(2026, 6, 6))).toBe(2);
  });
  it('calendarWeek is DST-safe across spring-forward', () => {
    expect(calendarWeek(new Date(2026, 2, 2), new Date(2026, 2, 16))).toBe(3);
  });
})
