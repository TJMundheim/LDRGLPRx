export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  AWSDate: { input: string; output: string; }
  AWSDateTime: { input: string; output: string; }
  AWSEmail: { input: string; output: string; }
  AWSIPAddress: { input: string; output: string; }
  AWSJSON: { input: string; output: string; }
  AWSPhone: { input: string; output: string; }
  AWSTime: { input: string; output: string; }
  AWSTimestamp: { input: number; output: number; }
  AWSURL: { input: string; output: string; }
};

export type Address = {
  __typename?: 'Address';
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  line1?: Maybe<Scalars['String']['output']>;
  line2?: Maybe<Scalars['String']['output']>;
  postalCode?: Maybe<Scalars['String']['output']>;
  region?: Maybe<Scalars['String']['output']>;
};

export type AddressInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  line1?: InputMaybe<Scalars['String']['input']>;
  line2?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['String']['input']>;
  region?: InputMaybe<Scalars['String']['input']>;
};

export type AdminQueueItem = {
  __typename?: 'AdminQueueItem';
  createdAt: Scalars['AWSDateTime']['output'];
  draftedAction?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  kind: QueueItemKind;
  patientId: Scalars['ID']['output'];
  patientLabel: Scalars['String']['output'];
  status: QueueStatus;
  summary: Scalars['String']['output'];
  updatedAt: Scalars['AWSDateTime']['output'];
  urgency: QueueUrgency;
};

export type AdminQueueItemConnection = {
  __typename?: 'AdminQueueItemConnection';
  items: Array<AdminQueueItem>;
  nextToken?: Maybe<Scalars['String']['output']>;
};

export type AppConfig = {
  __typename?: 'AppConfig';
  key: Scalars['ID']['output'];
  updatedAt: Scalars['AWSDateTime']['output'];
  valueJson: Scalars['AWSJSON']['output'];
};

export type CreateOutcomeInput = {
  freeText?: InputMaybe<Scalars['String']['input']>;
  month: ProgramMonth;
  scores: Array<OutcomeScoreInput>;
  week: Scalars['Int']['input'];
  weekISO: Scalars['String']['input'];
};

export type DiscoveryAnswer = {
  __typename?: 'DiscoveryAnswer';
  questionId: Scalars['String']['output'];
  valueJson: Scalars['AWSJSON']['output'];
};

export type DiscoveryAnswerInput = {
  questionId: Scalars['String']['input'];
  valueJson: Scalars['AWSJSON']['input'];
};

export type DiscoveryFlag = {
  __typename?: 'DiscoveryFlag';
  questionId: Scalars['String']['output'];
  reason: Scalars['String']['output'];
};

export type DiscoveryPriority = {
  __typename?: 'DiscoveryPriority';
  domain: Scalars['String']['output'];
  severity: Scalars['Float']['output'];
};

export type DiscoveryResponse = {
  __typename?: 'DiscoveryResponse';
  answers: Array<DiscoveryAnswer>;
  createdAt: Scalars['AWSDateTime']['output'];
  id: Scalars['ID']['output'];
  owner: Scalars['ID']['output'];
  result?: Maybe<DiscoveryResult>;
  submittedAt: Scalars['AWSDateTime']['output'];
  updatedAt: Scalars['AWSDateTime']['output'];
};

export type DiscoveryResult = {
  __typename?: 'DiscoveryResult';
  clinicianFlags: Array<DiscoveryFlag>;
  recommendedTier: TierId;
  summary: Scalars['String']['output'];
  tierRationale: Scalars['String']['output'];
  topPriorities: Array<DiscoveryPriority>;
  triggeredLabSlugs: Array<Scalars['String']['output']>;
  triggeredProductSlugs: Array<Scalars['String']['output']>;
};

export type IntakeAnswer = {
  __typename?: 'IntakeAnswer';
  questionId: Scalars['String']['output'];
  valueJson: Scalars['AWSJSON']['output'];
};

export type IntakeAnswerInput = {
  questionId: Scalars['String']['input'];
  valueJson: Scalars['AWSJSON']['input'];
};

export type IntakeForm = {
  __typename?: 'IntakeForm';
  answers: Array<IntakeAnswer>;
  createdAt: Scalars['AWSDateTime']['output'];
  id: Scalars['ID']['output'];
  owner: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  submittedAt?: Maybe<Scalars['AWSDateTime']['output']>;
  updatedAt: Scalars['AWSDateTime']['output'];
  version: Scalars['String']['output'];
};

