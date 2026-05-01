/**
 * intakeMigration.ts — Returning-user detection (simplified for 3-stage intake).
 * All operations are localStorage-only; no backend calls.
 */

export type ReturningUserStatus =
  | { kind: 'fresh' }
  | { kind: 'in-flight' }
  | { kind: 'returning-legacy' }
  | { kind: 'returning-completed' };

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function detectReturningUser(storage: Storage): ReturningUserStatus {
  // returning-completed: prior completion flag present
  const complete = readJson<{ completedAt?: string }>(storage, 'intake-complete-v1');
  if (complete?.completedAt) return { kind: 'returning-completed' };

  // in-flight: stage key present, currentStage > 1
  const stageData = readJson<{ currentStage?: number }>(storage, 'intake-stage-v1');
  if (stageData?.currentStage !== undefined && stageData.currentStage > 1) {
    return { kind: 'in-flight' };
  }

  return { kind: 'fresh' };
}

/**
 * fillNeutralDefaults — no-op stub kept for backward compatibility.
 * The 3-stage Likert flow no longer needs neutral-fill logic.
 */
export function fillNeutralDefaults(_storage: Storage): number {
  return 0;
}
