/**
 * Sex-aware copy helper for the renderer.
 *
 * `sex` is captured at assessment/intake and stored on UserProfile
 * (values are exactly 'female' | 'male'). Existing profiles have no value —
 * absent means unknown, and unknown always falls back to the paired copy that
 * shipped before this branch existed.
 *
 * Every piece of gendered copy in renderer.ts reads from `who(sex)` rather
 * than scattering ternaries through the HTML strings.
 */

export type Sex = 'female' | 'male';

/** Narrow anything (profile field, localStorage, query string) to a Sex or null. */
export function normalizeSex(value: unknown): Sex | null {
  return value === 'female' || value === 'male' ? value : null;
}

export interface WhoCopy {
  /** 'woman' | 'man' | 'man or woman' */
  noun: string;
  /** Sentence-case form of `noun`. */
  Noun: string;
  /** Week 1 — "why" field label. */
  whyLabel: string;
  /** Week 1 — accountability-target input placeholder. */
  accountabilityPlaceholder: string;
  /** Week 1 / Week 4 — identity statement label. */
  identityLabel: string;
  /** Week 1 / Week 4 — identity statement placeholder. */
  identityPlaceholder: string;
  /** Week 4 — present-tense hint above the final identity statement. */
  identityHint: string;
  /** Week 3 — identity-evolve label. */
  identityEvolveLabel: string;
  /** Week 3 — identity-evolve placeholder. */
  identityEvolvePlaceholder: string;
  /** Week 4 — deep-focus closing line. */
  w4Closing: string;
  /** Week 4 — graduation commitment sentence. */
  commitmentSentence: string;
  /** Week 4 — MOTIVATE reflection question. */
  w4MotivateQuestion: string;
  /** Week 3 hormones — show the ED-canary track. */
  showMensTrack: boolean;
  /** Week 3 hormones — show the perimenopause-canary track. */
  showWomensTrack: boolean;
  /** Month 1 stack — hormone note. */
  stackHormoneNote: string;
}

const MENS_STACK_NOTE =
  'Hormone note: testosterone is the number most never check until something breaks. '
  + 'If Week 3 flagged hormones, labs come first — total and free testosterone, SHBG, '
  + 'estradiol, DHEA-S — and any prescription is physician-led on top of the lifting, '
  + 'protein, and sleep that make it work.';

const WOMENS_STACK_NOTE =
  'Hormone note: estradiol, progesterone, and testosterone all matter in women, and one '
  + 'number in isolation tells you nothing — estradiol swings erratically through the '
  + 'transition. Labs come first — estradiol, progesterone, FSH, total and free '
  + 'testosterone, SHBG, TSH — and any hormone therapy is physician-led on top of the '
  + 'lifting, protein, and sleep that make it work.';

const FEMALE: WhoCopy = {
  noun: 'woman',
  Noun: 'Woman',
  whyLabel: 'My "why" — the woman I want to be at age 70',
  accountabilityPlaceholder: 'e.g. my husband, my wife, my kids, my parents, myself — pick one face',
  identityLabel: 'My identity statement (draft) — "I am a woman who..."',
  identityPlaceholder: 'I am a woman who...',
  identityHint: 'Write in present tense. "I am a woman who..." — not "I will try to..."',
  identityEvolveLabel: 'My identity is evolving — complete this sentence: "The woman I am becoming..."',
  identityEvolvePlaceholder: 'The woman I am becoming...',
  w4Closing: 'The woman who finishes Month 1 is not the same one who started it.',
  commitmentSentence:
    '"In completing Month 1 of the 4M program I commit to continuing my brain optimization practice because the woman I am becoming is worth protecting."',
  w4MotivateQuestion: 'MOTIVATE: In one sentence — who is the woman who completed Month 1?',
  showMensTrack: false,
  showWomensTrack: true,
  stackHormoneNote: WOMENS_STACK_NOTE,
};

const MALE: WhoCopy = {
  noun: 'man',
  Noun: 'Man',
  whyLabel: 'My "why" — the man I want to be at age 70',
  accountabilityPlaceholder: 'e.g. my wife, my husband, my kids, my parents, myself — pick one face',
  identityLabel: 'My identity statement (draft) — "I am a man who..."',
  identityPlaceholder: 'I am a man who...',
  identityHint: 'Write in present tense. "I am a man who..." — not "I will try to..."',
  identityEvolveLabel: 'My identity is evolving — complete this sentence: "The man I am becoming..."',
  identityEvolvePlaceholder: 'The man I am becoming...',
  w4Closing: 'The man who finishes Month 1 is not the same one who started it.',
  commitmentSentence:
    '"In completing Month 1 of the 4M program I commit to continuing my brain optimization practice because the man I am becoming is worth protecting."',
  w4MotivateQuestion: 'MOTIVATE: In one sentence — who is the man who completed Month 1?',
  showMensTrack: true,
  showWomensTrack: false,
  stackHormoneNote: MENS_STACK_NOTE,
};

/** Unknown — the paired copy that shipped before sex was captured. */
const UNKNOWN: WhoCopy = {
  noun: 'man or woman',
  Noun: 'Man or woman',
  whyLabel: 'My "why" — the man or woman I want to be at age 70',
  accountabilityPlaceholder: 'e.g. my wife, my husband, my kids, my parents, myself — pick one face',
  identityLabel: 'My identity statement (draft) — "I am a man who..." or "I am a woman who..."',
  identityPlaceholder: 'I am a man who... / I am a woman who...',
  identityHint: 'Write in present tense. "I am a man who..." or "I am a woman who..." — not "I will try to..."',
  identityEvolveLabel:
    'My identity is evolving — complete this sentence: "The man I am becoming..." or "The woman I am becoming..."',
  identityEvolvePlaceholder: 'The man I am becoming... / The woman I am becoming...',
  w4Closing: 'The man or woman who finishes Month 1 is not the same one who started it.',
  commitmentSentence:
    '"In completing Month 1 of the 4M program I commit to continuing my brain optimization practice because who I am becoming is worth protecting."',
  w4MotivateQuestion: 'MOTIVATE: In one sentence — who is the man — or woman — who completed Month 1?',
  showMensTrack: true,
  showWomensTrack: true,
  stackHormoneNote: `${MENS_STACK_NOTE}\n\n${WOMENS_STACK_NOTE}`,
};

/** Copy pack for the given sex. Anything other than 'female'/'male' = unknown. */
export function who(sex: unknown): WhoCopy {
  const s = normalizeSex(sex);
  if (s === 'female') return FEMALE;
  if (s === 'male') return MALE;
  return UNKNOWN;
}

// ── Local cache ───────────────────────────────────────────────────────────────
// The profile arrives asynchronously; the first render happens before it lands.
// Caching the last known value keeps the copy stable across reloads. Only the
// two literal values are ever written — never any other profile data.
const SEX_KEY = 'my4m-sex-v1';

export function readCachedSex(): Sex | null {
  if (typeof localStorage === 'undefined') return null;
  try { return normalizeSex(localStorage.getItem(SEX_KEY)); } catch { return null; }
}

export function cacheSex(value: unknown): Sex | null {
  const s = normalizeSex(value);
  if (typeof localStorage === 'undefined') return s;
  try {
    if (s) localStorage.setItem(SEX_KEY, s);
  } catch { /* private mode — copy just falls back to the paired form */ }
  return s;
}
