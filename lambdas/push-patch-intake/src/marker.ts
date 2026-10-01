import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TOUCHPOINTS = process.env.TOUCHPOINTS_TABLE ?? 'Touchpoints';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));

/** Reminder contract: stamp the pending marker so the reminder sweep stops. Never throws. */
export async function markIntakeSubmitted(contactId: string, sessionId: string, ts: string): Promise<void> {
  try {
    await ddb.send(new UpdateCommand({
      TableName: TOUCHPOINTS,
      Key: { contactId, sk: `PUSH_PATCH_PENDING#${sessionId}` },
      UpdateExpression: 'SET intakeSubmittedAt = :ts',
      ConditionExpression: 'attribute_exists(sk)',
      ExpressionAttributeValues: { ':ts': ts },
    }));
  } catch (e) {
    if ((e as { name?: string })?.name !== 'ConditionalCheckFailedException') console.error('[push-patch-intake] pending marker update failed', { sessionId });
  }
}
