// Pre-payment safety screening. Mirrors website/src/data/screening.ts (push-patch lane).
// Add another lane by adding an entry to LANES.
type Lane = {
  version: string;
  knockouts: string[]; // must be false
  required: string[]; // must be true
  placement: string[]; // informational, either answer allowed
  area: string; // the "suitable area" id (also in `required`)
};

// Each lane lists every accepted screening version (newest first). v1 stays accepted so in-flight pages
// and already-placed orders keep working; v2 merged the metal-implant question into suitableArea.
const LANES: Record<string, Lane[]> = {
  'push-patch': [
    {
      version: 'pp-screen-v2',
      knockouts: ['seizures', 'pacemaker', 'pregnant'],
      required: ['suitableArea'],
      placement: ['woundOrScar'],
      area: 'suitableArea',
    },
    {
      version: 'pp-screen-v1',
      knockouts: ['seizures', 'pacemaker', 'pregnant'],
      required: ['suitableArea'],
      placement: ['metalImplant', 'woundOrScar'],
      area: 'suitableArea',
    },
  ],
};

export type ScreenResult =
  | { ok: true; metadata: Record<string, string> }
  | { ok: false; reason: 'screening required' | 'not eligible' };

const yn = (b: boolean) => (b ? 'yes' : 'no');

export function evaluateScreening(input: unknown, lane = 'push-patch', now = new Date()): ScreenResult {
  const s = input as { version?: unknown; answers?: Record<string, unknown> } | null | undefined;
  const cfg = LANES[lane].find((l) => l.version === s?.version);
  const a = s?.answers;
  if (!s || !cfg || !a || typeof a !== 'object') return { ok: false, reason: 'screening required' };
  const ids = [...cfg.knockouts, ...cfg.required, ...cfg.placement];
  if (ids.some((k) => typeof a[k] !== 'boolean')) {
    return { ok: false, reason: 'screening required' };
  }
  if (cfg.knockouts.some((k) => a[k] === true) || cfg.required.some((k) => a[k] !== true)) return { ok: false, reason: 'not eligible' };
  return {
    ok: true,
    metadata: {
      screen_v: cfg.version,
      screen_at: now.toISOString(),
      screen_denied: cfg.knockouts.join(','), // patient denied each (all answered false)
      screen_placement: cfg.placement.map((k) => `${k}:${yn(a[k] as boolean)}`).join(','),
      screen_area: yn(a[cfg.area] as boolean),
    },
  };
}
