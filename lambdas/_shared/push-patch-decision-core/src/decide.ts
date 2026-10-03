// Idempotent physician decision. Approve → encounter state 'script-written' (existing state, so
// @my4mlife/patient-record and the admin app need no change); decline → 'declined' + refundStatus
// 'pending' (an admin issues the refund; nothing is ever sent to Genesis on decline).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getStripeClient } from '@my4mlife/stripe-client';
import { sendWelcome, sendDeclined } from './emails';
import { sendGenesisOrder } from './genesis-order';
import { addBusinessDays } from './business-days';
import { resolveShip, type OrderInput } from './genesis-form';

export type Outcome =
  | { kind: 'approved'; mailOk: boolean }
  | { kind: 'declined'; mailOk: boolean }
  | { kind: 'already-decided'; state: string }
  | { kind: 'not-found' };

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));
const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';
const FROM = 'sent-to-provider';
const REFUND_BUSINESS_DAYS = 10;

async function transition(contactId: string, encounterId: string, to: string, extra: Record<string, string>): Promise<boolean> {
  const now = new Date().toISOString();
  const sets = Object.keys(extra).map((k) => `${k} = :${k}`);
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { contactId, sk: `encounter#${encounterId}` },
      UpdateExpression: ['#state = :to', 'decidedAt = :now', 'updatedAt = :now', ...sets].map((x, i) => (i ? x : `SET ${x}`)).join(', '),
      ConditionExpression: '#state = :from',
      ExpressionAttributeNames: { '#state': 'state' },
      ExpressionAttributeValues: { ':to': to, ':from': FROM, ':now': now, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [`:${k}`, v])) },
    }));
    return true;
  } catch (e) {
    if ((e as { name?: string }).name === 'ConditionalCheckFailedException') return false;
    throw e;
  }
}

// Stamped after the Genesis order (or the TJ-only ACTION NEEDED email) is out. The admin refund refuses
// any encounter carrying genesisOrderSentAt (no refunds once shipped). Never set on decline.
async function stampGenesisSent(contactId: string, encounterId: string, to: string, toGenesis: boolean): Promise<void> {
  const now = new Date().toISOString();
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { contactId, sk: `encounter#${encounterId}` },
    UpdateExpression: `SET genesisOrderSentAt = :now, updatedAt = :now${toGenesis ? ', genesisOrderTo = :to' : ''}`,
    ExpressionAttributeValues: { ':now': now, ...(toGenesis ? { ':to': to } : {}) },
  }));
}

const allOk = async (jobs: Promise<void>[]): Promise<boolean> =>
  (await Promise.allSettled(jobs)).every((r) => r.status === 'fulfilled');

// decidedBy: 'physician-link' (emailed token) or 'admin:<username>' (admin app); recorded on the encounter.
export type DecideArgs = { contactId: string; encounterId: string; action: 'approve' | 'decline'; decidedBy: string };

export async function decide(a: DecideArgs): Promise<Outcome> {
  const get = async (sk: string) => (await ddb.send(new GetCommand({ TableName: TABLE, Key: { contactId: a.contactId, sk } }))).Item;
  const enc = await get(`encounter#${a.encounterId}`);
  if (!enc || enc.lane !== 'push-patch') return { kind: 'not-found' }; // other Rx lanes are never decidable here
  if (enc.state !== FROM) return { kind: 'already-decided', state: String(enc.state) };
  const demo = (await get('record'))?.demographics ?? {};
  const sku = String(enc.sku ?? '');

  if (a.action === 'approve') {
    const stripe = await getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(enc.sessionId, {});
    if (!(await transition(a.contactId, a.encounterId, 'script-written', { decidedBy: a.decidedBy }))) return { kind: 'already-decided', state: 'decided' };
    const name = `${demo.firstName ?? ''} ${demo.lastName ?? ''}`.trim();
    const mailOk = await allOk([
      sendWelcome(demo.email, demo.firstName ?? '', sku),
      sendGenesisOrder({ signedAt: new Date().toISOString(), testOrder: session.metadata?.test_price === 'true', sku, sessionId: enc.sessionId, name, lastName: demo.lastName ?? '', phone: demo.phone ?? '', ship: resolveShip(enc.shipTo, session.shipping_details as OrderInput['ship']) })
        .then((o) => stampGenesisSent(a.contactId, a.encounterId, o.to, o.toGenesis)),
    ]);
    return { kind: 'approved', mailOk };
  }

  // Decline: claim the decision, queue the refund for admin approval. No Stripe call, nothing to Genesis,
  // and genesisOrderSentAt is never set here (that is what makes the admin refund eligible).
  const declinedAt = new Date();
  if (!(await transition(a.contactId, a.encounterId, 'declined', {
    decidedBy: a.decidedBy,
    refundStatus: 'pending',
    declinedAt: declinedAt.toISOString(),
    refundDueBy: addBusinessDays(declinedAt, REFUND_BUSINESS_DAYS),
  }))) return { kind: 'already-decided', state: 'decided' };
  // TODO(auto-refund): when process.env.AUTO_REFUND_ON_DECLINE === 'true', call the shared refund function
  // from lambdas/_shared/encounter-refund (being written separately) here and let it flip refundStatus.
  // Default is 'false' (admin approves every refund), so this flag path is intentionally a no-op for now.
  if (process.env.AUTO_REFUND_ON_DECLINE === 'true') console.warn('AUTO_REFUND_ON_DECLINE=true but the shared refund function is not wired yet; refund stays pending');
  const mailOk = await allOk([sendDeclined(demo.email, demo.firstName ?? '', sku)]);
  return { kind: 'declined', mailOk };
}
