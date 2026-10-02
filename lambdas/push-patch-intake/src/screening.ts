// Pre-payment safety screen, read from the Stripe checkout-session metadata.
// Mirror of website/src/data/screening.ts: keep ids + labels in step.

export interface ScreeningNone { version: 'none' }
export interface ScreeningAnswers {
  version: string;
  at: string;
  denied: string[];
  placement: { metalImplant: boolean; woundOrScar: boolean };
  suitableArea: boolean;
}
export type StoredScreening = ScreeningAnswers | ScreeningNone;

const DENIED_LABELS: Record<string, string> = {
  seizures: 'epilepsy/seizures',
  pacemaker: 'pacemaker or implanted electronic device',
  pregnant: 'pregnancy',
  noSuitableArea: 'no suitable area',
};
const PLACEMENT_LABELS = { metalImplant: 'Metal implant', woundOrScar: 'Wound or scar' } as const;

const isYes = (map: Record<string, string>, k: string) => map[k] === 'yes';
const pairs = (v: string | undefined): Record<string, string> =>
  Object.fromEntries((v ?? '').split(',').map((p) => p.split(':').map((x) => x.trim())).filter((p) => p[0] && p[1]));

export function parseScreening(meta: Record<string, string> | null | undefined): StoredScreening {
  const m = meta ?? {};
  if (!m['screen_v']) return { version: 'none' };
  const placement = pairs(m['screen_placement']);
  return {
    version: m['screen_v'],
    at: m['screen_at'] ?? '',
    denied: (m['screen_denied'] ?? '').split(',').map((x) => x.trim()).filter(Boolean),
    placement: { metalImplant: isYes(placement, 'metalImplant'), woundOrScar: isYes(placement, 'woundOrScar') },
    suitableArea: m['screen_area'] === 'yes',
  };
}

const hasScreen = (s: StoredScreening): s is ScreeningAnswers => s.version !== 'none';

/** Subject flags: "[Placement note]" on any yes placement answer; "[No pre-payment screening]" on legacy orders. */
export function screeningSubjectFlags(s: StoredScreening): string[] {
  if (!hasScreen(s)) return ['[No pre-payment screening]'];
  return s.placement.metalImplant || s.placement.woundOrScar ? ['[Placement note]'] : [];
}

/** Plain-text lines for the "Pre-payment safety screen" block (HTML escapes them). */
export function screeningLines(s: StoredScreening): string[] {
  if (!hasScreen(s)) return ['No pre-payment screening (order placed before the safety check existed).'];
  const denied = s.denied.length ? s.denied.map((d) => DENIED_LABELS[d] ?? d).join('; ') : 'none';
  const lines = [`Patient denied: ${denied} (version ${s.version}, ${s.at.slice(0, 10)})`];
  for (const k of Object.keys(PLACEMENT_LABELS) as (keyof typeof PLACEMENT_LABELS)[]) {
    if (s.placement[k]) lines.push(`${PLACEMENT_LABELS[k]}: yes, told to choose another area`);
  }
  return lines;
}
