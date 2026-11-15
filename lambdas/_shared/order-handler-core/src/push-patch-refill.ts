// Push Patch refills: paid invoices (auto-ship) and one-box checkout sessions fulfil a refill against
// the parent encounter's refillAuth. Logs carry outcome codes only (no PHI/PII).
import { InvokeCommand } from '@aws-sdk/client-lambda';
import { GetCommand, PutCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { upsertContact } from '@my4mlife/contact-upsert';
import {
  claimRefillSlot, getRefillAuth, setRefillAuthFields, recordShipment, sendGenesisOrder, stampGenesisSent, resolveShip, blendFor,
  sendRefillShipped, sendRefillNotice, sendRefillPaymentFailed,
} from '@my4mlife/push-patch-decision-core';

export const REFILL_KIND = 'push-patch-refill';
const TJ = 'drtj@my4mlife.com';
const REFILL_WEEKS_MS = 6 * 7 * 24 * 3600 * 1000;
// Older than the 90 s order-handler timeout: a replay that finds the Orders row still 'processing' means that run died.
const STUCK_MS = 120_000;

export interface RefillDeps {
  stripe: any; ddb: { send: (c: any) => Promise<any> }; lambda: { send: (c: any) => Promise<any> }; emailFn: string; livemode: boolean;
}
type Meta = Record<string, string>;

// Stripe API 2025-02-24.acacia: subscription metadata lives at Invoice.subscription_details.metadata.
// (`parent.subscription_details.metadata` is the 2025-03-31.basil location; read as a forward-compat fallback.)
export function invoiceMeta(inv: any): Meta {
  return inv?.subscription_details?.metadata ?? inv?.parent?.subscription_details?.metadata ?? {};
}
export const isRefillInvoice = (inv: any): boolean => invoiceMeta(inv)['kind'] === REFILL_KIND;
const isCcf = (e: unknown) => (e as { name?: string }).name === 'ConditionalCheckFailedException';
const idOf = (v: any): string | undefined => (typeof v === 'string' ? v : v?.id) || undefined;
// Service period end (unix s) of a subscription invoice = the next renewal. Latest line period end.
const periodEndOf = (inv: any): number | undefined =>
  Math.max(0, ...((inv?.lines?.data ?? []) as any[]).map((l) => Number(l?.period?.end) || 0)) || undefined;

async function tjMail(d: RefillDeps, subject: string, text: string): Promise<void> {
  try {
    await d.lambda.send(new InvokeCommand({
      FunctionName: d.emailFn, InvocationType: 'Event',
      Payload: Buffer.from(JSON.stringify({ kind: 'info', to: TJ, subject, html: `<p>${text}</p>`, text })),
    }));
  } catch { console.error('[refill] tj-mail-failed'); }
}

async function contactInfo(d: RefillDeps, contactId: string, fallbackEmail?: string) {
  const c = (await d.ddb.send(new GetCommand({ TableName: 'Contact', Key: { contactId } }))).Item ?? {};
  const rec = (await d.ddb.send(new GetCommand({ TableName: 'PatientRecords', Key: { contactId, sk: 'record' } }))).Item?.demographics ?? {};
  const email: string = c.email || rec.email || fallbackEmail || '';
  const firstName: string = c.firstName || rec.firstName || '';
  return { email, firstName, lastName: String(rec.lastName ?? ''), phone: String(rec.phone ?? '') };
}

type Ref = { id: string; contactId: string; parentId: string; sku: string; amountCents: number; currency?: string; partnerRef?: string;
  customerId?: string; paymentIntentId?: string; subscriptionId?: string; billingReason?: string; periodEnd?: number; email?: string; oneBox?: boolean };

// Replay of an order id already written. A row still 'processing' past STUCK_MS means the first run died mid-way
// (paid, maybe not shipped): tell TJ once. Otherwise it is a normal replay or a concurrent run.
async function replayed(d: RefillDeps, r: Ref, now: Date): Promise<void> {
  try {
    await d.ddb.send(new UpdateCommand({ TableName: 'Orders', Key: { orderId: r.id }, UpdateExpression: 'SET refillStatus = :alerted, updatedAt = :now',
      ConditionExpression: 'refillStatus = :processing AND createdAt < :cutoff',
      ExpressionAttributeValues: { ':alerted': 'stuck-alerted', ':processing': 'processing', ':now': now.toISOString(), ':cutoff': new Date(now.getTime() - STUCK_MS).toISOString() } }));
  } catch (e) { if (isCcf(e)) { console.log('[refill] replay-skipped'); return; } throw e; }
  console.error('[refill] stuck-alerted');
  await tjMail(d, `[ACTION NEEDED] Push Patch refill may not have shipped (${r.id})`,
    `A paid refill started processing but did not finish. Check encounter pp-rf-${r.id} for contact ${r.contactId} and the Genesis email; ship manually if missing.`);
}

async function fulfill(d: RefillDeps, r: Ref): Promise<void> {
  const now = new Date();
  try {
    await d.ddb.send(new PutCommand({ TableName: 'Orders', ConditionExpression: 'attribute_not_exists(orderId)', Item: {
      orderId: r.id, contactId: r.contactId, email: r.email ?? '', amountUSD: r.amountCents / 100, currency: r.currency, paymentStatus: 'paid',
      sku: r.sku, ...(r.partnerRef ? { partnerCode: r.partnerRef } : {}), kind: REFILL_KIND, refill: true, refillStatus: 'processing',
      mode: d.livemode ? 'live' : 'test', createdAt: now.toISOString() } }));
  } catch (e) { if (isCcf(e)) return replayed(d, r, now); throw e; }

  const encounterId = `pp-rf-${r.id}`;
  let claimed = false;
  let outcome = 'shipped';
  try {
    const found = await getRefillAuth(r.contactId, r.parentId);
    const subId = r.subscriptionId ?? found?.auth.subscriptionId;
    if (found && r.subscriptionId) {
      if (r.billingReason === 'subscription_create') await setRefillAuthFields(r.contactId, r.parentId, { subscriptionId: r.subscriptionId, mode: 'auto' });
      // End auto-ship before a renewal that would fall on/after expiresAt. (Not cancel_at = expiresAt: Stripe always
      // prorates the period containing a future cancel_at, so the last box would be charged a partial amount.)
      if (r.periodEnd && r.periodEnd * 1000 >= Date.parse(found.auth.expiresAt)) await d.stripe.subscriptions.update(r.subscriptionId, { cancel_at_period_end: true });
    }
    const claim = await claimRefillSlot(r.contactId, r.parentId, now);
    claimed = true; // the Orders row now stays: a retry must not claim a second slot
    const base = { contactId: r.contactId, sk: `encounter#${encounterId}`, encounterId, lane: 'push-patch', category: 'push-patch',
      visitType: 'async', sku: r.sku, refillOf: r.parentId, sessionId: r.id, paymentIntentId: r.paymentIntentId,
      shipTo: found?.encounter?.shipTo, createdAt: now.toISOString(), updatedAt: now.toISOString() };

    if (!claim.ok) {
      outcome = 'routed';
      await d.ddb.send(new PutCommand({ TableName: 'PatientRecords', Item: { ...base, state: 'sent-to-provider', refillBlockedReason: claim.reason }, ConditionExpression: 'attribute_not_exists(sk)' }));
      if (subId) await d.stripe.subscriptions.update(subId, { cancel_at_period_end: true }); // nothing ships, so stop charging
      await tjMail(d, `[ACTION NEEDED] Push Patch refill payment received, not shipped (${r.id})`,
        `Payment received but refill authorization is used up/expired/inactive (${claim.reason}). Nothing was sent to Genesis${subId ? ' and auto-ship is set to end at period end' : ''}. Route to provider; refund if needed. Contact ${r.contactId}, encounter ${encounterId}.`);
      console.log('[refill] routed-to-provider', { reason: claim.reason });
    } else {
      await d.ddb.send(new PutCommand({ TableName: 'PatientRecords', Item: { ...base, state: 'script-written', refillNumber: claim.refillNumber }, ConditionExpression: 'attribute_not_exists(sk)' }));
      outcome = await ship(d, r, encounterId, claim, found?.encounter, subId);
    }
  } catch (e) {
    if (!claimed) { try { await d.ddb.send(new DeleteCommand({ TableName: 'Orders', Key: { orderId: r.id } })); } catch { /* best effort */ } throw e; }
    outcome = 'post-claim-error';
    console.error('[refill] post-claim-error'); await tjMail(d, `[ACTION NEEDED] Push Patch refill error after payment (${r.id})`, `A refill was paid and a slot claimed but processing failed. Contact ${r.contactId}, encounter ${encounterId}. Check and ship manually.`);
  }
  try {
    await d.ddb.send(new UpdateCommand({ TableName: 'Orders', Key: { orderId: r.id }, UpdateExpression: 'SET refillStatus = :s, updatedAt = :now',
      ExpressionAttributeValues: { ':s': outcome, ':now': new Date().toISOString() } }));
  } catch { console.error('[refill] order-status-failed'); }

  // LTV / customer upsert: best effort, after fulfilment so a retry can never double-add or block shipping.
  try {
    const info = await contactInfo(d, r.contactId, r.email);
    if (info.email) await upsertContact(d.ddb as any, { email: info.email, source: 'purchase:push-patch-refill', skus: [r.sku],
      amountUSD: r.amountCents / 100, ...(r.customerId ? { stripeCustomerId: r.customerId } : {}), stage: 'customer', event: { type: 'purchase' } } as any);
  } catch { console.error('[refill] ltv-upsert-failed'); }
}

async function ship(d: RefillDeps, r: Ref, encounterId: string, claim: { refillNumber: number; auth: any }, parent: any, subId?: string): Promise<string> {
  const info = await contactInfo(d, r.contactId, r.email);
  const name = `${info.firstName} ${info.lastName}`.trim();
  const shipTo = resolveShip(parent?.shipTo, undefined);
  if (!shipTo?.address?.line1) {
    console.error('[refill] no-ship-to');
    await tjMail(d, `[ACTION NEEDED] Push Patch refill NOT sent to Genesis (${r.id})`, `Refill ${claim.refillNumber} was paid but the original order has no ship-to address on file. Contact ${r.contactId}, encounter ${encounterId}. Send the order manually.`);
    return 'no-ship-to';
  }
  let sent: { to: string; toGenesis: boolean };
  try {
    // Stripe test mode never reaches Genesis: the form goes to TJ only.
    sent = await sendGenesisOrder({ signedAt: new Date().toISOString(), testOrder: !d.livemode || !!parent?.testOrder, tjOnly: !d.livemode, sku: r.sku, sessionId: r.id,
      clinicianName: parent?.signedByName, name, lastName: info.lastName, phone: info.phone, ship: shipTo });
    await stampGenesisSent(r.contactId, encounterId, sent.to, sent.toGenesis);
  } catch {
    console.error('[refill] genesis-failed');
    await tjMail(d, `[ACTION NEEDED] Push Patch refill NOT sent to Genesis (${r.id})`, `Refill ${claim.refillNumber} was paid but the Genesis order failed. Contact ${r.contactId}, encounter ${encounterId}. Send the order manually.`);
    return 'genesis-failed';
  }
  // Track the shipment on the parent: one-box refills schedule reorder reminders, auto-ship does not.
  try { await recordShipment(r.contactId, r.parentId, new Date(), !!r.oneBox); } catch { console.error('[refill] record-shipment-failed'); }
  const exhausted = claim.auth.status === 'exhausted' || claim.refillNumber >= claim.auth.refillsAuthorized;
  if (exhausted && subId) { try { await d.stripe.subscriptions.update(subId, { cancel_at_period_end: true }); } catch { console.error('[refill] cancel-at-period-end-failed'); } }
  const nextMs = r.periodEnd ? r.periodEnd * 1000 : Date.now() + REFILL_WEEKS_MS; // Stripe's renewal time when known
  const next = claim.auth.mode === 'auto' && !exhausted && nextMs < Date.parse(claim.auth.expiresAt)
    ? new Date(nextMs).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : undefined;
  const blendName = blendFor(r.sku).name;
  await Promise.allSettled([
    info.email ? sendRefillShipped({ to: info.email, firstName: info.firstName || 'there', blendName, refillNumber: claim.refillNumber, refillsAuthorized: claim.auth.refillsAuthorized, ...(next ? { nextChargeDate: next } : {}) }) : Promise.resolve(),
    sendRefillNotice({ name: name || r.contactId, blendName, refillNumber: claim.refillNumber, refillsAuthorized: claim.auth.refillsAuthorized, ref: r.id }),
  ]);
  console.log('[refill] shipped', { refillNumber: claim.refillNumber });
  return 'shipped';
}

export async function handleRefillInvoice(d: RefillDeps, type: string, inv: any): Promise<void> {
  const m = invoiceMeta(inv);
  if (m['kind'] !== REFILL_KIND || !m['contactId'] || !m['encounterId']) { console.log('[refill] invoice-skipped'); return; }
  const email = inv.customer_email ?? undefined;
  if (type === 'invoice.payment_failed') {
    // Stripe retries a failed renewal several times; email on the first failure only.
    if ((inv.attempt_count ?? 1) > 1) { console.log('[refill] payment-failed-retry'); return; }
    const info = await contactInfo(d, m['contactId'], email);
    if (info.email && inv.hosted_invoice_url) await Promise.allSettled([sendRefillPaymentFailed({ to: info.email, firstName: info.firstName || 'there', hostedInvoiceUrl: inv.hosted_invoice_url })]);
    await tjMail(d, `Push Patch refill payment failed (${inv.id})`, `Refill payment failed for contact ${m['contactId']}. The patient was emailed the invoice link. Nothing shipped.`);
    return;
  }
  if (type !== 'invoice.paid' || !(inv.amount_paid > 0)) { console.log('[refill] invoice-skipped'); return; }
  await fulfill(d, { id: inv.id, contactId: m['contactId'], parentId: m['encounterId'], sku: (m['skuIds'] ?? '').trim(), amountCents: inv.amount_paid,
    currency: inv.currency, partnerRef: m['partnerRef'], customerId: idOf(inv.customer), paymentIntentId: idOf(inv.payment_intent),
    subscriptionId: idOf(inv.subscription), billingReason: inv.billing_reason, periodEnd: periodEndOf(inv), email });
}

export async function handleRefillSession(d: RefillDeps, s: any): Promise<void> {
  const m: Meta = s.metadata ?? {};
  if (!m['contactId'] || !m['encounterId']) { console.log('[refill] session-skipped'); return; }
  const email: string | undefined = (typeof s.customer === 'object' ? s.customer?.email : undefined) ?? s.customer_details?.email ?? undefined;
  const customerId = idOf(s.customer);
  if (s.mode === 'subscription') {
    if (email) await upsertContact(d.ddb as any, { email, source: 'purchase:push-patch-refill', ...(customerId ? { stripeCustomerId: customerId } : {}), stage: 'customer', event: { type: 'purchase' } } as any);
    const subscriptionId = idOf(s.subscription);
    if (subscriptionId) await setRefillAuthFields(m['contactId'], m['encounterId'], { mode: 'auto', subscriptionId });
    console.log('[refill] subscription-session-recorded');
    return;
  }
  if (s.payment_status !== 'paid') { console.log('[refill] session-unpaid'); return; }
  await fulfill(d, { id: s.id, contactId: m['contactId'], parentId: m['encounterId'], sku: (m['skuIds'] ?? '').trim(), amountCents: s.amount_total ?? 0,
    currency: s.currency, partnerRef: m['partnerRef'], customerId, paymentIntentId: idOf(s.payment_intent), email, oneBox: true });
}
