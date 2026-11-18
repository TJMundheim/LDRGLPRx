// Refill authorization stored as a map attribute (refillAuth) on the parent push-patch encounter item.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { rxProduct } from './rx-products';

export interface RefillAuth { refillsAuthorized: number; refillsUsed: number; sku: string; intervalWeeks?: 6;
  fulfillment?: 'genesis' | 'manual'; product?: string; intervalDays?: number; // absent = Push Patch via Genesis, every 42 days
  expiresAt: string; authorizedBy: string; signedByProviderId?: string; authorizedAt: string; partnerRef?: string;
  mode: 'auto' | 'on-demand'; subscriptionId?: string; status: 'active' | 'paused' | 'exhausted' | 'cancelled';
  lastShippedAt?: string; remindersSent?: number; reReviewSentAt?: string;
  shipTo?: RefillShipTo; shipToUpdatedAt?: string }
// Same shape as the parent encounter's shipTo, so resolveShip() reads it directly.
export interface RefillShipTo { name: string; line1: string; line2: string; city: string; state: string; postalCode: string }

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));
const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';
const key = (contactId: string, encounterId: string) => ({ contactId, sk: `encounter#${encounterId}` });
const isCcf = (e: unknown) => (e as { name?: string }).name === 'ConditionalCheckFailedException';

export function buildRefillAuth(i: { refills: number; sku: string; authorizedBy: string; signedByProviderId?: string; partnerRef?: string; product?: string; now: Date }): RefillAuth {
  const exp = new Date(i.now); exp.setUTCFullYear(exp.getUTCFullYear() + 1);
  const rx = i.product !== undefined ? rxProduct(i.product) : undefined;
  if (i.product !== undefined && !rx) throw new Error('buildRefillAuth: unknown product');
  const common = { refillsAuthorized: i.refills, refillsUsed: 0, expiresAt: exp.toISOString(),
    authorizedBy: i.authorizedBy, ...(i.signedByProviderId && { signedByProviderId: i.signedByProviderId }),
    authorizedAt: i.now.toISOString(), ...(i.partnerRef && { partnerRef: i.partnerRef }), mode: 'on-demand' as const, status: 'active' as const };
  if (rx) return { ...common, sku: i.product!, product: i.product, fulfillment: rx.fulfillment, intervalDays: rx.intervalDays };
  return { ...common, sku: i.sku, intervalWeeks: 6 };
}

// Push Patch: only an approved (script-written), non-refunded push-patch encounter can carry refills.
// Manual Rx products (auth.fulfillment === 'manual'): any other lane's fulfilled/script-written, non-refunded encounter.
export async function grantRefills(contactId: string, encounterId: string, auth: RefillAuth): Promise<void> {
  // ConsistentRead: decide() calls this right after its script-written transition.
  const enc = (await ddb.send(new GetCommand({ TableName: TABLE, Key: key(contactId, encounterId), ConsistentRead: true }))).Item;
  const manual = auth.fulfillment === 'manual';
  if (manual && !rxProduct(auth.product)) throw new Error('grantRefills: unknown product');
  if (manual) {
    if (!enc || enc.lane === 'push-patch') throw new Error('grantRefills: not an eligible encounter for a manual product');
    if (enc.state !== 'fulfilled' && enc.state !== 'script-written') throw new Error(`grantRefills: encounter state is ${String(enc.state)}, not fulfilled or script-written`);
  } else {
    if (!enc || enc.lane !== 'push-patch') throw new Error('grantRefills: not a push-patch encounter');
    if (enc.state !== 'script-written') throw new Error(`grantRefills: encounter state is ${String(enc.state)}, not script-written`);
  }
  if (enc.refundStatus) throw new Error(`grantRefills: encounter refund status is ${String(enc.refundStatus)}`);
  await ddb.send(new UpdateCommand({
    TableName: TABLE, Key: key(contactId, encounterId),
    UpdateExpression: 'SET refillAuth = :a, updatedAt = :now',
    ConditionExpression: manual ? '#state IN (:sw, :fu)' : '#state = :sw', ExpressionAttributeNames: { '#state': 'state' },
    ExpressionAttributeValues: { ':a': auth, ':sw': 'script-written', ':now': new Date().toISOString(), ...(manual ? { ':fu': 'fulfilled' } : {}) },
  }));
}

export async function getRefillAuth(contactId: string, encounterId: string): Promise<{ auth: RefillAuth; encounter: any } | null> {
  const enc = (await ddb.send(new GetCommand({ TableName: TABLE, Key: key(contactId, encounterId), ConsistentRead: true }))).Item;
  return enc?.refillAuth ? { auth: enc.refillAuth as RefillAuth, encounter: enc } : null;
}

