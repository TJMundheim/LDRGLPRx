import type { PillarId } from './pillars';

/** Top-level navigation tab. */
export interface Tab {
  id: string;
  label: string;
  icon: string;
}

// Inline SVG line icons (18px, stroke currentColor, 1.75 stroke-width) — no emoji.
// They inherit color from the nav item so active/inactive states still work.
const ICON_DASHBOARD = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>';
const ICON_MIND = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="12" r="0.9" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none"/><circle cx="15.5" cy="12" r="0.9" fill="currentColor" stroke="none"/></svg>';
const ICON_MUSCLE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="9" width="3" height="6" rx="1"/><rect x="19.5" y="9" width="3" height="6" rx="1"/><rect x="5" y="7" width="2.5" height="10" rx="1"/><rect x="16.5" y="7" width="2.5" height="10" rx="1"/><line x1="7.5" y1="12" x2="16.5" y2="12"/></svg>';
const ICON_MITIGATE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>';
const ICON_MOTIVATE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>';
const ICON_REGEN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.9-4"/><polyline points="5 3 5 7 9 7"/><path d="M4 13a8 8 0 0 0 14.9 4"/><polyline points="19 21 19 17 15 17"/></svg>';

export const tabs: Tab[] = [
  {id:'dash',  label:'Dashboard',           icon:ICON_DASHBOARD},
  {id:'w1',    label:'Week 1',              icon:ICON_MIND},
  {id:'w2',    label:'Week 2',              icon:ICON_MUSCLE},
  {id:'w3',    label:'Week 3',              icon:ICON_MITIGATE},
  {id:'w4',    label:'Week 4',              icon:ICON_MOTIVATE},
  {id:'regen', label:'Bonus — Regenerative',icon:ICON_REGEN}
];

export interface WeekMeta {
  bg: string;
  ac: string;
  label: string;
  sub: string;
  focus: string;
  /** Which pillar is the deep-focus pillar for this week. */
  pillarId: PillarId;
  /** Short headline drawn from deck slide 14 pillar description. */
  primaryHeadline: string;
  /** Verbatim quote from the deck slide for this pillar. */
  deckQuote: string;
}

export const weekMeta: Record<1 | 2 | 3 | 4, WeekMeta> = {
  1: {
    bg: '#e7effa', ac: '#1d5fa8',
    label: 'Week 1',
    sub: 'Mind · Muscle · Mitigate · Motivate — baselines, nutrition & first actions',
    focus: 'Mind (deep focus): Full Supplement Stack',
    pillarId: 'mind',
    primaryHeadline: 'Feed, fuel, and sharpen your cognitive edge.',
    deckQuote: 'We feed the brain. Food quality, supplements, methylation.',
  },
  2: {
    bg: '#fbeceb', ac: '#b42318',
    label: 'Week 2',
    sub: 'Mind · Muscle · Mitigate · Motivate — actions in motion, tracking begins',
    focus: 'Muscle (deep focus): Movement & Protein',
    pillarId: 'muscle',
    primaryHeadline: 'Rebuild the body that powers the brain.',
    deckQuote: 'We build the body that supports the brain. Morning protocol. Outdoor. Fasted.',
  },
  3: {
    bg: '#e8f4ee', ac: '#1e7a4f',
    label: 'Week 3',
    sub: 'Mind · Muscle · Mitigate · Motivate — full personalized assessment + gut-brain repair',
    focus: 'Mitigate (deep focus): MindSpan Personal Risk Assessment',
    pillarId: 'mitigate',
    primaryHeadline: 'Remove the risk factors stealing your brain & body.',
    deckQuote: 'We start by removing what\'s working against you. Your MindSpan Personalized Assessment.',
  },
  4: {
    /* Week accents are literal hexes (not tokens) because consumers append alpha
       suffixes, e.g. `${wc.ac}55`. bg = pale tint, ac = AA-on-white ink.
       Week 4 purple #3C3489/#6B5ED4 darkened to #4b3fb0 for AA on white. */
    bg: '#eeecfa', ac: '#4b3fb0',
    label: 'Week 4',
    sub: 'Mind · Muscle · Mitigate · Motivate — re-assessment, progress, Month 2 commitment',
    focus: 'Motivate (deep focus): Identity & Month 2 Vision',
    pillarId: 'motivate',
    primaryHeadline: 'Lock in your identity and daily system.',
    deckQuote: 'By Week 4, you don\'t have a program. You have a system.',
  },
};
