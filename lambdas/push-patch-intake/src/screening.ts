// Pre-payment safety screen, read from the Stripe checkout-session metadata.
// Mirror of website/src/data/screening.ts: keep ids + labels in step.

export interface ScreeningNone { version: 'none' }
export interface ScreeningAnswers {
  version: string;
  at: string;
  denied: string[];
  /** v1: metalImplant + woundOrScar. v2: woundOrScar only (the implant question was merged into suitableArea). */
  placement: { metalImplant?: boolean; woundOrScar: boolean };
  suitableArea: boolean;
  /** v1: six answers. v2: five (no metalImplant). Knockouts/placement: true = answered Yes. suitableArea: true = Yes (area available). */
  answers: { seizures: boolean; pacemaker: boolean; pregnant: boolean; metalImplant?: boolean; woundOrScar: boolean; suitableArea: boolean };
}
export type StoredScreening = ScreeningAnswers | ScreeningNone;

type Key = keyof ScreeningAnswers['answers'];
const SAFETY: [Key, string][] = [
  ['seizures', 'Epilepsy or seizures'],
  ['pacemaker', 'Pacemaker or implanted electronic device'],
  ['pregnant', 'Pregnant or could be pregnant'],
];
const WOUND: [Key, string] = ['woundOrScar', 'Open wound, recent graft or scar where the patch may be worn'];
// Row order = question order on the page. v1 keeps its six rows; anything else is read as v2 (five rows).
const QUESTIONS_V1: [Key, string][] = [...SAFETY, ['metalImplant', 'Metal implant where the patch may be worn'], WOUND, ['suitableArea', 'Suitable clean, low-hair skin area available']];
const QUESTIONS_V2: [Key, string][] = [...SAFETY, ['suitableArea', 'Suitable clean, low-hair skin area away from any metal implant'], WOUND];
const questionsFor = (version: string) => (version === 'pp-screen-v1' ? QUESTIONS_V1 : QUESTIONS_V2);
const PLACEMENT_KEYS = new Set(['metalImplant', 'woundOrScar']);

const isYes = (map: Record<string, string>, k: string) => map[k] === 'yes';
const pairs = (v: string | undefined): Record<string, string> =>
  Object.fromEntries((v ?? '').split(',').map((p) => p.split(':').map((x) => x.trim())).filter((p) => p[0] && p[1]));

export function parseScreening(meta: Record<string, string> | null | undefined): StoredScreening {
  const m = meta ?? {};
  if (!m['screen_v']) return { version: 'none' };
  const placement = pairs(m['screen_placement']);
  const denied = (m['screen_denied'] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const v1 = m['screen_v'] === 'pp-screen-v1';
  const woundOrScar = isYes(placement, 'woundOrScar');
  const suitableArea = m['screen_area'] === 'yes';
  const metal = v1 ? { metalImplant: isYes(placement, 'metalImplant') } : {};
  return {
    version: m['screen_v'],
    at: m['screen_at'] ?? '',
    denied,
    placement: { ...metal, woundOrScar },
    suitableArea,
    answers: { seizures: denied.includes('seizures'), pacemaker: denied.includes('pacemaker'), pregnant: denied.includes('pregnant'),
      ...metal, woundOrScar, suitableArea },
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

/** Plain-text lines for the "Pre-payment safety screen" block (HTML escapes them): every answer for the stored version (v1: six, v2: five), Yes/No. */
export function screeningLines(s: StoredScreening): string[] {
  if (!hasScreen(s)) return ['No pre-payment screening on this order (placed before the safety check existed).'];
  const lines = questionsFor(s.version).map(([k, label]) =>
    `${label}: ${s.answers[k] ? 'Yes' : 'No'}${PLACEMENT_KEYS.has(k) && s.answers[k] ? ' (told to choose another area)' : ''}`);
  const when = Number.isNaN(Date.parse(s.at)) ? '' : `, completed ${central(s.at)}`;
  return [...lines, `Screen version ${s.version}${when}`];
}
