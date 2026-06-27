/**
 * Typed GraphQL operation functions for the LDRGLPRx AppSync API.
 *
 * Each function builds the document inline and delegates to the shared client.
 * Import the singleton `gql` client or pass your own via the second argument.
 */

import { gql as defaultClient, appsyncClient } from './client.js';
import type { ClientOptions } from './client.js';

// ─── Type imports (generated) ─────────────────────────────────────────────────
// Re-exported so callers import from one place.
export type {
  AppConfig,
  Tier,
  TierCatalog,
  Program,
  WeeklyContent,
  UserProfile,
  UpsertMyProfileInput,
  DiscoveryResponse,
  SubmitDiscoveryInput,
  Outcome,
  CreateOutcomeInput,
  UserProfileConnection,
  OutcomeConnection,
  AdminQueueItem,
  AdminQueueItemConnection,
  UpdateAdminQueueItemInput,
  QueueStatus,
  Event,
  EventRSVP,
  RSVPStatus,
  AdherenceEntry,
  RecordAdherenceInput,
} from './generated.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Client = ReturnType<typeof appsyncClient>;

function client(override?: ClientOptions): Client {
  return override ? appsyncClient(override) : defaultClient as unknown as Client;
}

// ─── AppConfig ────────────────────────────────────────────────────────────────

export async function getAppConfig(key: string, opts?: ClientOptions) {
  return client(opts)<{ getAppConfig: import('./generated.js').AppConfig | null }>({
    query: `
      query GetAppConfig($key: ID!) {
        getAppConfig(key: $key) { key valueJson updatedAt }
      }
    `,
    variables: { key },
  });
}

// ─── Tiers ────────────────────────────────────────────────────────────────────

export async function listTiers(opts?: ClientOptions) {
  return client(opts)<{ listTiers: import('./generated.js').Tier[] }>({
    query: `
      query ListTiers {
        listTiers {
          id name tagline monthlyUSD annualUSD onboardingFeeUSD oneTimePriceUSD
          kind includedProductSlugs features description idealFor updatedAt
        }
      }
    `,
  });
}

// ─── Program ──────────────────────────────────────────────────────────────────

export async function getProgram(id: string, opts?: ClientOptions) {
  return client(opts)<{ getProgram: import('./generated.js').Program | null }>({
    query: `
      query GetProgram($id: ID!) {
        getProgram(id: $id) {
          id name description updatedAt
          pillars { month pillar title summary objectives }
        }
      }
    `,
    variables: { id },
  });
}

// ─── Weekly content ───────────────────────────────────────────────────────────

export async function listWeeklyContent(
  programId: string,
  month?: import('./generated.js').ProgramMonth,
  opts?: ClientOptions,
) {
  return client(opts)<{ listWeeklyContent: import('./generated.js').WeeklyContent[] }>({
    query: `
      query ListWeeklyContent($programId: ID!, $month: ProgramMonth) {
        listWeeklyContent(programId: $programId, month: $month) {
          id programId month week pillar title bodyMarkdown updatedAt
          resources { name url }
        }
      }
    `,
    variables: { programId, month },
  });
}

// ─── UserProfile ──────────────────────────────────────────────────────────────

const PROFILE_FIELDS = `
  id primaryEmail secondaryEmail firstName lastName displayName
  dob phone tier currentMonth currentPillar createdAt updatedAt
  workbookJson workbookUpdatedAt
  hasActiveSubscription stripeCustomerId
  auditTop3 auditCompletedAt intakeAnswers
  eatingWindowStart eatingWindowEnd weeklyZoomAttestedAt weeklyZoomAttestedEventId
  bonusTargetsEnabled glpStatus weekUnlocked
  address { line1 line2 city region postalCode country }
  prefs { marketingOptIn smsOptIn timezone units }
`;

export async function getMyProfile(opts?: ClientOptions) {
  return client(opts)<{ getMyProfile: import('./generated.js').UserProfile }>({
    query: `query GetMyProfile { getMyProfile { ${PROFILE_FIELDS} } }`,
  });
}

export async function upsertMyProfile(
  input: import('./generated.js').UpsertMyProfileInput,
  opts?: ClientOptions,
) {
  return client(opts)<{ upsertMyProfile: import('./generated.js').UserProfile }>({
    query: `
      mutation UpsertMyProfile($input: UpsertMyProfileInput!) {
        upsertMyProfile(input: $input) { ${PROFILE_FIELDS} }
      }
    `,
    variables: { input },
  });
}

