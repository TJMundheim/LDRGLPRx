// Pre-payment safety screen, read from the Stripe checkout-session metadata.
// Mirror of website/src/data/screening.ts: keep ids + labels in step.

export interface ScreeningNone { version: 'none' }
export interface ScreeningAnswers {
  version: string;
  at: string;
  denied: string[];
  placement: { metalImplant: boolean; woundOrScar: boolean };
  suitableArea: boolean;
  /** All six answers as booleans. Knockouts/placement: true = answered Yes. suitableArea: true = Yes (area available). */
  answers: { seizures: boolean; pacemaker: boolean; pregnant: boolean; metalImplant: boolean; woundOrScar: boolean; suitableArea: boolean };
}
export type StoredScreening = ScreeningAnswers | ScreeningNone;

const QUESTIONS: [keyof ScreeningAnswers['answers'], string][] = [
  ['seizures', 'Epilepsy or seizures'],
  ['pacemaker', 'Pacemaker or implanted electronic device'],
  ['pregnant', 'Pregnant or could be pregnant'],
  ['metalImplant', 'Metal implant where the patch may be worn'],
  ['woundOrScar', 'Open wound, recent graft or scar where the patch may be worn'],
  ['suitableArea', 'Suitable clean, low-hair skin area available'],
];
const PLACEMENT_KEYS = new Set(['metalImplant', 'woundOrScar']);

const isYes = (map: Record<string, string>, k: string) => map[k] === 'yes';
const pairs = (v: string | undefined): Record<string, string> =>
  Object.fromEntries((v ?? '').split(',').map((p) => p.split(':').map((x) => x.trim())).filter((p) => p[0] && p[1]));

export function parseScreening(meta: Record<string, string> | null | undefined): StoredScreening {
  const m = meta ?? {};
  if (!m['screen_v']) return { version: 'none' };
  const placement = pairs(m['screen_placement']);
  const denied = (m['screen_denied'] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const [metalImplant, woundOrScar] = [isYes(placement, 'metalImplant'), isYes(placement, 'woundOrScar')];
  const suitableArea = m['screen_area'] === 'yes';
  return {
    version: m['screen_v'],
    at: m['screen_at'] ?? '',
    denied,
    placement: { metalImplant, woundOrScar },
    suitableArea,
    answers: { seizures: denied.includes('seizures'), pacemaker: denied.includes('pacemaker'), pregnant: denied.includes('pregnant'),
      metalImplant, woundOrScar, suitableArea },
  };
}

const hasScreen = (s: StoredScreening): s is ScreeningAnswers => s.version !== 'none';

/** Subject flags: "[Placement note]" on any yes placement answer; "[No pre-payment screening]" on legacy orders. */
export function screeningSubjectFlags(s: StoredScreening): string[] {
  if (!hasScreen(s)) return ['[No pre-payment screening]'];
  return s.placement.metalImplant || s.placement.woundOrScar ? ['[Placement note]'] : [];
}

const central = (iso: string) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
}).format(new Date(iso));

/** Plain-text lines for the "Pre-payment safety screen" block (HTML escapes them): all six answers, Yes/No. */
export function screeningLines(s: StoredScreening): string[] {
  if (!hasScreen(s)) return ['No pre-payment screening on this order (placed before the safety check existed).'];
  const lines = QUESTIONS.map(([k, label]) =>
    `${label}: ${s.answers[k] ? 'Yes' : 'No'}${PLACEMENT_KEYS.has(k) && s.answers[k] ? ' (told to choose another area)' : ''}`);
  const when = Number.isNaN(Date.parse(s.at)) ? '' : `, completed ${central(s.at)}`;
  return [...lines, `Screen version ${s.version}${when}`];
}
