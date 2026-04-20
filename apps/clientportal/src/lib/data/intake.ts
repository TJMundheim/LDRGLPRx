/**
 * Intake questionnaire — type definitions.
 * All types here are pure data; no I/O or side effects.
 */

// ---------------------------------------------------------------------------
// Tier recommendation
// ---------------------------------------------------------------------------
export type TierRec =
  | 'foundation'    // 1–2 triggered domains
  | 'optimization'  // 3–4 triggered domains
  | 'longevity'     // Genesis RPA candidacy + ≥3 domains
  | 'concierge';    // Complex / multi-chronic / heavy family history

// ---------------------------------------------------------------------------
// Trigger rule — attached to questions or answer options
// ---------------------------------------------------------------------------
export interface TriggerRule {
  /** Minimum severity score (0–3) that must be met (severity/yesno/number questions). */
  threshold?: number;
  /** Product slugs to recommend when this trigger fires. */
  productSlugs?: string[];
  /** Lab-panel slugs to recommend when this trigger fires. */
  labSlugs?: string[];
  /** Minimum tier recommendation when this trigger fires. */
  tierRecommendation?: TierRec;
  /** Escalate to clinician review when this trigger fires. */
  clinicianFlag?: boolean;
  /** Domain tag used for topPriorities aggregation. */
  tag?: string;
}

// ---------------------------------------------------------------------------
// Numeric-trigger wrapper for 'number' questions
// ---------------------------------------------------------------------------
export type NumericRule =
  | { rule: 'gte';     value: number;                  triggers: TriggerRule[] }
  | { rule: 'lte';     value: number;                  triggers: TriggerRule[] }
  | { rule: 'between'; value: number; value2: number;  triggers: TriggerRule[] };

// ---------------------------------------------------------------------------
// Question discriminated union
// ---------------------------------------------------------------------------

export interface SeverityQuestion {
  type: 'severity';
  id: string;
  prompt: string;
  helpText?: string;
  /** triggers[n] fires when answer value ≥ threshold in the trigger rule */
  triggers: TriggerRule[];
}

export interface YesNoQuestion {
  type: 'yesno';
  id: string;
  prompt: string;
  helpText?: string;
  /** triggers fire when answer is true (yes) */
  triggers: TriggerRule[];
}

export interface MultiSelectOption {
  value: string;
  label: string;
  triggers?: TriggerRule[];
}

export interface MultiSelectQuestion {
  type: 'multiselect';
  id: string;
  prompt: string;
  options: MultiSelectOption[];
}

export interface SingleSelectOption {
  value: string;
  label: string;
  triggers?: TriggerRule[];
}

export interface SingleSelectQuestion {
  type: 'singleselect';
  id: string;
  prompt: string;
  options: SingleSelectOption[];
}

export interface NumberQuestion {
  type: 'number';
  id: string;
  prompt: string;
  unit?: string;
  min?: number;
  max?: number;
  numericRules?: NumericRule[];
}

export interface TextQuestion {
  type: 'text';
  id: string;
  prompt: string;
  helpText?: string;
  /** Free text — no triggers. */
}

export type IntakeQuestion =
  | SeverityQuestion
  | YesNoQuestion
  | MultiSelectQuestion
  | SingleSelectQuestion
  | NumberQuestion
  | TextQuestion;

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------
export interface IntakeSection {
  id: string;
  title: string;
  subtitle?: string;
  questions: IntakeQuestion[];
}

// ---------------------------------------------------------------------------
// Answer
// ---------------------------------------------------------------------------
export interface IntakeAnswer {
  questionId: string;
  value: number | string | string[] | boolean;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------
export interface IntakeResult {
  triggeredProducts: { slug: string; reasons: string[] }[];
  triggeredLabs: { slug: string; reasons: string[] }[];
  recommendedTier: TierRec;
  tierRationale: string;
  clinicianFlags: { questionId: string; reason: string }[];
  /** Domains ranked by cumulative severity, highest first. */
  topPriorities: { domain: string; severity: number }[];
  /** 2–3 sentence plain-language reflection — no diagnose/treat/cure language. */
  summary: string;
}
