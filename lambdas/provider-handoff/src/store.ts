// DynamoDB helpers for the provider hand-off (PatientRecords single-table design).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { RECORD_SK, auditSk, encounterSk } from '@my4mlife/patient-record';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export async function getRecord(contactId: string): Promise<Record<string, unknown> | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { contactId, sk: RECORD_SK } }));
  return res.Item as Record<string, unknown> | undefined;
}

export async function getEncounter(
  contactId: string,
  encounterId: string,
): Promise<Record<string, unknown> | undefined> {
  const res = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { contactId, sk: encounterSk(encounterId) },
  }));
  return res.Item as Record<string, unknown> | undefined;
}

/**
 * Move the encounter to 'sent-to-provider' and stamp the hand-off fields.
 * SET only — never clears other encounter attributes. Idempotent by design so
 * a re-send simply refreshes providerSentAt / packetKey.
 */
export async function stampProviderSent(args: {
  contactId: string;
  encounterId: string;
  sentTo: string;
  packetKey: string;
  at: string;
}): Promise<void> {
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { contactId: args.contactId, sk: encounterSk(args.encounterId) },
    UpdateExpression:
      'SET #state = :state, providerSentTo = :to, providerSentAt = :at, packetKey = :key, updatedAt = :at',
    ConditionExpression: 'attribute_exists(contactId)',
    ExpressionAttributeNames: { '#state': 'state' },
    ExpressionAttributeValues: {
      ':state': 'sent-to-provider',
      ':to': args.sentTo,
      ':at': args.at,
      ':key': args.packetKey,
    },
  }));
}

/** Append-only audit row. A re-send adds another row rather than replacing one. */
export async function writeProviderSentAudit(args: {
  contactId: string;
  encounterId: string;
  sentTo: string;
  packetKey: string;
  resend: boolean;
  at: string;
}): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      contactId: args.contactId,
      sk: auditSk(args.at, 0),
      action: 'provider.sent',
      encounterId: args.encounterId,
      sentTo: args.sentTo,
      packetKey: args.packetKey,
      resend: args.resend,
      at: args.at,
    },
  }));
}