export type MonthPillar = {
  __typename?: 'MonthPillar';
  month: ProgramMonth;
  objectives: Array<Scalars['String']['output']>;
  pillar: PillarId;
  summary?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type MonthPillarInput = {
  month: ProgramMonth;
  objectives: Array<Scalars['String']['input']>;
  pillar: PillarId;
  summary?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createOutcome: Outcome;
  submitDiscovery: DiscoveryResponse;
  updateAdminQueueItem: AdminQueueItem;
  updateSecondaryEmail: UserProfile;
  upsertAppConfig: AppConfig;
  upsertMyIntakeForm: IntakeForm;
  upsertMyProfile: UserProfile;
  upsertProgram: Program;
  upsertTierCatalog: TierCatalog;
  upsertWeeklyContent: WeeklyContent;
};


export type MutationCreateOutcomeArgs = {
  input: CreateOutcomeInput;
};


export type MutationSubmitDiscoveryArgs = {
  input: SubmitDiscoveryInput;
};


export type MutationUpdateAdminQueueItemArgs = {
  input: UpdateAdminQueueItemInput;
};


export type MutationUpdateSecondaryEmailArgs = {
  secondaryEmail?: InputMaybe<Scalars['AWSEmail']['input']>;
};


export type MutationUpsertAppConfigArgs = {
  input: UpsertAppConfigInput;
};


export type MutationUpsertMyIntakeFormArgs = {
  input: UpsertIntakeFormInput;
};


export type MutationUpsertMyProfileArgs = {
  input: UpsertMyProfileInput;
};


export type MutationUpsertProgramArgs = {
  input: UpsertProgramInput;
};


export type MutationUpsertTierCatalogArgs = {
  input: UpsertTierCatalogInput;
};


export type MutationUpsertWeeklyContentArgs = {
  input: UpsertWeeklyContentInput;
};

export type Outcome = {
  __typename?: 'Outcome';
  createdAt: Scalars['AWSDateTime']['output'];
  freeText?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  month: ProgramMonth;
  owner: Scalars['ID']['output'];
  scores: Array<OutcomeScore>;
  submittedAt: Scalars['AWSDateTime']['output'];
  updatedAt: Scalars['AWSDateTime']['output'];
  week: Scalars['Int']['output'];
  weekISO: Scalars['String']['output'];
};

export type OutcomeConnection = {
  __typename?: 'OutcomeConnection';
  items: Array<Outcome>;
  nextToken?: Maybe<Scalars['String']['output']>;
};

export type OutcomeScore = {
  __typename?: 'OutcomeScore';
  domain: Scalars['String']['output'];
  score: Scalars['Int']['output'];
};

export type OutcomeScoreInput = {
  domain: Scalars['String']['input'];
  score: Scalars['Int']['input'];
};

export type PillarId =
  | 'mind'
  | 'mitigate'
  | 'motivate'
  | 'muscle';

export type Program = {
  __typename?: 'Program';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  pillars: Array<MonthPillar>;
  updatedAt: Scalars['AWSDateTime']['output'];
};

export type ProgramMonth =
  | 'M1'
  | 'M2'
  | 'M3'
  | 'M4'
  | 'MAINTENANCE';

export type Query = {
  __typename?: 'Query';
  adminGetProfile?: Maybe<UserProfile>;
  adminListOutcomes: OutcomeConnection;
  adminListQueue: AdminQueueItemConnection;
  adminListUsers: UserProfileConnection;
  getAppConfig?: Maybe<AppConfig>;
  getMyDiscoveryResponse?: Maybe<DiscoveryResponse>;
  getMyIntakeForm?: Maybe<IntakeForm>;
  getMyProfile: UserProfile;
  getProgram?: Maybe<Program>;
  getTierCatalog?: Maybe<TierCatalog>;
  listMyOutcomes: OutcomeConnection;
  listTiers: Array<Tier>;
  listWeeklyContent: Array<WeeklyContent>;
};


export type QueryAdminGetProfileArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryAdminListOutcomesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryAdminListQueueArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<QueueStatus>;
};


export type QueryAdminListUsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetAppConfigArgs = {
  key: Scalars['ID']['input'];
};


export type QueryGetProgramArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetTierCatalogArgs = {
  id: Scalars['ID']['input'];
};


export type QueryListMyOutcomesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
};


export type QueryListWeeklyContentArgs = {
  month?: InputMaybe<ProgramMonth>;
  programId: Scalars['ID']['input'];
};

export type QueueItemKind =
  | 'clinician_escalation'
  | 'intake_review'
  | 'lab_result_review'
  | 'outcome_flag'
  | 'protocol_check'
  | 'rx_approval';

export type QueueStatus =
  | 'deferred'
  | 'in_progress'
  | 'pending'
  | 'resolved';

export type QueueUrgency =
  | 'routine'
  | 'soon'
  | 'urgent';

export type Resource = {
  __typename?: 'Resource';
  name: Scalars['String']['output'];
  url: Scalars['AWSURL']['output'];
};

export type ResourceInput = {
  name: Scalars['String']['input'];
  url: Scalars['AWSURL']['input'];
};

export type SubmitDiscoveryInput = {
  answers: Array<DiscoveryAnswerInput>;
};

