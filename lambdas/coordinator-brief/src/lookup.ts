// Finds the most recent care-coordinator encounter for a contact — used when
// a MindSpan assessment completes AFTER intake, so we know which pre-call
// brief to regenerate with the new scores.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const PATIENT_RECORDS_TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export interface CoordinatorEncounter {
  encounterId: string;
  createdAt: string;
}

/** Query every encounter item for a contact and return the latest one (by
 *  createdAt) whose category is 'care-coordinator'. Undefined when the
 *  contact has never had a care-coordinator encounter — callers should skip
 *  brief generation rather than invent one.
 */
export async function findLatestCoordinatorEncounter(contactId: string): Promise<CoordinatorEncounter | undefined> {
  const res = await ddb.send(new QueryCommand({
    TableName: PATIENT_RECORDS_TABLE,
    KeyConditionExpression: 'contactId = :c AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: { ':c': contactId, ':prefix': 'encounter#' },
  }));

  const items = (res.Items ?? []) as Array<Record<string, unknown>>;
  const coordinatorEncounters = items.filter((i) => i['category'] === 'care-coordinator');
  if (coordinatorEncounters.length === 0) return undefined;

  coordinatorEncounters.sort((a, b) => String(b['createdAt'] ?? '').localeCompare(String(a['createdAt'] ?? '')));
  const latest = coordinatorEncounters[0];
  return { encounterId: String(latest['encounterId']), createdAt: String(latest['createdAt'] ?? '') };
}
