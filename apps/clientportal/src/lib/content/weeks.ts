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
  {id:'morn',  label:'Morning Protocol',   icon:'🌅'},
  {id:'w2',    label:'Week 2',             icon:'💪'},
  {id:'nutr',  label:'Nutrition & Fasting',icon:'🥩'},
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
    bg: '#085041', ac: '#1D9E75',
    label: 'Week 1',
    sub: 'Mitigate · Muscle · Mind · Motivate — baselines, audit & first actions',
    focus: 'Mitigate (deep focus): 12-Factor Audit',
    pillarId: 'mitigate',
    primaryHeadline: 'Remove the 15 factors stealing your brain & body.',
    deckQuote: 'We start by removing what\'s working against you. Your personal 15-factor audit.',
  },
  2: {
    bg: '#7A2E14', ac: '#E05C2A',
    label: 'Week 2',
    sub: 'Mitigate · Muscle · Mind · Motivate — actions in motion, tracking begins',
    focus: 'Muscle (deep focus): Movement & Protein',
    pillarId: 'muscle',
    primaryHeadline: 'Rebuild the body that powers the brain.',
    deckQuote: 'We build the body that supports the brain. Morning protocol. Outdoor. Fasted.',
  },
  3: {
    bg: '#0C447C', ac: '#2E7FD9',
    label: 'Week 3',
    sub: 'Mitigate · Muscle · Mind · Motivate — full supplement stack + mid-month check',
    focus: 'Mind (deep focus): Full Supplement Stack',
    pillarId: 'mind',
    primaryHeadline: 'Feed, fuel, and sharpen your cognitive edge.',
    deckQuote: 'We feed the brain. Food quality, supplements, methylation.',
  },
  4: {
    bg: '#3C3489', ac: '#6B5ED4',
    label: 'Week 4',
    sub: 'Mitigate · Muscle · Mind · Motivate — re-audit, progress, Month 2 commitment',
    focus: 'Motivate (deep focus): Identity & Month 2 Vision',
    pillarId: 'motivate',
    primaryHeadline: 'Lock in your identity and daily system.',
    deckQuote: 'By Week 4, you don\'t have a program. You have a system.',
  },
};
