/** Pure logic for the talk book-drawing admin view. No PHI: entrants are contactId + "First L.". */

export interface Entrant { contactId: string; display: string }
export interface DrawingEventInfo { tag: string; entrantCount: number; lastEntryAt?: string | null }
export interface DrawState { winners: Entrant[]; maxDraws: number }

export const DEFAULT_MAX_DRAWS = 3;

type Rand = (n: number) => number;
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Uniform integer in [0, n) via crypto.getRandomValues with rejection sampling (no modulo bias). */
export function secureRandomIndex(n: number): number {
  if (!Number.isInteger(n) || n < 1) throw new Error('n must be a positive integer');
  if (n === 1) return 0;
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

/** Uniform pick among entrants not already drawn; null if none left. */
export function pickWinner(entrants: Entrant[], winners: Entrant[], rand: Rand = secureRandomIndex): Entrant | null {
  const drawn = new Set(winners.map((w) => w.contactId));
  const pool = entrants.filter((e) => !drawn.has(e.contactId));
  if (pool.length === 0) return null;
  return pool[rand(pool.length)];
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

/** Most recent event by lastEntryAt; null when none. */
export function defaultEvent(events: DrawingEventInfo[]): string | null {
  if (!events.length) return null;
  return [...events].sort((a, b) => (b.lastEntryAt ?? '').localeCompare(a.lastEntryAt ?? ''))[0].tag;
}

const key = (tag: string) => `drawing:v1:${tag}`;
const empty = (): DrawState => ({ winners: [], maxDraws: DEFAULT_MAX_DRAWS });

function defaultStorage(): StorageLike | null {
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; }
}

export function loadState(tag: string, storage: StorageLike | null = defaultStorage()): DrawState {
  try {
    const raw = storage?.getItem(key(tag));
    if (!raw) return empty();
    const p = JSON.parse(raw);
    if (!Array.isArray(p.winners)) return empty();
    return {
      winners: p.winners.filter((w: Entrant) => w && typeof w.contactId === 'string' && typeof w.display === 'string'),
      maxDraws: Number.isInteger(p.maxDraws) && p.maxDraws > 0 ? p.maxDraws : DEFAULT_MAX_DRAWS,
    };
  } catch { return empty(); }
}

export function saveState(tag: string, state: DrawState, storage: StorageLike | null = defaultStorage()): void {
  try { storage?.setItem(key(tag), JSON.stringify(state)); } catch { /* storage unavailable */ }
}

export function clearState(tag: string, storage: StorageLike | null = defaultStorage()): void {
  try { storage?.removeItem(key(tag)); } catch { /* storage unavailable */ }
}
