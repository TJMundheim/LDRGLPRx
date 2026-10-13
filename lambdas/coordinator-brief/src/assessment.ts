// Loads the patient's MindSpan assessment (answers, top-3, completion time).
// Assessment data lives in the Users table (keyed by Cognito sub), NOT on the
// marketing Contact table. Users has no email index, so we resolve the sub via
// Cognito ListUsers, then GetItem Users. Legacy Contact rows that still carry
// the fields (until the cleanup script runs) are used as a fallback.
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? '';
const USER_PROFILE_TABLE = process.env.USER_PROFILE_TABLE ?? 'Users';

const cognito = new CognitoIdentityProviderClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export interface Assessment {
  intakeAnswers?: Record<string, number>;
  auditTop3?: unknown[];
  auditCompletedAt?: string;
}

/** Users stores these as JSON strings in some rows; accept strings or real values. */
function parse(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return undefined; }
}

function normalize(src: Record<string, unknown> | undefined): Assessment | undefined {
  if (!src) return undefined;
  const answers = parse(src['intakeAnswers']);
  const top3 = parse(src['auditTop3']);
  const out: Assessment = {};
  if (answers && typeof answers === 'object' && !Array.isArray(answers) && Object.keys(answers).length > 0) {
    out.intakeAnswers = answers as Record<string, number>;
  }
  if (Array.isArray(top3) && top3.length > 0) out.auditTop3 = top3;
  if (typeof src['auditCompletedAt'] === 'string') out.auditCompletedAt = src['auditCompletedAt'];
  return out.intakeAnswers || out.auditTop3 ? out : undefined;
}

async function findSub(email: string): Promise<string | undefined> {
  if (!USER_POOL_ID) return undefined;
  const safe = email.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const res = await cognito.send(new ListUsersCommand({ UserPoolId: USER_POOL_ID, Filter: `email = "${safe}"`, Limit: 2 }));
  const user = res.Users?.[0];
  return user?.Attributes?.find((a) => a.Name === 'sub')?.Value ?? user?.Username;
}

async function fromUsers(email: string): Promise<Assessment | undefined> {
  const sub = await findSub(email);
  if (!sub) return undefined;
  const res = await ddb.send(new GetCommand({ TableName: USER_PROFILE_TABLE, Key: { id: sub } }));
  return normalize(res.Item);
}

/** Users first, then legacy Contact fields; undefined when neither has data.
 *  Lookup failures never fail the brief — only the error name is logged.
 */
export async function loadAssessment(email: string | undefined, legacyContact: Record<string, unknown> | undefined): Promise<Assessment | undefined> {
  if (email) {
    try {
      const hit = await fromUsers(email.trim().toLowerCase());
      if (hit) return hit;
    } catch (err) {
      console.error('assessment lookup failed', (err as Error)?.name ?? 'Error');
    }
  }
  return normalize(legacyContact);
}
