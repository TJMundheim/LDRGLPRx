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
