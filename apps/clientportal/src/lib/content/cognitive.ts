import type { Resource } from '../data/schema';

/**
 * Cognitive training resources referenced in the Mind pillar.
 * Components render these as pills / links — no copy in .svelte files.
 */
export const cognitiveResources: Resource[] = [
  { n: 'Duolingo', u: 'https://duolingo.com' },
  { n: 'Lumosity', u: 'https://lumosity.com' }
];

export const cognitiveProtocol = {
  /** Evidence-backed weekly rhythm. */
  weeklyCadence: 'Read at least 10 pages of Begin with the End in Mind every day',
  /** Daily practice that rebuilds sustained attention. */
  dailyReading: '30 minutes uninterrupted long-form reading — no phone, no TV'
};