export type Tier = {
  __typename?: 'Tier';
  annualUSD?: Maybe<Scalars['Int']['output']>;
  description: Scalars['String']['output'];
  features: Array<Scalars['String']['output']>;
  id: TierId;
  idealFor: Array<Scalars['String']['output']>;
  includedProductSlugs: Array<Scalars['String']['output']>;
  kind?: Maybe<Scalars['String']['output']>;
  monthlyUSD?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  onboardingFeeUSD?: Maybe<Scalars['Int']['output']>;
  oneTimePriceUSD?: Maybe<Scalars['Int']['output']>;
  tagline: Scalars['String']['output'];
  updatedAt: Scalars['AWSDateTime']['output'];
};

export type TierCatalog = {
  __typename?: 'TierCatalog';
  id: Scalars['ID']['output'];
  tiers: Array<Tier>;
  updatedAt: Scalars['AWSDateTime']['output'];
};

export type TierId =
  | 'concierge'
  | 'foundation'
  | 'longevity'
  | 'optimization';

export type TierInput = {
  annualUSD?: InputMaybe<Scalars['Int']['input']>;
  description: Scalars['String']['input'];
  features: Array<Scalars['String']['input']>;
  id: TierId;
  idealFor: Array<Scalars['String']['input']>;
  includedProductSlugs: Array<Scalars['String']['input']>;
  kind?: InputMaybe<Scalars['String']['input']>;
  monthlyUSD?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
  onboardingFeeUSD?: InputMaybe<Scalars['Int']['input']>;
  oneTimePriceUSD?: InputMaybe<Scalars['Int']['input']>;
  tagline: Scalars['String']['input'];
};

export type UpdateAdminQueueItemInput = {
  draftedAction?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  status?: InputMaybe<QueueStatus>;
  urgency?: InputMaybe<QueueUrgency>;
};

export type UpsertAppConfigInput = {
  key: Scalars['ID']['input'];
  valueJson: Scalars['AWSJSON']['input'];
};

export type UpsertIntakeFormInput = {
  answers: Array<IntakeAnswerInput>;
  status: Scalars['String']['input'];
  version: Scalars['String']['input'];
};

export type UpsertMyProfileInput = {
  address?: InputMaybe<AddressInput>;
  currentMonth?: InputMaybe<ProgramMonth>;
  currentPillar?: InputMaybe<PillarId>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  dob?: InputMaybe<Scalars['AWSDate']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['AWSPhone']['input']>;
  prefs?: InputMaybe<UserPrefsInput>;
  tier?: InputMaybe<TierId>;
};

export type UpsertProgramInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  pillars: Array<MonthPillarInput>;
};

export type UpsertTierCatalogInput = {
  id: Scalars['ID']['input'];
  tiers: Array<TierInput>;
};

export type UpsertWeeklyContentInput = {
  bodyMarkdown: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  month: ProgramMonth;
  pillar: PillarId;
  programId: Scalars['ID']['input'];
  resources?: InputMaybe<Array<ResourceInput>>;
  title: Scalars['String']['input'];
  week: Scalars['Int']['input'];
};

export type UserPrefs = {
  __typename?: 'UserPrefs';
  marketingOptIn?: Maybe<Scalars['Boolean']['output']>;
  smsOptIn?: Maybe<Scalars['Boolean']['output']>;
  timezone?: Maybe<Scalars['String']['output']>;
  units?: Maybe<Scalars['String']['output']>;
};

export type UserPrefsInput = {
  marketingOptIn?: InputMaybe<Scalars['Boolean']['input']>;
  smsOptIn?: InputMaybe<Scalars['Boolean']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
  units?: InputMaybe<Scalars['String']['input']>;
};

export type UserProfile = {
  __typename?: 'UserProfile';
  address?: Maybe<Address>;
  createdAt: Scalars['AWSDateTime']['output'];
  currentMonth?: Maybe<ProgramMonth>;
  currentPillar?: Maybe<PillarId>;
  displayName?: Maybe<Scalars['String']['output']>;
  dob?: Maybe<Scalars['AWSDate']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['AWSPhone']['output']>;
  prefs?: Maybe<UserPrefs>;
  primaryEmail: Scalars['AWSEmail']['output'];
  secondaryEmail?: Maybe<Scalars['AWSEmail']['output']>;
  tier?: Maybe<TierId>;
  updatedAt: Scalars['AWSDateTime']['output'];
};

export type UserProfileConnection = {
  __typename?: 'UserProfileConnection';
  items: Array<UserProfile>;
  nextToken?: Maybe<Scalars['String']['output']>;
};

export type WeeklyContent = {
  __typename?: 'WeeklyContent';
  bodyMarkdown: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  month: ProgramMonth;
  pillar: PillarId;
  programId: Scalars['ID']['output'];
  resources?: Maybe<Array<Resource>>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['AWSDateTime']['output'];
  week: Scalars['Int']['output'];
};
