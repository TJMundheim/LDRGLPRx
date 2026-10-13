import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Ddb, Stage } from './types';

// Ranks lead < protege < customer; never demotes; 'banned' is never touched.
const ALLOWED_FROM: Record<'protege' | 'customer', Stage[]> = {
  protege: ['lead'],
  customer: ['lead', 'protege'],
};

const isConditionFailed = (e: unknown) =>
  (e as { name?: string } | null)?.name === 'ConditionalCheckFailedException';

export async function promote(
  ddb: Ddb,
  table: string,
  contactId: string,
  target: 'protege' | 'customer',
  now: string,
): Promise<void> {
  const from = ALLOWED_FROM[target];
  const values: Record<string, unknown> = { ':target': target, ':now': now };
  from.forEach((s, i) => { values[`:from${i}`] = s; });
  const inList = from.map((_, i) => `:from${i}`).join(', ');
  try {
    await ddb.send(new UpdateCommand({
      TableName: table,
      Key: { contactId },
      UpdateExpression: 'SET #ls = :target, #updatedAt = :now',
      ConditionExpression: `attribute_not_exists(#ls) OR #ls IN (${inList})`,
      ExpressionAttributeNames: { '#ls': 'lifecycleStage', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: values,
    }));
  } catch (e) {
    if (!isConditionFailed(e)) throw e;
  }
}
