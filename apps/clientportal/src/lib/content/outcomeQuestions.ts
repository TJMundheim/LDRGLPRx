/**
 * Maps product/protocol slugs to the outcome domain keys that are relevant
 * for that protocol's weekly check-in. Only ask about domains that the
 * protocol is designed to move.
 */

import type { OutcomeDomainKey } from '../data/schema';

export interface OutcomeDomainMeta {
  key: OutcomeDomainKey;
  label: string;
  lowLabel: string;
  highLabel: string;
}

export const DOMAIN_META: Record<OutcomeDomainKey, OutcomeDomainMeta> = {
  bloat:         { key: 'bloat',         label: 'Bloating',       lowLabel: 'None',     highLabel: 'Severe' },
  stool_quality: { key: 'stool_quality', label: 'Stool quality',  lowLabel: 'Poor',     highLabel: 'Optimal' },
  brain_fog:     { key: 'brain_fog',     label: 'Brain fog',      lowLabel: 'None',     highLabel: 'Severe' },
  mood:          { key: 'mood',          label: 'Mood',           lowLabel: 'Low',      highLabel: 'Great' },
  sleep_quality: { key: 'sleep_quality', label: 'Sleep quality',  lowLabel: 'Poor',     highLabel: 'Excellent' },
  energy:        { key: 'energy',        label: 'Energy',         lowLabel: 'Depleted', highLabel: 'High' },
  focus:         { key: 'focus',         label: 'Focus',          lowLabel: 'Scattered',highLabel: 'Sharp' },
  joint_pain:    { key: 'joint_pain',    label: 'Joint pain',     lowLabel: 'None',     highLabel: 'Severe' },
  libido:        { key: 'libido',        label: 'Libido',         lowLabel: 'Low',      highLabel: 'Strong' },
};

/** Product slug → relevant outcome domain keys */
export const PROTOCOL_OUTCOME_DOMAINS: Record<string, OutcomeDomainKey[]> = {
  'biome-axis-forge': ['bloat', 'stool_quality', 'brain_fog', 'mood', 'sleep_quality', 'energy'],
  biomeaxisforge:     ['bloat', 'stool_quality', 'brain_fog', 'mood', 'sleep_quality', 'energy'],
  sleeprestore:       ['sleep_quality', 'energy', 'mood'],
  armorvita:          ['energy', 'mood', 'focus'],
  neurobridge:        ['brain_fog', 'mood', 'energy', 'focus'],
  'rpa':              ['joint_pain', 'energy'],
  semaglutide:        ['energy', 'mood'],
  tirzepatide:        ['energy', 'mood'],
  'trt-male':         ['energy', 'libido', 'mood', 'focus'],
  'hrt-female':       ['mood', 'sleep_quality', 'energy', 'libido'],
  enclomiphene:       ['energy', 'libido', 'mood'],
  'ketamine-troches': ['mood', 'energy', 'focus'],
  semax:              ['brain_fog', 'focus', 'energy'],
  selank:             ['mood', 'brain_fog', 'focus'],
  cerebrolysin:       ['brain_fog', 'focus', 'mood'],
  dsip:               ['sleep_quality', 'energy'],
  epitalon:           ['sleep_quality', 'energy', 'mood'],
  'methylene-blue':   ['brain_fog', 'energy', 'focus'],
  'stack-foundation': ['energy', 'mood', 'focus'],
  'stack-focus':      ['brain_fog', 'focus', 'energy'],
  'stack-recovery':   ['sleep_quality', 'energy'],
  'stack-longevity':  ['energy', 'mood', 'focus'],
};

/** Derive the unique, de-duped set of domains for the active protocol slugs. */
export function getDomainsForProtocols(slugs: string[]): OutcomeDomainMeta[] {
  const seen = new Set<OutcomeDomainKey>();
  const result: OutcomeDomainMeta[] = [];
  for (const slug of slugs) {
    for (const key of PROTOCOL_OUTCOME_DOMAINS[slug] ?? []) {
      if (!seen.has(key)) {
        seen.add(key);
        result.push(DOMAIN_META[key]);
      }
    }
  }
  // Fallback: show core domains if nothing matched
  if (result.length === 0) {
    const defaults: OutcomeDomainKey[] = ['energy', 'mood', 'brain_fog', 'sleep_quality'];
    for (const key of defaults) {
      result.push(DOMAIN_META[key]);
    }
  }
  return result;
}
