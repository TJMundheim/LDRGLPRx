// Push Patch refills: paid invoices (auto-ship) and one-box checkout sessions fulfil a refill against
// the parent encounter's refillAuth. Logs carry outcome codes only (no PHI/PII).
import { InvokeCommand } from '@aws-sdk/client-lambda';
import { GetCommand, PutCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { upsertContact } from '@my4mlife/contact-upsert';
import {
  claimRefillSlot, getRefillAuth, setRefillAuthFields, recordShipment, sendGenesisOrder, stampGenesisSent, resolveShip, blendFor,
  sendRefillShipped, sendRefillNotice, sendRefillPaymentFailed, sendRefillPreparing, buildManualRefillOrderEmail, rxProduct,
} from '@my4mlife/push-patch-decision-core';

export const REFILL_KIND = 'push-patch-refill';
const TJ = 'drtj@my4mlife.com';
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
const manualOf = (m: Meta): { manual: true; product?: string } | Record<string, never> => (m['fulfillment'] === 'manual' ? { manual: true, product: m['product'] } : {});
const isCcf = (e: unknown) => (e as { name?: string }).name === 'ConditionalCheckFailedException';
const idOf = (v: any): string | undefined => (typeof v === 'string' ? v : v?.id) || undefined;
// Service period end (unix s) of a subscription invoice = the next renewal. Latest line period end.
const periodEndOf = (inv: any): number | undefined =>
  Math.max(0, ...((inv?.lines?.data ?? []) as any[]).map((l) => Number(l?.period?.end) || 0)) || undefined;

// Returns false when the email-sender invoke failed (callers that must not lose the notice record that).
async function tjMail(d: RefillDeps, subject: string, text: string, html?: string): Promise<boolean> {
  try {
    await d.lambda.send(new InvokeCommand({
      FunctionName: d.emailFn, InvocationType: 'Event',
      Payload: Buffer.from(JSON.stringify({ kind: 'info', to: TJ, subject, html: html ?? `<p>${text}</p>`, text })),
    }));
    return true;
  } catch { console.error('[refill] tj-mail-failed'); return false; }
}

async function contactInfo(d: RefillDeps, contactId: string, fallbackEmail?: string) {
  const c = (await d.ddb.send(new GetCommand({ TableName: 'Contact', Key: { contactId } }))).Item ?? {};
  const rec = (await d.ddb.send(new GetCommand({ TableName: 'PatientRecords', Key: { contactId, sk: 'record' } }))).Item?.demographics ?? {};
  const email: string = c.email || rec.email || fallbackEmail || '';
  const firstName: string = c.firstName || rec.firstName || '';
  return { email, firstName, lastName: String(rec.lastName ?? ''), phone: String(rec.phone ?? '') };
}

type Ref = { id: string; contactId: string; parentId: string; sku: string; amountCents: number; currency?: string; partnerRef?: string;
  customerId?: string; paymentIntentId?: string; subscriptionId?: string; billingReason?: string; periodEnd?: number; email?: string; oneBox?: boolean; manual?: boolean; product?: string };

// Replay of an order id already written. A row still 'processing' past STUCK_MS means the first run died mid-way
// (paid, maybe not shipped): tell TJ once. Otherwise it is a normal replay or a concurrent run.
async function replayed(d: RefillDeps, r: Ref, now: Date): Promise<void> {
  try {
    await d.ddb.send(new UpdateCommand({ TableName: 'Orders', Key: { orderId: r.id }, UpdateExpression: 'SET refillStatus = :alerted, updatedAt = :now',
      ConditionExpression: 'refillStatus = :processing AND createdAt < :cutoff',
      ExpressionAttributeValues: { ':alerted': 'stuck-alerted', ':processing': 'processing', ':now': now.toISOString(), ':cutoff': new Date(now.getTime() - STUCK_MS).toISOString() } }));
  } catch (e) { if (isCcf(e)) { console.log('[refill] replay-skipped'); return; } throw e; }
  console.error('[refill] stuck-alerted');
  await tjMail(d, `[ACTION NEEDED] ${r.manual ? 'Rx' : 'Push Patch'} refill may not have shipped (${r.id})`,
    r.manual ? `A paid refill started processing but did not finish. Check encounter rx-rf-${r.id} for contact ${r.contactId}; you may not have received the pharmacy-order email, so place the order manually if missing.`
      : `A paid refill started processing but did not finish. Check encounter pp-rf-${r.id} for contact ${r.contactId} and the Genesis email; ship manually if missing.`);
}

async function fulfill(d: RefillDeps, r: Ref): Promise<void> {
  const now = new Date();
  try {
    await d.ddb.send(new PutCommand({ TableName: 'Orders', ConditionExpression: 'attribute_not_exists(orderId)', Item: {
      orderId: r.id, contactId: r.contactId, email: r.email ?? '', amountUSD: r.amountCents / 100, currency: r.currency, paymentStatus: 'paid',
      sku: r.sku, ...(r.partnerRef ? { partnerCode: r.partnerRef } : {}), kind: REFILL_KIND, refill: true, refillStatus: 'processing', ...(r.manual ? { fulfillment: 'manual', product: r.product } : {}),
      mode: d.livemode ? 'live' : 'test', createdAt: now.toISOString() } }));
  } catch (e) { if (isCcf(e)) return replayed(d, r, now); throw e; }

  let encounterId = `pp-rf-${r.id}`; // manual-pharmacy refills use rx-rf-<id> (decided from the stored auth below)
  let claimed = false;
  let outcome = 'shipped';
  try {
    const found = await getRefillAuth(r.contactId, r.parentId);
    // The stored auth decides the lane; with no auth (routed below), fall back to the checkout metadata.
    const manual = found ? found.auth.fulfillment === 'manual' : !!r.manual;
    if (manual) encounterId = `rx-rf-${r.id}`; // the Novo tracking reader scans encounter#pp-, so it ignores these
    const subId = r.subscriptionId ?? found?.auth.subscriptionId;
    if (found && r.subscriptionId) {
      if (r.billingReason === 'subscription_create') await setRefillAuthFields(r.contactId, r.parentId, { subscriptionId: r.subscriptionId, mode: 'auto' });
      // End auto-ship before a renewal that would fall on/after expiresAt. (Not cancel_at = expiresAt: Stripe always
      // prorates the period containing a future cancel_at, so the last box would be charged a partial amount.)
      if (r.periodEnd && r.periodEnd * 1000 >= Date.parse(found.auth.expiresAt)) await d.stripe.subscriptions.update(r.subscriptionId, { cancel_at_period_end: true });
    }
    const claim = await claimRefillSlot(r.contactId, r.parentId, now);
    claimed = true; // the Orders row now stays: a retry must not claim a second slot
    const base = { contactId: r.contactId, sk: `encounter#${encounterId}`, encounterId, lane: manual ? (found?.encounter?.lane ?? 'rx-refill') : 'push-patch', category: manual ? 'rx-refill' : 'push-patch', // never copy the parent's category (e.g. care-coordinator: coordinator-brief looks those up)
      visitType: 'async', sku: r.sku, refillOf: r.parentId, sessionId: r.id, paymentIntentId: r.paymentIntentId,
      shipTo: found?.auth.shipTo ?? found?.encounter?.shipTo, createdAt: now.toISOString(), updatedAt: now.toISOString() };

    if (!claim.ok) {
      outcome = 'routed';
      await d.ddb.send(new PutCommand({ TableName: 'PatientRecords', Item: { ...base, state: 'sent-to-provider', refillBlockedReason: claim.reason }, ConditionExpression: 'attribute_not_exists(sk)' }));
      if (subId) await d.stripe.subscriptions.update(subId, { cancel_at_period_end: true }); // nothing ships, so stop charging
      await tjMail(d, `[ACTION NEEDED] ${manual ? 'Rx' : 'Push Patch'} refill payment received, not shipped (${r.id})`,
        `Payment received but refill authorization is used up/expired/inactive (${claim.reason}). Nothing was sent to ${manual ? 'the pharmacy' : 'Genesis'}${subId ? ' and auto-ship is set to end at period end' : ''}. Route to provider; refund if needed. Contact ${r.contactId}, encounter ${encounterId}.`);
      console.log('[refill] routed-to-provider', { reason: claim.reason });
    } else {
      await d.ddb.send(new PutCommand({ TableName: 'PatientRecords', Item: { ...base, state: manual ? 'pharmacy-order-pending' : 'script-written', refillNumber: claim.refillNumber }, ConditionExpression: 'attribute_not_exists(sk)' }));
      outcome = await (manual ? shipManual : ship)(d, r, encounterId, claim, found?.encounter, subId, found?.auth.shipTo, found?.auth.shipToUpdatedAt);
    }
  } catch (e) {
    if (!claimed) { try { await d.ddb.send(new DeleteCommand({ TableName: 'Orders', Key: { orderId: r.id } })); } catch { /* best effort */ } throw e; }
    outcome = 'post-claim-error';
    console.error('[refill] post-claim-error'); const rxLane = encounterId.startsWith('rx-rf-');
    await tjMail(d, `[ACTION NEEDED] ${rxLane ? 'Rx' : 'Push Patch'} refill error after payment (${r.id})`, `A refill was paid and a slot claimed but processing failed. Contact ${r.contactId}, encounter ${encounterId}. Check and ${rxLane ? 'place the pharmacy order' : 'ship'} manually.`);
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

// Shared by both lanes once a fill is on its way: track the shipment on the parent (one-box refills schedule reorder
// reminders, auto-ship does not), end auto-ship when the last slot is taken, and work out the next charge date.
async function afterShip(d: RefillDeps, r: Ref, claim: { refillNumber: number; auth: any }, subId?: string, intervalDays?: number): Promise<string | undefined> {
  try { await (intervalDays === undefined ? recordShipment(r.contactId, r.parentId, new Date(), !!r.oneBox) : recordShipment(r.contactId, r.parentId, new Date(), !!r.oneBox, intervalDays)); }
  catch { console.error('[refill] record-shipment-failed'); }
  const exhausted = claim.auth.status === 'exhausted' || claim.refillNumber >= claim.auth.refillsAuthorized;
  if (exhausted && subId) { try { await d.stripe.subscriptions.update(subId, { cancel_at_period_end: true }); } catch { console.error('[refill] cancel-at-period-end-failed'); } }
  const nextMs = r.periodEnd ? r.periodEnd * 1000 : Date.now() + (intervalDays ?? 42) * 86_400_000; // Stripe's renewal time when known
  return claim.auth.mode === 'auto' && !exhausted && nextMs < Date.parse(claim.auth.expiresAt)
    ? new Date(nextMs).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : undefined;
}

// Manual pharmacy lane (e.g. Gut-Brain Rx): no pharmacy API. TJ gets an ACTION NEEDED email with what he needs to place the
// order by hand (name, phone, ship-to, product: no health answers); the patient is told we are preparing it (no tracking).
async function shipManual(d: RefillDeps, r: Ref, encounterId: string, claim: { refillNumber: number; auth: any }, parent: any, subId?: string, newShipTo?: any): Promise<string> {
  const info = await contactInfo(d, r.contactId, r.email);
  const product = rxProduct(claim.auth.product);
  if (!product) { await tjMail(d, `[ACTION NEEDED] Rx refill paid, unknown product (${r.id})`, `Refill ${claim.refillNumber} was paid but its product is not in the catalog. Contact ${r.contactId}, encounter ${encounterId}. Place the order manually.`); return 'unknown-product'; }
  const shipTo = newShipTo ?? parent?.shipTo;
  const hasShip = !!shipTo?.line1;
  const mail = buildManualRefillOrderEmail({ productName: product.name, firstName: info.firstName, lastName: info.lastName, phone: info.phone, refillNumber: claim.refillNumber,
    refillsAuthorized: claim.auth.refillsAuthorized, ref: r.id, ...(hasShip ? { shipTo } : {}), ...(parent?.dose ? { dose: String(parent.dose) } : {}) }); // GLP-1: physician-approved dose
  const mailed = await tjMail(d, `${d.livemode ? '' : '[TEST] '}${mail.subject}`, mail.text, mail.html);
  const next = await afterShip(d, r, claim, subId, product.intervalDays);
  if (!hasShip) { console.error('[refill] no-ship-to'); return 'no-ship-to'; }
  if (info.email) await Promise.allSettled([sendRefillPreparing({ to: info.email, firstName: info.firstName || 'there', productName: product.name, refillNumber: claim.refillNumber, refillsAuthorized: claim.auth.refillsAuthorized, ...(next ? { nextChargeDate: next } : {}) })]);
  console.log('[refill] manual-order-emailed', { refillNumber: claim.refillNumber });
  return mailed ? 'pharmacy-order-pending' : 'tj-mail-failed';
}

async function ship(d: RefillDeps, r: Ref, encounterId: string, claim: { refillNumber: number; auth: any }, parent: any, subId?: string, newShipTo?: any, shipToUpdatedAt?: string): Promise<string> {
  const info = await contactInfo(d, r.contactId, r.email);
  const name = `${info.firstName} ${info.lastName}`.trim();
  const shipTo = resolveShip(newShipTo ?? parent?.shipTo, undefined); // patient-updated address wins; never logged
  // TJ notice flags an updated address whenever refillAuth.shipTo exists (simple; the date lets TJ judge freshness).
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
  const next = await afterShip(d, r, claim, subId);
  const blendName = blendFor(r.sku).name;
  await Promise.allSettled([
    info.email ? sendRefillShipped({ to: info.email, firstName: info.firstName || 'there', blendName, refillNumber: claim.refillNumber, refillsAuthorized: claim.auth.refillsAuthorized, ...(next ? { nextChargeDate: next } : {}) }) : Promise.resolve(),
    sendRefillNotice({ name: name || r.contactId, blendName, refillNumber: claim.refillNumber, refillsAuthorized: claim.auth.refillsAuthorized, ref: r.id, ...(newShipTo && shipToUpdatedAt ? { shipToUpdatedAt } : {}) }),
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
    const rx = m['fulfillment'] === 'manual' ? rxProduct(m['product']) : undefined; // manual Rx: product-named copy, never Push Patch
    if (info.email && inv.hosted_invoice_url) await Promise.allSettled([sendRefillPaymentFailed({ to: info.email, firstName: info.firstName || 'there', hostedInvoiceUrl: inv.hosted_invoice_url, ...(rx ? { productName: rx.name } : {}) })]);
    await tjMail(d, `${rx ? 'Rx' : 'Push Patch'} refill payment failed (${inv.id})`, `Refill payment failed for contact ${m['contactId']}. The patient was emailed the invoice link. Nothing ${rx ? 'was ordered' : 'shipped'}.`);
    return;
  }
  if (type !== 'invoice.paid' || !(inv.amount_paid > 0)) { console.log('[refill] invoice-skipped'); return; }
  // GLP-1 auto-ship: the first invoice pays for the order just placed (fulfilled by approval), only renewals are refills.
  if (m['lane'] === 'glp1' && inv.billing_reason === 'subscription_create') { console.log('[refill] glp1-first-invoice-skipped'); return; }
  await fulfill(d, { id: inv.id, contactId: m['contactId'], parentId: m['encounterId'], sku: (m['skuIds'] ?? '').trim(), amountCents: inv.amount_paid,
    currency: inv.currency, partnerRef: m['partnerRef'], customerId: idOf(inv.customer), paymentIntentId: idOf(inv.payment_intent),
    subscriptionId: idOf(inv.subscription), billingReason: inv.billing_reason, periodEnd: periodEndOf(inv), email, ...manualOf(m) });
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
    currency: s.currency, partnerRef: m['partnerRef'], customerId, paymentIntentId: idOf(s.payment_intent), email, oneBox: true, ...manualOf(m) });
}
