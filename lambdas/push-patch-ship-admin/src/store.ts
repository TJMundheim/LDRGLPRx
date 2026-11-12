import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));
const TableName = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';
type Item = Record<string, any> | undefined;

export async function load(contactId: string, sk: string): Promise<{ enc: Item; demo: Record<string, string> }> {
  const get = async (k: string): Promise<Item> => (await ddb.send(new GetCommand({ TableName, Key: { contactId, sk: k } }))).Item;
  const [enc, rec] = await Promise.all([get(sk), get('record')]);
  return { enc, demo: rec?.demographics ?? {} };
}

/** True if this call stamped the order; false if tracking was already set (or the order left the approved state). */
export async function stamp(contactId: string, sk: string, trackingNumber: string, carrier: string, shippedAt: string): Promise<boolean> {
  try {
    await ddb.send(new UpdateCommand({
      TableName, Key: { contactId, sk },
      UpdateExpression: 'SET trackingNumber = :t, carrier = :c, shippedAt = :a, updatedAt = :a',
      ConditionExpression: 'attribute_not_exists(trackingNumber) AND #st = :s',
      ExpressionAttributeNames: { '#st': 'state' },
      ExpressionAttributeValues: { ':t': trackingNumber, ':c': carrier, ':a': shippedAt, ':s': 'script-written' },
    }));
    return true;
  } catch (e) {
    if ((e as Error).name === 'ConditionalCheckFailedException') return false;
    throw e;
  }
}

/** Undo our own stamp after a failed send. Only removes this exact tracking number. */
export async function unstamp(contactId: string, sk: string, trackingNumber: string): Promise<void> {
  try {
    await ddb.send(new UpdateCommand({
      TableName, Key: { contactId, sk },
      UpdateExpression: 'REMOVE trackingNumber, carrier, shippedAt', ConditionExpression: 'trackingNumber = :t',
      ExpressionAttributeValues: { ':t': trackingNumber },
    }));
  } catch (e) {
    if ((e as Error).name !== 'ConditionalCheckFailedException') throw e;
  }
}
