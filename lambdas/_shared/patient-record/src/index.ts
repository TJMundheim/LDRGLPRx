// @my4mlife/patient-record
//
// PURE logic module for the ultralight EMR. NO AWS I/O, no side effects.
// Defines the data model + encounter state machine + DynamoDB key helpers.
// Other Lambdas import this; all persistence lives in the caller.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EncounterState =
  | 'new'
  | 'coordinator-reviewed'
  | 'sent-to-provider'
  | 'script-written'
  | 'fulfilled'
  | 'declined';

export type VisitType = 'async' | 'audio-visual';

export interface ConsentRecord {
  version: string;
  agreed: boolean;
  at: string;
  text?: string;
}

// Tokenized payment references only. NEVER store raw PAN / CVV / expiry here.
export interface CardOnFile {
  stripeCustomerId?: string;
  paymentMethodId?: string;
  setupIntentId?: string;
}

export interface PatientDemographics {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  dob?: string;
  sex?: string;
  state?: string;
}

export interface PatientHistory {
  medications?: string[];
  allergies?: string[];
  conditions?: string[];
  heightIn?: number;
  weightLb?: number;
}

export interface Encounter {
  encounterId: string;
  category: string;
  state: EncounterState;
  visitType: VisitType;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  at: string;
  action: string;
  detail?: string;
  actor?: string;
}

export interface PatientRecord {
  contactId: string;
  demographics: PatientDemographics;
  history?: PatientHistory;
  screeningAnswers?: Record<string, unknown>;
  consents?: Record<string, ConsentRecord>;
  cardOnFile?: CardOnFile;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// State machine (pure)
// ---------------------------------------------------------------------------

// Ordered list of every encounter state.
export const ENCOUNTER_STATES: EncounterState[] = [
  'new',
  'coordinator-reviewed',
  'sent-to-provider',
  'script-written',
  'fulfilled',
  'declined',
];

// States with no outgoing transitions (except declined→new reopen).
export const TERMINAL_STATES = ['fulfilled', 'declined'] as const;

// The linear "happy path" — each state may advance only to its immediate
// successor in this list.
const LINEAR_PATH: EncounterState[] = [
  'new',
  'coordinator-reviewed',
  'sent-to-provider',
  'script-written',
  'fulfilled',
];

function isTerminal(state: EncounterState): boolean {
  return (TERMINAL_STATES as readonly EncounterState[]).includes(state);
}

// Whether an encounter may move `from` -> `to`.
//   - linear forward path: each state only to its immediate successor
//   - 'declined' reachable from ANY non-terminal state
//   - 'fulfilled' is fully terminal — no outgoing transitions at all
//   - 'declined' has exactly one outgoing transition: declined → new (reopen)
//   - no self-transitions, no backward transitions on the linear path
export function canTransition(from: EncounterState, to: EncounterState): boolean {
  if (from === to) return false;

  // fulfilled is fully terminal.
  if (from === 'fulfilled') return false;

  // declined may only reopen to new.
  if (from === 'declined') return to === 'new';

  // Any non-terminal state can be declined.
  if (to === 'declined') return true;

  const fromIdx = LINEAR_PATH.indexOf(from);
  const toIdx = LINEAR_PATH.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;

  // Only the immediate successor along the linear path.
  return toIdx === fromIdx + 1;
}

// ---------------------------------------------------------------------------
// Visit type
// ---------------------------------------------------------------------------

// Testosterone/ED is the only category requiring an audio-visual encounter;
// everything else defaults to async store-and-forward review.
export function forcedVisitType(category: string): VisitType {
  return category === 'testosterone-ed' ? 'audio-visual' : 'async';
}

// ---------------------------------------------------------------------------
// Consent constants
// ---------------------------------------------------------------------------

export const CONSENT_NPP_V1 = 'consent-npp-v1';
export const CONSENT_PHI_AUTH_V1 = 'consent-phi-auth-v1';

// ---------------------------------------------------------------------------
// DynamoDB key helpers (single-table design: PK = contactId, SK = sk)
// ---------------------------------------------------------------------------

// Sort key for the patient's root record item.
export const RECORD_SK = 'record';

// Sort key for an encounter item.
export function encounterSk(encounterId: string): string {
  return `encounter#${encounterId}`;
}

// Sort key for an audit-log item. Sorts chronologically by ISO timestamp,
// with a zero-padded sequence to break ties within the same instant.
export function auditSk(iso: string, seq: number): string {
  return `audit#${iso}#${String(seq).padStart(4, '0')}`;
}
