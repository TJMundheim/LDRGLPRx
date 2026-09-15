import type { PillarId } from './pillars';

/** Top-level navigation tab. */
export interface Tab {
  id: string;
  label: string;
  icon: string;
}

export const tabs: Tab[] = [
  {id:'dash',  label:'Dashboard',           icon:'⚡'},
  {id:'w1',    label:'Week 1',              icon:'🧠'},
  {id:'w2',    label:'Week 2',             icon:'💪'},
    {id:'w3',    label:'Week 3',             icon:'🔬'},
  {id:'w4',    label:'Week 4',             icon:'🎯'},
  {id:'regen', label:'Bonus — Regenerative',icon:'⊕'}
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
