/** Top-level navigation tab. */
export interface Tab {
  id: string;
  label: string;
  icon: string;
}

export const tabs: Tab[] = [
  {id:'dash',  label:'Dashboard',           icon:'⚡'},
  {id:'w1',    label:'Week 1 — Mitigate',   icon:'🧠'},
  {id:'morn',  label:'Morning Protocol',    icon:'🌅'},
  {id:'w2',    label:'Week 2 — Muscle',     icon:'💪'},
  {id:'nutr',  label:'Nutrition & Fasting', icon:'🥩'},
  {id:'w3',    label:'Week 3 — Mind',       icon:'🔬'},
  {id:'w4',    label:'Week 4 — Motivate',   icon:'🎯'},
  {id:'regen', label:'Bonus — Regenerative',icon:'⊕'}
];

export interface WeekMeta {
  bg: string;
  ac: string;
  label: string;
  sub: string;
  focus: string;
}

export const weekMeta: Record<1 | 2 | 3 | 4, WeekMeta> = {
  1: {bg:'#085041', ac:'#1D9E75', label:'Week 1 — All 4 Pillars Begin Today',
      sub:'Mitigate · Muscle · Mind · Motivate — baselines, audit & first actions',
      focus:'Mitigate (deep focus): 12-Factor Audit'},
  2: {bg:'#7A2E14', ac:'#E05C2A', label:'Week 2 — Build the Foundation',
      sub:'Mitigate · Muscle · Mind · Motivate — actions in motion, tracking begins',
      focus:'Muscle (deep focus): Movement & Protein'},
  3: {bg:'#0C447C', ac:'#2E7FD9', label:'Week 3 — Deepen the Work',
      sub:'Mitigate · Muscle · Mind · Motivate — full supplement stack + mid-month check',
      focus:'Mind (deep focus): Full Supplement Stack'},
  4: {bg:'#3C3489', ac:'#6B5ED4', label:'Week 4 — Integration & Identity',
      sub:'Mitigate · Muscle · Mind · Motivate — re-audit, progress, Month 2 commitment',
      focus:'Motivate (deep focus): Identity & Month 2 Vision'}
};
