import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Entry } from './validate';

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));
const TABLE = process.env.ENTRIES_TABLE ?? 'PullUpChallengeEntries';

/** Conditional put. Returns 'duplicate' if this email+round already exists. */
export async function saveEntry(e: Entry, sourceIp: string | undefined): Promise<'ok' | 'duplicate'> {
  const noStartOnFile = e.round === 'final'
    ? !(await ddb.send(new GetCommand({ TableName: TABLE, Key: { email: e.email, sk: 'round#start' } }))).Item
    : false;
  const { email, round, ...rest } = e;
  try {
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: { email, sk: `round#${round}`, ...rest, submittedAt: new Date().toISOString(), sourceIp, ...(noStartOnFile ? { noStartOnFile: true } : {}) },
      ConditionExpression: 'attribute_not_exists(email)',
    }));
    return 'ok';
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') return 'duplicate';
    throw err;
  }
}
