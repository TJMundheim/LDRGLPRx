import type { Resource } from '../data/schema';

/**
 * Cognitive training resources referenced in the Mind pillar.
 * Components render these as pills / links — no copy in .svelte files.
 */
export const cognitiveResources: Resource[] = [
  { n: 'Dual N-Back (iOS)', u: 'https://apps.apple.com/us/app/dual-n-back/id507031600' },
  { n: 'Duolingo', u: 'https://duolingo.com' },
  { n: 'Lumosity', u: 'https://lumosity.com' }
];

export const cognitiveProtocol = {
  /** Evidence-backed weekly rhythm. */
  weeklyCadence: '3–4 sessions per week of dual n-back, 15–20 minutes each',
  /** Daily practice that rebuilds sustained attention. */
  dailyReading: '30 minutes uninterrupted long-form reading — no phone, no TV'
};
