/**
 * "My counts" — daily Count Yourself Skinny numbers (TJ 2026-11-20).
 *
 * Stored as Adherence rows `{date}#count-<field>` with a numeric `value` and
 * `notes` = JSON `{"source": "manual"}`. A future automatic writer (HealthKit,
 * AirPods) uses the SAME action ids with a different `source`. Pure module.
 */

export type CountKey = 'steps' | 'chews' | 'water' | 'sleep';
export type CountSource = 'manual' | 'healthkit' | 'airpods';

export interface CountField {
  key: CountKey;
  actionId: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  integer: boolean;
  inputMode: 'numeric' | 'decimal';
}

export const COUNT_FIELDS: CountField[] = [
  { key: 'steps', actionId: 'count-steps', label: 'Steps', unit: 'total', min: 0, max: 100000, integer: true, inputMode: 'numeric' },
  { key: 'chews', actionId: 'count-chews', label: 'Chews per bite', unit: 'average', min: 1, max: 100, integer: true, inputMode: 'numeric' },
  { key: 'water', actionId: 'count-water', label: 'Water before noon', unit: 'glasses', min: 0, max: 20, integer: true, inputMode: 'numeric' },
  { key: 'sleep', actionId: 'count-sleep', label: 'Sleep last night', unit: 'hours', min: 0, max: 24, integer: false, inputMode: 'decimal' },
];

export const TEN_K_ACTION = '10k-steps';
export const TEN_K_STEPS = 10000;

export type CountValues = Record<CountKey, number | null>;
export type ParseResult = { ok: true; value: number | null } | { ok: false; error: string };

export function parseCountInput(key: CountKey, raw: string | number | null | undefined): ParseResult {
  const f = COUNT_FIELDS.find(x => x.key === key)!;
  let s = String(raw ?? '').trim();
  // Integer fields: commas are thousands separators ("8,250"). Decimal fields:
  // a comma is a decimal mark ("7,5" hours).
  s = f.integer ? s.replace(/,/g, '') : s.replace(',', '.');
  if (s === '') return { ok: true, value: null };
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(s)) return { ok: false, error: `${f.label}: enter a number.` };
  const n = Number(s);
  if (f.integer && !Number.isInteger(n)) return { ok: false, error: `${f.label}: use a whole number.` };
  if (n < f.min || n > f.max) return { ok: false, error: `${f.label}: enter ${f.min} to ${f.max}.` };
  return { ok: true, value: n };
}

export function needsTenKAction(steps: number | null, alreadyLogged: boolean): boolean {
  return steps !== null && steps >= TEN_K_STEPS && !alreadyLogged;
}

export interface RowLike { dateActionId: string; value?: number | null }

function split(e: RowLike): { date: string; id: string } | null {
  const i = e.dateActionId.indexOf('#');
  return i < 0 ? null : { date: e.dateActionId.slice(0, i), id: e.dateActionId.slice(i + 1) };
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Local calendar day i after `start` (DST-safe: builds from y/m/d, not ms). */
function dayStr(start: Date, i: number): string {
  return ymd(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export function countRowsToValues(rows: RowLike[], date: string): CountValues {
  const out: CountValues = { steps: null, chews: null, water: null, sleep: null };
  for (const e of rows) {
    const p = split(e);
    if (!p || p.date !== date) continue;
    const f = COUNT_FIELDS.find(x => x.actionId === p.id);
    if (f && typeof e.value === 'number') out[f.key] = e.value;
  }
  return out;
}

export interface WeekSummary {
  avgSteps: number | null;
  avgChews: number | null;
  avgWater: number | null;
  avgSleep: number | null;
  daysLogged: number;
  /** Steps for Mon..Sun of the week (null = nothing logged). */
  steps: Array<number | null>;
}

function avg(vals: number[]): number | null {
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export function weekSummary(rows: RowLike[], weekStart: Date): WeekSummary {
  const days = Array.from({ length: 7 }, (_, i) => dayStr(weekStart, i));
  const per: Record<CountKey, Array<number | null>> = { steps: [], chews: [], water: [], sleep: [] };
  const logged = new Set<string>();
  for (const k of Object.keys(per) as CountKey[]) per[k] = days.map(() => null);
  for (const e of rows) {
    const p = split(e);
    if (!p || typeof e.value !== 'number') continue;
    const idx = days.indexOf(p.date);
    const f = COUNT_FIELDS.find(x => x.actionId === p.id);
    if (idx < 0 || !f) continue;
    per[f.key][idx] = e.value;
    logged.add(p.date);
  }
  const a = (k: CountKey) => avg(per[k].filter((v): v is number => v !== null));
  const st = a('steps');
  return { avgSteps: st === null ? null : Math.round(st), avgChews: a('chews'), avgWater: a('water'), avgSleep: a('sleep'), daysLogged: logged.size, steps: per.steps };
}

export function countNotes(source: CountSource = 'manual'): string {
  return JSON.stringify({ source });
}

type Record_ = (input: { date: string; actionId: string; completed: boolean; value?: number | null; notes?: string | null }) => Promise<unknown>;

/** Persist one day's counts. Cleared fields delete their row; steps >= 10k
 * also logs the existing 10k-steps action once (best effort, never un-logged).
 * Resolves `tenKLogged` = true only when the 10k row was actually written now. */
export async function saveCounts(
  record: Record_, date: string, values: CountValues, rows: RowLike[], source: CountSource = 'manual',
): Promise<{ tenKLogged: boolean }> {
  const before = countRowsToValues(rows, date);
  for (const f of COUNT_FIELDS) {
    const v = values[f.key];
    if (v === null) {
      if (before[f.key] !== null) await record({ date, actionId: f.actionId, completed: false });
      continue;
    }
    await record({ date, actionId: f.actionId, completed: true, value: v, notes: countNotes(source) });
  }
  const has10k = rows.some(e => e.dateActionId === `${date}#${TEN_K_ACTION}`);
  if (needsTenKAction(values.steps, has10k)) {
    try {
      await record({ date, actionId: TEN_K_ACTION, completed: true });
      return { tenKLogged: true };
    } catch { /* best effort — counts are already saved */ }
  }
  return { tenKLogged: false };
}
