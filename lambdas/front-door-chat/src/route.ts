// Deterministic exit routing from the visitor's QUESTION. The model still writes
// the answer; this only decides which of the two doors the answer leaves through,
// so the same question always gets the same door. Returns null to keep the model's.
import type { Exit, GuardResult, Link } from './guard';

const SITE = 'https://my4mlife.com';

// Personal health details volunteered in the chat: always the assessment.
const PERSONAL = /\b(my name is|dob\b|date of birth|\d{1,2}\/\d{1,2}\/\d{2,4}|a1c|\d+\s?(mg|mcg|ml)\b|(?<!should )(?<!can )(?<!do )i take\b|i(?:'m| am) on\b|my labs?\b)/i;

// Prescription, price, visit, comparison, booking, paperwork: always the free call.
const CONSULT = /\b(prescri\w*|rx\b|medication|ingredients?|what(?:'s| is) in\b|formula|dos(?:e|es|age|ing)|price|cost|how much|\$\s?\d|insurance|refund|book (?:a|an|me|my)\b|booking|schedule|appointment|visit\b|asynchronous|async\b|consent|card\b|charged?|better than|compare|versus|\bvs\b|hims\b|\bro\b|semaglutide|tirzepatide|testosterone|trt\b|hrt\b)/i;

export function exitFor(message: string): Exit {
  if (PERSONAL.test(message)) return 'assessment';
  if (CONSULT.test(message)) return 'consult';
  return null;
}

const DOOR: Record<'assessment' | 'consult', Link> = {
  assessment: { label: 'Take the MindSpan assessment', url: `${SITE}/assessment` },
  consult: { label: 'Book the free care coordinator call', url: `${SITE}/consult` },
};

/** Swap the exit link for the routed one; a blocked reply keeps its fallback door. */
export function applyRoute(result: GuardResult, message: string): GuardResult {
  const routed = exitFor(message);
  if (!routed || result.blocked || routed === result.exit) return result;
  const pages = result.links.filter((l) => !/\/(assessment|consult)$/.test(l.url)).slice(0, 1);
  return { ...result, exit: routed, links: [...pages, DOOR[routed]] };
}
