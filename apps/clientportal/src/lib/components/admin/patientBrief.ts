/**
 * patientBrief — pure parse/serialize helpers for coordinator pre-call briefs
 * and plans-of-action attached to a PatientRecord encounter.
 *
 * No network calls, no Svelte state — these are plain functions so they can
 * be unit tested directly and reused from PatientsAdmin.svelte.
 */

export interface AssessmentReadoutItem {
  category: string;
  /** The model may emit a numeric score or a band label ("high"). */
  score: number | string;
  note: string;
}

export interface RecommendedLane {
  lane: string;
  rationale: string;
  visit_type: string;
  /** A display string the brief prompt fixes per lane ("free", "$249") — not a
   *  number to format. Render it verbatim; never prefix a currency symbol. */
  price: number | string;
}

export interface Brief {
  summary: string;
  why_now: string;
  assessment_readout: AssessmentReadoutItem[];
  red_flags: string[];
  recommended_lanes: RecommendedLane[];
  questions_to_ask: string[];
  suggested_plan_outline: string[];
}

export interface PlanStep {
  step: string;
  why: string;
  link: string;
}

export interface PlanCta {
  label: string;
  url: string;
}

export interface Plan {
  subject: string;
  greeting: string;
  summary_of_call: string;
  plan_steps: PlanStep[];
  next_step_cta: PlanCta;
  disclaimer: string;
}

function safeJsonParse(json: string): unknown | undefined {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Parse a Brief from the AWSJSON `json` field on a BriefAdmin. Returns null
 * on missing input, malformed JSON, or a shape that isn't a brief — never
 * throws.
 */
export function parseBrief(json: string | null | undefined): Brief | null {
  if (!json) return null;
  const parsed = safeJsonParse(json);
  if (!isRecord(parsed)) return null;
  if (typeof parsed.summary !== 'string') return null;

  return {
    summary: parsed.summary,
    why_now: typeof parsed.why_now === 'string' ? parsed.why_now : '',
    assessment_readout: Array.isArray(parsed.assessment_readout)
      ? (parsed.assessment_readout as AssessmentReadoutItem[])
      : [],
    red_flags: Array.isArray(parsed.red_flags) ? (parsed.red_flags as string[]) : [],
    recommended_lanes: Array.isArray(parsed.recommended_lanes)
      ? (parsed.recommended_lanes as RecommendedLane[])
      : [],
    questions_to_ask: Array.isArray(parsed.questions_to_ask)
      ? (parsed.questions_to_ask as string[])
      : [],
    suggested_plan_outline: Array.isArray(parsed.suggested_plan_outline)
      ? (parsed.suggested_plan_outline as string[])
      : [],
  };
}

/**
 * Parse a Plan from the AWSJSON `json` field on a PlanAdmin. Returns null on
 * missing input, malformed JSON, or a shape that isn't a plan — never
 * throws.
 */
export function parsePlan(json: string | null | undefined): Plan | null {
  if (!json) return null;
  const parsed = safeJsonParse(json);
  if (!isRecord(parsed)) return null;
  if (typeof parsed.subject !== 'string') return null;

  const cta = isRecord(parsed.next_step_cta) ? parsed.next_step_cta : {};

  return {
    subject: parsed.subject,
    greeting: typeof parsed.greeting === 'string' ? parsed.greeting : '',
    summary_of_call: typeof parsed.summary_of_call === 'string' ? parsed.summary_of_call : '',
    plan_steps: Array.isArray(parsed.plan_steps) ? (parsed.plan_steps as PlanStep[]) : [],
    next_step_cta: {
      label: typeof cta.label === 'string' ? cta.label : '',
      url: typeof cta.url === 'string' ? cta.url : '',
    },
    disclaimer: typeof parsed.disclaimer === 'string' ? parsed.disclaimer : '',
  };
}

/** A blank, well-formed Plan for the coordinator to fill in or draft over. */
export function emptyPlan(): Plan {
  return {
    subject: '',
    greeting: '',
    summary_of_call: '',
    plan_steps: [],
    next_step_cta: { label: '', url: '' },
    disclaimer: '',
  };
}

/** Serialize a Plan for the AWSJSON `planJson` mutation input. */
export function planToJson(plan: Plan): string {
  return JSON.stringify(plan);
}

/**
 * Find the most recent item matching `encounterId` in an array. Items are
 * assumed to be in append (chronological) order, as returned by the API —
 * so "latest" is the last matching entry, not a sort by a timestamp field
 * that isn't guaranteed to exist on every T.
 */
export function latestFor<T extends { encounterId: string }>(
  items: T[],
  encounterId: string,
): T | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].encounterId === encounterId) return items[i];
  }
  return undefined;
}