export async function updateSecondaryEmail(
  secondaryEmail: string | null,
  opts?: ClientOptions,
) {
  return client(opts)<{ updateSecondaryEmail: import('./generated.js').UserProfile }>({
    query: `
      mutation UpdateSecondaryEmail($secondaryEmail: AWSEmail) {
        updateSecondaryEmail(secondaryEmail: $secondaryEmail) { ${PROFILE_FIELDS} }
      }
    `,
    variables: { secondaryEmail },
  });
}

// ─── Discovery ────────────────────────────────────────────────────────────────

export async function submitDiscovery(
  input: import('./generated.js').SubmitDiscoveryInput,
  opts?: ClientOptions,
) {
  return client(opts)<{ submitDiscovery: import('./generated.js').DiscoveryResponse }>({
    query: `
      mutation SubmitDiscovery($input: SubmitDiscoveryInput!) {
        submitDiscovery(input: $input) {
          id owner submittedAt createdAt updatedAt
          answers { questionId valueJson }
          result {
            recommendedTier tierRationale triggeredProductSlugs triggeredLabSlugs summary
            topPriorities { domain severity }
            clinicianFlags { questionId reason }
          }
        }
      }
    `,
    variables: { input },
  });
}

// ─── Outcomes ─────────────────────────────────────────────────────────────────

const OUTCOME_FIELDS = `
  id owner weekISO month week freeText submittedAt createdAt updatedAt
  scores { domain score }
`;

export async function createOutcome(
  input: import('./generated.js').CreateOutcomeInput,
  opts?: ClientOptions,
) {
  return client(opts)<{ createOutcome: import('./generated.js').Outcome }>({
    query: `
      mutation CreateOutcome($input: CreateOutcomeInput!) {
        createOutcome(input: $input) { ${OUTCOME_FIELDS} }
      }
    `,
    variables: { input },
  });
}