// Atomic: one conditional increment. Concurrent claims can never exceed refillsAuthorized.
export async function claimRefillSlot(contactId: string, encounterId: string, now: Date):
  Promise<{ ok: true; refillNumber: number; auth: RefillAuth } | { ok: false; reason: 'exhausted' | 'expired' | 'inactive' }> {
  const nowIso = now.toISOString();
  let auth: RefillAuth;
  try {
    const r = await ddb.send(new UpdateCommand({
      TableName: TABLE, Key: key(contactId, encounterId),
      UpdateExpression: 'SET refillAuth.refillsUsed = refillAuth.refillsUsed + :one, updatedAt = :now',
      ConditionExpression: 'attribute_exists(refillAuth) AND refillAuth.refillsUsed < refillAuth.refillsAuthorized AND refillAuth.expiresAt > :now AND refillAuth.#st = :active',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':one': 1, ':now': nowIso, ':active': 'active' },
      ReturnValues: 'ALL_NEW',
    }));
    auth = r.Attributes?.refillAuth as RefillAuth;
  } catch (e) {
    if (!isCcf(e)) throw e;
    const cur = (await getRefillAuth(contactId, encounterId))?.auth;
    if (!cur) return { ok: false, reason: 'inactive' };
    if (cur.status === 'exhausted' || cur.refillsUsed >= cur.refillsAuthorized) return { ok: false, reason: 'exhausted' };
    if (cur.expiresAt <= nowIso) return { ok: false, reason: 'expired' };
    return { ok: false, reason: 'inactive' };
  }
  if (auth.refillsUsed >= auth.refillsAuthorized) {
    // Last slot taken. Follow-up update (the increment condition cannot also set status); failure is harmless
    // because claim already refuses at refillsUsed >= refillsAuthorized.
    try {
      await ddb.send(new UpdateCommand({
        TableName: TABLE, Key: key(contactId, encounterId),
        UpdateExpression: 'SET refillAuth.#st = :exhausted',
        ConditionExpression: 'refillAuth.refillsUsed >= refillAuth.refillsAuthorized AND refillAuth.#st = :active',
        ExpressionAttributeNames: { '#st': 'status' }, ExpressionAttributeValues: { ':exhausted': 'exhausted', ':active': 'active' },
      }));
    } catch (e) { if (!isCcf(e)) console.warn('refill exhausted-status update failed', e); }
    auth = { ...auth, status: 'exhausted' };
  }
  return { ok: true, refillNumber: auth.refillsUsed, auth };
}

// Never touches the counters; use claimRefillSlot for those.
export async function setRefillAuthFields(contactId: string, encounterId: string, f: Partial<RefillAuth>): Promise<void> {
  const entries = Object.entries(f).filter(([, v]) => v !== undefined);
  if (entries.some(([k]) => k === 'refillsUsed')) throw new Error('setRefillAuthFields: refillsUsed is only changed by claimRefillSlot');
  if (!entries.length) return;
  await ddb.send(new UpdateCommand({
    TableName: TABLE, Key: key(contactId, encounterId),
    UpdateExpression: 'SET updatedAt = :updatedAt, ' + entries.map(([k]) => `refillAuth.#${k} = :${k}`).join(', '),
    ConditionExpression: 'attribute_exists(refillAuth)',
    ExpressionAttributeNames: Object.fromEntries(entries.map(([k]) => [`#${k}`, k])),
    ExpressionAttributeValues: { ':updatedAt': new Date().toISOString(), ...Object.fromEntries(entries.map(([k, v]) => [`:${k}`, v])) },
  }));
}

// Patient-reported new shipping address for refills. Written before checkout is created; fulfilment prefers it over the parent's shipTo.
export async function setRefillShipTo(contactId: string, encounterId: string, shipTo: RefillShipTo): Promise<void> {
  const now = new Date().toISOString();
  await ddb.send(new UpdateCommand({
    TableName: TABLE, Key: key(contactId, encounterId),
    UpdateExpression: 'SET refillAuth.shipTo = :st, refillAuth.shipToUpdatedAt = :now, updatedAt = :now',
    ConditionExpression: 'attribute_exists(refillAuth)',
    ExpressionAttributeValues: { ':st': shipTo, ':now': now },
  }));
}

// Partner attribution from a Stripe Checkout session: metadata.partnerRef (?ref= link, already uppercase), else a
// partner-flagged promotion code. Accepts an expanded promotion_code object or its id (looked up via stripe when given).
// Never throws: attribution is best effort and must not block an approval.
type PromoLookup = { promotionCodes: { retrieve: (id: string) => Promise<{ code?: string; metadata?: Record<string, string> | null }> } };
export async function partnerRefFromSession(session: any, stripe?: PromoLookup): Promise<string | undefined> {
  const ref = session?.metadata?.partnerRef;
  if (ref) return String(ref);
  for (const d of session?.discounts ?? []) {
    let pc = d?.promotion_code;
    if (typeof pc === 'string' && stripe) { try { pc = await stripe.promotionCodes.retrieve(pc); } catch { console.error('[refill] promo-lookup-failed'); continue; } }
    if (pc && typeof pc === 'object' && pc.metadata?.partner === 'true' && pc.code) return String(pc.code).toUpperCase();
  }
  return undefined;
}

export const REMINDER_1_DAYS = 35;
export const REMINDER_2_DAYS = 42;
const DAY_MS = 86_400_000;

// A box just shipped for this parent (approval or one-box refill). Records lastShippedAt and, unless the
// patient is on auto-ship (reminders: false), schedules the reorder reminders by stamping the parent
// encounter's top-level refillDueAt (= ship + 35 days; the reminder sweep filters on it) and remindersSent = 0.
export async function recordShipment(contactId: string, encounterId: string, now: Date, reminders: boolean, intervalDays?: number): Promise<void> {
  // First reminder one week before the next fill is due (35 of 42 days for Push Patch).
  const due = new Date(now.getTime() + (intervalDays === undefined ? REMINDER_1_DAYS : intervalDays - 7) * DAY_MS).toISOString();
  await ddb.send(new UpdateCommand({
    TableName: TABLE, Key: key(contactId, encounterId),
    UpdateExpression: reminders
      ? 'SET refillAuth.lastShippedAt = :now, refillAuth.remindersSent = :zero, refillDueAt = :due, updatedAt = :now'
      : 'SET refillAuth.lastShippedAt = :now, updatedAt = :now REMOVE refillDueAt',
    ConditionExpression: 'attribute_exists(refillAuth)',
    ExpressionAttributeValues: { ':now': now.toISOString(), ...(reminders ? { ':zero': 0, ':due': due } : {}) },
  }));
}
