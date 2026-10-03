// Human-readable sections of the clinical packet: the push-patch "Pre-payment safety screen"
// (screeningAnswers.pushPatch, written by push-patch-intake), leftover screening answers, ship-to.

type Row = [label: string, value: string];
type Answers = Record<string, boolean | undefined>;
interface PushPatchScreen {
  version?: string; at?: string; denied?: string[]; suitableArea?: boolean;
  placement?: { metalImplant?: boolean; woundOrScar?: boolean }; answers?: Answers;
}

const SAFETY: [string, string][] = [
  ['seizures', 'Epilepsy or seizures'],
  ['pacemaker', 'Pacemaker or implanted electronic device'],
  ['pregnant', 'Pregnant or could be pregnant'],
];
const WOUND: [string, string] = ['woundOrScar', 'Open wound, recent graft or scar where the patch may be worn'];
// v1 = six rows; v2 (metal implant merged into the suitable-area question) = five rows, in page order.
const QUESTIONS_V1: [string, string][] = [...SAFETY, ['metalImplant', 'Metal implant where the patch may be worn'], WOUND, ['suitableArea', 'Suitable clean, low-hair skin area available']];
const QUESTIONS_V2: [string, string][] = [...SAFETY, ['suitableArea', 'Suitable clean, low-hair skin area away from any metal implant'], WOUND];
const PLACEMENT = new Set(['metalImplant', 'woundOrScar']);

const central = (iso: string) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
}).format(new Date(iso));

/** Answer rows (label, Yes/No) + a footer line. Empty when there is no pushPatch screening. Plain text (caller escapes). */
export function screeningRows(raw: unknown): { rows: Row[]; footer: string } {
  if (!raw || typeof raw !== 'object') return { rows: [], footer: '' };
  const s = raw as PushPatchScreen;
  if (!s.version || s.version === 'none') return { rows: [], footer: 'No pre-payment screening on this order (placed before the safety check existed).' };
  // Records stored before `answers` existed: derive from denied / placement / suitableArea.
  const a: Answers = s.answers ?? {
    ...Object.fromEntries((s.denied ?? []).map((d) => [d, true])), ...s.placement, suitableArea: s.suitableArea,
  };
  const rows = (s.version === 'pp-screen-v1' ? QUESTIONS_V1 : QUESTIONS_V2).map(([k, label]): Row => [label, `${a[k] ? 'Yes' : 'No'}${PLACEMENT.has(k) && a[k] ? ' (told to choose another area)' : ''}`]);
  const when = s.at && !Number.isNaN(Date.parse(s.at)) ? `, completed ${central(s.at)}` : '';
  return { rows, footer: `Screen version ${s.version}${when}` };
}

const show = (v: unknown): string =>
  Array.isArray(v) ? v.map(show).join(', ') : v && typeof v === 'object' ? Object.entries(v).map(([k, x]) => `${k}: ${show(x)}`).join('; ') : String(v ?? '—');

/** Remaining screening answers (pushPatch removed) as label/value rows; empty when nothing remains. */
export const answerRows = (answers: Record<string, unknown>): Row[] => Object.entries(answers).map(([k, v]): Row => [k, show(v)]);

/** Ship-to lines (plain text) from the encounter's shipTo; empty when absent. */
export function shipToLines(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const t = raw as Record<string, string | undefined>;
  const cityLine = [t['city'], [t['state'], t['postalCode']].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [t['name'], t['line1'], t['line2'], cityLine].filter((l): l is string => !!l);
}