export async function listMyOutcomes(
  limit?: number,
  nextToken?: string,
  opts?: ClientOptions,
) {
  return client(opts)<{ listMyOutcomes: import('./generated.js').OutcomeConnection }>({
    query: `
      query ListMyOutcomes($limit: Int, $nextToken: String) {
        listMyOutcomes(limit: $limit, nextToken: $nextToken) {
          nextToken
          items { ${OUTCOME_FIELDS} }
        }
      }
    `,
    variables: { limit, nextToken },
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function adminListUsers(
  limit?: number,
  nextToken?: string,
  opts?: ClientOptions,
) {
  return client(opts)<{ adminListUsers: import('./generated.js').UserProfileConnection }>({
    query: `
      query AdminListUsers($limit: Int, $nextToken: String) {
        adminListUsers(limit: $limit, nextToken: $nextToken) {
          nextToken
          items { ${PROFILE_FIELDS} }
        }
      }
    `,
    variables: { limit, nextToken },
  });
}

export async function adminGetProfile(userId: string, opts?: ClientOptions) {
  return client(opts)<{ adminGetProfile: import('./generated.js').UserProfile | null }>({
    query: `
      query AdminGetProfile($userId: ID!) {
        adminGetProfile(userId: $userId) { ${PROFILE_FIELDS} }
      }
    `,
    variables: { userId },
  });
}

// ─── Admin Queue ──────────────────────────────────────────────────────────────

const QUEUE_FIELDS = `
  id kind patientId patientLabel summary draftedAction createdAt urgency status updatedAt
`;

export async function adminListQueue(
  limit?: number,
  nextToken?: string,
  opts?: ClientOptions,
) {
  return client(opts)<{ adminListQueue: import('./generated.js').AdminQueueItemConnection }>({
    query: `
      query AdminListQueue($limit: Int, $nextToken: String) {
        adminListQueue(limit: $limit, nextToken: $nextToken) {
          nextToken
          items { ${QUEUE_FIELDS} }
        }
      }
    `,
    variables: { limit, nextToken },
  });
}

export async function updateAdminQueueItem(
  input: import('./generated.js').UpdateAdminQueueItemInput,
  opts?: ClientOptions,
) {
  return client(opts)<{ updateAdminQueueItem: import('./generated.js').AdminQueueItem }>({
    query: `
      mutation UpdateAdminQueueItem($input: UpdateAdminQueueItemInput!) {
        updateAdminQueueItem(input: $input) { ${QUEUE_FIELDS} }
      }
    `,
    variables: { input },
  });
}

// ─── Proteges ─────────────────────────────────────────────────────────────────

export interface Protege {
  contactId: string;
  email: string;
  firstName: string | null;
  phone: string | null;
  createdAt: string;
  daysAsProtege: number;
}

export interface ProtegesPage {
  items: Protege[];
  nextToken?: string | null;
}

export async function listProteges(
  limit?: number,
  nextToken?: string,
  opts?: ClientOptions,
) {
  return client(opts)<{ listProteges: ProtegesPage }>({
    query: `
      query ListProteges($limit: Int, $nextToken: String) {
        listProteges(limit: $limit, nextToken: $nextToken) {
          nextToken
          items { contactId email firstName phone createdAt daysAsProtege }
        }
      }
    `,
    variables: { limit, nextToken },
  });
}

export async function adminListOutcomes(
  userId?: string,
  limit?: number,
  nextToken?: string,
  opts?: ClientOptions,
) {
  return client(opts)<{ adminListOutcomes: import('./generated.js').OutcomeConnection }>({
    query: `
      query AdminListOutcomes($userId: ID, $limit: Int, $nextToken: String) {
        adminListOutcomes(userId: $userId, limit: $limit, nextToken: $nextToken) {
          nextToken
          items { ${OUTCOME_FIELDS} }
        }
      }
    `,
    variables: { userId, limit, nextToken },
  });
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function upcomingEvents(limit?: number, opts?: ClientOptions) {
  return client(opts)<{ upcomingEvents: import('./generated.js').Event[] }>({
    query: `
      query UpcomingEvents($limit: Int) {
        upcomingEvents(limit: $limit) {
          eventId type title startsAt durationMin joinUrl status
        }
      }
    `,
    variables: { limit },
  });
}

export interface AdminEvent {
  eventId: string;
  type: string;
  title: string;
  startsAt: string;
  durationMin: number;
  joinUrl: string;
  status: string;
  recordingUrl?: string | null;
}

export async function listEventsAdmin(limit?: number, opts?: ClientOptions) {
  return client(opts)<{ listEventsAdmin: AdminEvent[] }>({
    query: `
      query ListEventsAdmin($limit: Int) {
        listEventsAdmin(limit: $limit) {
          eventId type title startsAt durationMin joinUrl status recordingUrl
        }
      }
    `,
    variables: { limit },
  });
}

export async function updateEventRecordingUrl(
  args: { eventId: string; recordingUrl: string },
  opts?: ClientOptions,
) {
  return client(opts)<{ updateEventRecordingUrl: AdminEvent | null }>({
    query: `
      mutation UpdateEventRecordingUrl($eventId: ID!, $recordingUrl: String!) {
        updateEventRecordingUrl(eventId: $eventId, recordingUrl: $recordingUrl) {
          eventId type title startsAt durationMin joinUrl status recordingUrl
        }
      }
    `,
    variables: args,
  });
}

// ─── EMR — PatientRecord / Encounter ─────────────────────────────────────────

/** Parse an AWSJSON scalar that AppSync returns as a JSON string (or leave objects untouched). */
function parseAwsJson(value: unknown): unknown {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export interface EncounterAdmin {
  encounterId: string;
  category: string;
  state: string;
  visitType: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientRecordAdmin {
  contactId: string;
  demographics: unknown;
  history?: unknown;
  screeningAnswers?: unknown;
  consents?: unknown;
  cardOnFile?: unknown;
  encounters?: EncounterAdmin[];
  audit?: unknown[];
  createdAt: string;
  updatedAt: string;
}

/** Parse all AWSJSON blob fields on a raw PatientRecordAdmin response. */
function parsePatientRecord(raw: PatientRecordAdmin): PatientRecordAdmin {
  return {
    ...raw,
    demographics: parseAwsJson(raw.demographics),
    history: parseAwsJson(raw.history),
    screeningAnswers: parseAwsJson(raw.screeningAnswers),
    consents: parseAwsJson(raw.consents),
    cardOnFile: parseAwsJson(raw.cardOnFile),
    audit: Array.isArray(raw.audit)
      ? raw.audit.map((e: any) => ({ ...e, detail: parseAwsJson(e?.detail) }))
      : raw.audit,
  };
}

const ENCOUNTER_FIELDS = `encounterId category state visitType createdAt updatedAt`;

const PATIENT_RECORD_FIELDS = `
  contactId demographics history screeningAnswers consents cardOnFile
  encounters { ${ENCOUNTER_FIELDS} }
  audit { at action detail actor }
  createdAt updatedAt
`;

export async function listPatientRecordsAdmin(
  limit?: number,
  opts?: ClientOptions,
): Promise<{ listPatientRecordsAdmin: PatientRecordAdmin[] }> {
  const raw = await client(opts)<{ listPatientRecordsAdmin: PatientRecordAdmin[] }>({
    query: `
      query ListPatientRecordsAdmin($limit: Int) {
        listPatientRecordsAdmin(limit: $limit) { ${PATIENT_RECORD_FIELDS} }
      }
    `,
    variables: { limit },
  });
  return { listPatientRecordsAdmin: raw.listPatientRecordsAdmin.map(parsePatientRecord) };
}

export async function getPatientRecordAdmin(
  contactId: string,
  opts?: ClientOptions,
): Promise<{ getPatientRecordAdmin: PatientRecordAdmin | null }> {
  const raw = await client(opts)<{ getPatientRecordAdmin: PatientRecordAdmin | null }>({
    query: `
      query GetPatientRecordAdmin($contactId: ID!) {
        getPatientRecordAdmin(contactId: $contactId) { ${PATIENT_RECORD_FIELDS} }
      }
    `,
    variables: { contactId },
  });
  return {
    getPatientRecordAdmin: raw.getPatientRecordAdmin
      ? parsePatientRecord(raw.getPatientRecordAdmin)
      : null,
  };
}

export async function updateEncounterStateAdmin(
  input: { contactId: string; encounterId: string; toState: string },
  opts?: ClientOptions,
): Promise<{ updateEncounterStateAdmin: EncounterAdmin | null }> {
  return client(opts)<{ updateEncounterStateAdmin: EncounterAdmin | null }>({
    query: `
      mutation UpdateEncounterStateAdmin($contactId: ID!, $encounterId: ID!, $toState: String!) {
        updateEncounterStateAdmin(contactId: $contactId, encounterId: $encounterId, toState: $toState) { ${ENCOUNTER_FIELDS} }
      }
    `,
    variables: { contactId: input.contactId, encounterId: input.encounterId, toState: input.toState },
  });
}

// ─── ChargeEncounterAdmin ─────────────────────────────────────────────────────

export type ChargeResultAdmin = {
  ok: boolean;
  kind?: string;
  id?: string;
  status?: string;
  amountCents?: number;
  error?: string;
  code?: string;
};

export async function chargeEncounterAdmin(
  input: { contactId: string; encounterId: string; amountCents: number; billingType: string; interval?: string; label?: string },
  opts?: ClientOptions,
): Promise<{ chargeEncounterAdmin: ChargeResultAdmin }> {
  return client(opts)<{ chargeEncounterAdmin: ChargeResultAdmin }>({
    query: `
      mutation ChargeEncounterAdmin($contactId: ID!, $encounterId: ID!, $amountCents: Int!, $billingType: String!, $interval: String, $label: String) {
        chargeEncounterAdmin(contactId: $contactId, encounterId: $encounterId, amountCents: $amountCents, billingType: $billingType, interval: $interval, label: $label) {
          ok kind id status amountCents error code
        }
      }
    `,
    variables: {
      contactId: input.contactId,
      encounterId: input.encounterId,
      amountCents: input.amountCents,
      billingType: input.billingType,
      interval: input.interval,
      label: input.label,
    },
  });
}

// ─── Adherence ────────────────────────────────────────────────────────────────

const ADHERENCE_FIELDS = `userId dateActionId completedAt value notes`;

export async function recordAdherence(
  input: import('./generated.js').RecordAdherenceInput,
  opts?: ClientOptions,
) {
  return client(opts)<{ recordAdherence: import('./generated.js').AdherenceEntry | null }>({
    query: `
      mutation RecordAdherence($input: RecordAdherenceInput!) {
        recordAdherence(input: $input) { ${ADHERENCE_FIELDS} }
      }
    `,
    variables: { input },
  });
}

export async function listMyAdherence(
  dateFrom: string,
  dateTo: string,
  opts?: ClientOptions,
) {
  return client(opts)<{ listMyAdherence: import('./generated.js').AdherenceEntry[] }>({
    query: `
      query ListMyAdherence($dateFrom: AWSDate!, $dateTo: AWSDate!) {
        listMyAdherence(dateFrom: $dateFrom, dateTo: $dateTo) { ${ADHERENCE_FIELDS} }
      }
    `,
    variables: { dateFrom, dateTo },
  });
}

export async function rsvpEvent(
  eventId: string,
  status: import('./generated.js').RSVPStatus,
  opts?: ClientOptions,
) {
  return client(opts)<{ rsvpEvent: import('./generated.js').EventRSVP }>({
    query: `
      mutation RsvpEvent($eventId: ID!, $status: RSVPStatus!) {
        rsvpEvent(eventId: $eventId, status: $status) {
          eventId contactId rsvpedAt status
        }
      }
    `,
    variables: { eventId, status },
  });
}
