// Idempotent physician decision. Approve → encounter state 'script-written' (existing state, so
// @my4mlife/patient-record and the admin app need no change); decline → 'declined' + refundStatus
// 'pending' (an admin issues the refund; nothing is ever sent to Genesis on decline).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getStripeClient } from '@my4mlife/stripe-client';
import { sendDeclined, sendGlp1Declined } from './emails';
import { fulfillPushPatch, fulfillGlp1, stampGenesisSent } from './fulfill';
import { addBusinessDays } from './business-days';
import { pickProvider } from './signing-provider';
import { buildRefillAuth, grantRefills, partnerRefFromSession } from './refill-auth';

export { stampGenesisSent };
export const DEFAULT_REFILLS = 8;
const LANES = ['push-patch', 'glp1'];

export type Outcome =
  | { kind: 'approved'; mailOk: boolean }
  | { kind: 'declined'; mailOk: boolean }
  | { kind: 'already-decided'; state: string }
  | { kind: 'dose-required'; message: string }
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

const idOf = (v: unknown): string | undefined => (typeof v === 'string' ? v : (v as { id?: string } | null)?.id) || undefined;

async function cancelSubscription(sessionId: string): Promise<void> {
  try {
    const stripe = await getStripeClient();
    const subId = idOf((await stripe.checkout.sessions.retrieve(sessionId, {})).subscription);
    if (subId) await stripe.subscriptions.cancel(subId);
  } catch { console.error('[decide] glp1-subscription-cancel-failed'); }
}

const allOk = async (jobs: Promise<void>[]): Promise<boolean> =>
  (await Promise.allSettled(jobs)).every((r) => r.status === 'fulfilled');

// decidedBy: 'physician-link' (emailed token) or 'admin:<username>' (admin app); recorded on the encounter.
export type DecideArgs = { contactId: string; encounterId: string; action: 'approve' | 'decline'; decidedBy: string; providerId?: string; refills?: number; dose?: string };

export async function decide(a: DecideArgs): Promise<Outcome> {
  const get = async (sk: string) => (await ddb.send(new GetCommand({ TableName: TABLE, Key: { contactId: a.contactId, sk } }))).Item;
  const enc = await get(`encounter#${a.encounterId}`);
  if (!enc || !LANES.includes(enc.lane)) return { kind: 'not-found' }; // other Rx lanes are never decidable here
  const glp1 = enc.lane === 'glp1';
  const dose = a.dose?.trim();
  if (enc.state !== FROM) return { kind: 'already-decided', state: String(enc.state) };
  const demo = (await get('record'))?.demographics ?? {};
  const sku = String(enc.sku ?? '');

  if (a.action === 'approve') {
    if (glp1 && !dose) return { kind: 'dose-required', message: 'A dose is required to approve a GLP-1 order.' };
    const stripe = await getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(enc.sessionId, {});
    const prov = await pickProvider(a.providerId); // before the claim: a roster failure leaves the encounter undecided
    if (!(await transition(a.contactId, a.encounterId, 'script-written', { decidedBy: a.decidedBy, ...(glp1 && { dose }), ...(prov && { signedByProviderId: prov.id, signedByName: prov.name }) }))) return { kind: 'already-decided', state: 'decided' };
    const refills = Math.min(8, Math.max(0, Math.floor(a.refills ?? DEFAULT_REFILLS)));
    let granted = false;
    if (refills > 0) {
      try {
        const auth = buildRefillAuth({ refills, sku, ...(glp1 && { product: sku }), authorizedBy: prov?.name ?? a.decidedBy,
          ...(prov && { signedByProviderId: prov.id }), partnerRef: await partnerRefFromSession(session, stripe), now: new Date() });
        // GLP-1 auto-ship: the checkout itself started the subscription, so renewals are auto (no reorder reminders).
        const subId = glp1 ? idOf(session.subscription) : undefined;
        await grantRefills(a.contactId, a.encounterId, subId ? { ...auth, mode: 'auto', subscriptionId: subId } : auth);
        granted = true;
      } catch { console.error('[decide] refill-grant-failed'); } // approval stands; refills can be granted by the admin CLI
    }
    const ctx = { contactId: a.contactId, encounterId: a.encounterId, enc, demo, session, sku, granted, providerName: prov?.name, dose };
    const mailOk = await allOk(glp1 ? fulfillGlp1(ctx) : fulfillPushPatch(ctx));
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
  // GLP-1 auto-ship: end the subscription now so no renewal bills (best effort; the admin refund cancels it too).
  if (glp1) await cancelSubscription(enc.sessionId);
  // TODO(auto-refund): when process.env.AUTO_REFUND_ON_DECLINE === 'true', call the shared refund function
  // from lambdas/_shared/encounter-refund (being written separately) here and let it flip refundStatus.
  // Default is 'false' (admin approves every refund), so this flag path is intentionally a no-op for now.
  if (process.env.AUTO_REFUND_ON_DECLINE === 'true') console.warn('AUTO_REFUND_ON_DECLINE=true but the shared refund function is not wired yet; refund stays pending');
  const mailOk = await allOk([(glp1 ? sendGlp1Declined : sendDeclined)(demo.email, demo.firstName ?? '', sku)]);
  return { kind: 'declined', mailOk };
}
