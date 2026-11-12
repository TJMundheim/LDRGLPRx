// Find unshipped, non-test Push Patch orders whose patient name matches the parsed tracking email.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));
const TABLE = () => process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';

export interface Candidate { contactId: string; sk: string; sku: string; firstName: string; lastName: string; email: string; decidedAt: string }

const norm = (s: unknown): string => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const isCondFail = (e: unknown) => (e as { name?: string }).name === 'ConditionalCheckFailedException';

async function scanAll(FilterExpression: string, names: Record<string, string> | undefined, values: Record<string, unknown>): Promise<any[]> {
  const out: any[] = []; let key: Record<string, unknown> | undefined;
  do {
    const r = await ddb.send(new ScanCommand({ TableName: TABLE(), ExclusiveStartKey: key, FilterExpression, ExpressionAttributeNames: names, ExpressionAttributeValues: values }));
    out.push(...(r.Items ?? [])); key = r.LastEvaluatedKey;
  } while (key);
  return out;
}

/** True when some Push Patch encounter already carries this tracking number (repeat delivery of the same email). */
export async function isKnownTracking(t: string): Promise<boolean> {
  const items = await scanAll('begins_with(sk, :p) AND trackingNumber = :t', undefined, { ':p': 'encounter#pp-', ':t': t });
  return items.some((i) => i.trackingNumber === t);
}

export async function findCandidates(first: string, last: string): Promise<Candidate[]> {
  const encs = await scanAll(
    'begins_with(sk, :p) AND #st = :s AND attribute_not_exists(trackingNumber) AND (attribute_not_exists(testOrder) OR testOrder = :f)',
    { '#st': 'state' }, { ':p': 'encounter#pp-', ':s': 'script-written', ':f': false });
  const out: Candidate[] = [];
  for (const e of encs.filter((x) => !x.testOrder && !x.trackingNumber)) {
    const d = (await ddb.send(new GetCommand({ TableName: TABLE(), Key: { contactId: e.contactId, sk: 'record' } }))).Item?.demographics ?? {};
    if (norm(d.lastName) !== norm(last) || (first && norm(d.firstName) !== norm(first)) || !d.email) continue;
    out.push({ contactId: e.contactId, sk: e.sk, sku: String(e.sku ?? ''), firstName: String(d.firstName ?? ''), lastName: String(d.lastName ?? ''), email: d.email, decidedAt: String(e.decidedAt ?? '') });
  }
  return out;
}

// true = stamped; false = already has tracking (duplicate) or is no longer in the approved state.
export async function stampTracking(c: { contactId: string; sk: string }, t: string, carrier: string): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE(), Key: { contactId: c.contactId, sk: c.sk },
      UpdateExpression: 'SET trackingNumber = :t, carrier = :k, shippedAt = :now, updatedAt = :now',
      ConditionExpression: 'attribute_not_exists(trackingNumber) AND #st = :s',
      ExpressionAttributeNames: { '#st': 'state' },
      ExpressionAttributeValues: { ':t': t, ':k': carrier, ':now': now, ':s': 'script-written' },
    }));
    return true;
  } catch (e) {
    if (isCondFail(e)) return false;
    throw e;
  }
}

/** Undo our own stamp after a failed send, so a retry can send. Only removes this exact tracking number. */
export async function unstampTracking(c: { contactId: string; sk: string }, t: string): Promise<void> {
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE(), Key: { contactId: c.contactId, sk: c.sk },
      UpdateExpression: 'REMOVE trackingNumber, carrier, shippedAt', ConditionExpression: 'trackingNumber = :t',
      ExpressionAttributeValues: { ':t': t },
    }));
  } catch (e) {
    if (!isCondFail(e)) throw e;
  }
}
