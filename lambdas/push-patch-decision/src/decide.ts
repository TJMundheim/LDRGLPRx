// Idempotent physician decision. Approve → encounter state 'script-written' (existing state, so
// @my4mlife/patient-record and the admin app need no change); decline → 'declined' + full refund.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getStripeClient } from '@my4mlife/stripe-client';
import { sendWelcome, sendDeclined, sendOrder, type OrderArgs } from './emails';

export type Outcome =
  | { kind: 'approved'; mailOk: boolean }
  | { kind: 'declined'; mailOk: boolean }
  | { kind: 'already-decided'; state: string }
  | { kind: 'not-found' };

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));
const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';
const FROM = 'sent-to-provider';

async function transition(contactId: string, encounterId: string, to: string): Promise<boolean> {
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { contactId, sk: `encounter#${encounterId}` },
      UpdateExpression: 'SET #state = :to, decidedAt = :now, updatedAt = :now',
      ConditionExpression: '#state = :from',
      ExpressionAttributeNames: { '#state': 'state' },
      ExpressionAttributeValues: { ':to': to, ':from': FROM, ':now': new Date().toISOString() },
    }));
    return true;
  } catch (e) {
    if ((e as { name?: string }).name === 'ConditionalCheckFailedException') return false;
    throw e;
  }
}

const allOk = async (jobs: Promise<void>[]): Promise<boolean> =>
  (await Promise.allSettled(jobs)).every((r) => r.status === 'fulfilled');

export async function decide(a: { contactId: string; encounterId: string; action: 'approve' | 'decline' }): Promise<Outcome> {
  const get = async (sk: string) => (await ddb.send(new GetCommand({ TableName: TABLE, Key: { contactId: a.contactId, sk } }))).Item;
  const enc = await get(`encounter#${a.encounterId}`);
  if (!enc) return { kind: 'not-found' };
  if (enc.state !== FROM) return { kind: 'already-decided', state: String(enc.state) };
  const demo = (await get('record'))?.demographics ?? {};
  const stripe = await getStripeClient();
  const sku = String(enc.sku ?? '');

  if (a.action === 'approve') {
    const session = await stripe.checkout.sessions.retrieve(enc.sessionId, {});
    if (!(await transition(a.contactId, a.encounterId, 'script-written'))) return { kind: 'already-decided', state: 'script-written' };
    const name = `${demo.firstName ?? ''} ${demo.lastName ?? ''}`.trim();
    const mailOk = await allOk([
      sendWelcome(demo.email, demo.firstName ?? '', sku),
      sendOrder({ sku, sessionId: enc.sessionId, name, phone: demo.phone ?? '', dob: demo.dob ?? '', ship: session.shipping_details as OrderArgs['ship'] }),
    ]);
    return { kind: 'approved', mailOk };
  }

  // Refund first (idempotent on the session id), then record the decision, then tell the patient.
  const refund = await stripe.refunds.create(
    { payment_intent: enc.paymentIntentId },
    { idempotencyKey: `push-patch-decline-${enc.sessionId}` },
  );
  if (!(await transition(a.contactId, a.encounterId, 'declined'))) return { kind: 'already-decided', state: 'declined' };
  const mailOk = await allOk([sendDeclined(demo.email, demo.firstName ?? '', sku, refund.amount)]);
  return { kind: 'declined', mailOk };
}
