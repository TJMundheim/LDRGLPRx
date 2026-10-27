/**
 * encounterOrder — newest-first ordering for a patient's encounters.
 *
 * The AppSync resolver returns encounters in DynamoDB sort-key order
 * (encounter#<id>), i.e. alphabetical by id, not by time. Anything that
 * needs "the latest encounter" or a chronological list must sort client-side.
 */

interface HasTimes {
  createdAt?: string | null;
  updatedAt?: string | null;
}

function stamp(e: HasTimes): number {
  for (const v of [e.createdAt, e.updatedAt]) {
    if (v) {
      const t = Date.parse(v);
      if (!Number.isNaN(t)) return t;
    }
  }
  return Number.NEGATIVE_INFINITY;
}

/** New array, newest first by createdAt (fallback updatedAt). Stable: ties/missing keep original order. */
export function sortEncountersNewestFirst<T extends HasTimes>(encounters: readonly T[] | null | undefined): T[] {
  return (encounters ?? [])
    .map((e, i) => ({ e, i, t: stamp(e) }))
    .sort((a, b) => (a.t === b.t ? a.i - b.i : b.t > a.t ? 1 : -1))
    .map((x) => x.e);
}

/** The most recent encounter, or undefined. */
export function latestEncounter<T extends HasTimes>(encounters: readonly T[] | null | undefined): T | undefined {
  return sortEncountersNewestFirst(encounters)[0];
}
