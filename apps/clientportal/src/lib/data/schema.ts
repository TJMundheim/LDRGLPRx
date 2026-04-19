/**
 * Workbook data schema. Each field maps cleanly to a future Supabase column.
 * Discriminated unions are used where the shape is conditional.
 */

export type MotivationChoice = '0' | '1' | '2' | '';

export interface Resource {
  n: string;
  u: string;
}

export interface FactorScoreEntry {
  /** 1–5 score; 0 or undefined means unscored. */
  score: number;
  /** Personal action plan the user typed for this factor. */
  plan?: string;
  updatedAt?: string;
}

export interface PriorityRisk {
  rank: 1 | 2 | 3;
  factorId: string;
  factorName: string;
  commitment: string;
}

export interface StrengthTest {
  pullups?: string;
  deadhang?: string;
  pushups?: string;
  pushupsType?: 'full' | 'incline' | 'knee' | '';
  squats?: string;
  squatsType?: 'full' | 'assisted' | '';
}

export interface BodyBaseline {
  weight: string;
  waist: string;
  energy: string;
  focus: string;
  sleep: string;
  mood: string;
}

export interface Week4Measurement extends BodyBaseline {
  audit: string;
  squat: string;
  mornDays: string;
  coldDays: string;
}

export interface TrainingSession {
  /** Free-form log rows keyed by movement id. */
  [key: string]: string;
}

export interface CognitiveEntry {
  /** Keyed by `wN_focus`, `wN_memory`, `wN_mood`. */
  [key: string]: string;
}

export interface WeekLog {
  week: 1 | 2 | 3 | 4;
  /** Morning protocol day checkmarks, keyed `wNdM`. */
  morn: Record<string, boolean>;
  /** Cold shower day checkmarks, keyed `cwNdM`. */
  cold: Record<string, boolean>;
  /** Morning reflection text keyed `wN`. */
  reflection: string;
}

export interface SupplementStatus {
  startedOn?: string;
  takingNow: boolean;
  /** Raw "Yes"/"No" response preserved for compatibility. */
  response?: 'Yes' | 'No' | '';
}

export interface Workbook {
  id: string;
  userId: string;
  cohortId?: string;
  startDate: string;
  motivation: MotivationChoice;
  personalWhy: string;
  name: string;

  /** Factor scores keyed by factor string id ("00", "01", ..., "08b", "12"). */
  factorScores: Record<string, number>;
  /** Factor action-plan textareas keyed by factor id. */
  factorPlans: Record<string, string>;

  priorities: [string, string, string];
  commitments: [string, string, string];

  strengthBaseline: StrengthTest;
  bodyBaseline: BodyBaseline;
  trainLog: TrainingSession;

  weekLogs: Record<1 | 2 | 3 | 4, WeekLog>;

  /** Week 4 audit re-scores, keyed by factor id. */
  w4audit: Record<string, number>;
  w4: Week4Measurement;

  supplements: Record<string, SupplementStatus>;

  cogRatings: CognitiveEntry;

  /** Arbitrary weekly reflection & free-text keyed `wN_*`. */
  weekReflections: Record<string, string>;

  /** Protein target bodyweight (lbs), as string from input. */
  protein: string;

  identityStatement: string;
  month1Wins: [string, string, string];

  month2: {
    training: string;
    nutrition: string;
    supplements: string;
    cognitive: string;
    accountability: string;
  };

  graduation: string;
  regenPriority: string;
  regenNext: string;

  createdAt: string;
  updatedAt: string;
}

export function createEmptyWorkbook(id: string, userId: string): Workbook {
  const now = new Date().toISOString();
  const emptyWeek = (w: 1 | 2 | 3 | 4): WeekLog => ({
    week: w,
    morn: {},
    cold: {},
    reflection: ''
  });
  return {
    id,
    userId,
    startDate: '',
    motivation: '',
    personalWhy: '',
    name: '',
    factorScores: {},
    factorPlans: {},
    priorities: ['', '', ''],
    commitments: ['', '', ''],
    strengthBaseline: {},
    bodyBaseline: { weight: '', waist: '', energy: '', focus: '', sleep: '', mood: '' },
    trainLog: {},
    weekLogs: {
      1: emptyWeek(1),
      2: emptyWeek(2),
      3: emptyWeek(3),
      4: emptyWeek(4)
    },
    w4audit: {},
    w4: {
      weight: '', waist: '', energy: '', focus: '', sleep: '', mood: '',
      audit: '', squat: '', mornDays: '', coldDays: ''
    },
    supplements: {},
    cogRatings: {},
    weekReflections: {},
    protein: '',
    identityStatement: '',
    month1Wins: ['', '', ''],
    month2: {
      training: '', nutrition: '', supplements: '', cognitive: '', accountability: ''
    },
    graduation: '',
    regenPriority: '',
    regenNext: '',
    createdAt: now,
    updatedAt: now
  };
}
