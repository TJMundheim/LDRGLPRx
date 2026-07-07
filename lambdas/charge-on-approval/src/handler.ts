// charge-on-approval — AppSync DIRECT LAMBDA RESOLVER
//
// Charges a patient's saved card when a care coordinator approves an Rx script.
// Invoked by AppSync; receives the AppSync context shape.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { getStripeClient } from '@my4mlife/stripe-client';
import {
  RECORD_SK,
  encounterSk,
  auditSk,
} from '@my4mlife/patient-record';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const PATIENT_RECORDS_TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';
const TOUCHPOINTS_TABLE = process.env.TOUCHPOINTS_TABLE ?? 'Touchpoints';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppSyncEvent {
  arguments: {
    contactId: string;
    encounterId: string;
    amountCents: number;
    billingType: 'one_time' | 'subscription';
    interval?: 'month' | 'year';
    label?: string;
  };
  identity?: {
    groups?: string[];
    username?: string;
    [key: string]: unknown;
  };
}

export interface ChargeResult {
  ok: boolean;
  kind?: string;
  id?: string;
  status?: string;
  amountCents?: number;
  error?: string;
  code?: string;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler = async (event: AppSyncEvent): Promise<ChargeResult> => {
  // 1. Defense-in-depth auth: Admins group required
  const groups = event.identity?.groups ?? [];
  if (!groups.includes('Admins')) {
    throw new Error('Unauthorized: Admins group required');
  }

  const { contactId, encounterId, amountCents, billingType, interval, label } =
    event.arguments;

  // 2. Validate inputs
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  if (billingType !== 'one_time' && billingType !== 'subscription') {
    throw new Error("billingType must be 'one_time' or 'subscription'");
  }

  // 3. Read PatientRecords — both the record item and the encounter item
  // Fetch all items for this contactId and filter client-side
  // (DynamoDB KeyConditionExpression does not support IN on the sort key)
  const queryResult = await ddb.send(
    new QueryCommand({
      TableName: PATIENT_RECORDS_TABLE,
      KeyConditionExpression: 'contactId = :cid',
      ExpressionAttributeValues: {
        ':cid': contactId,
      },
    }),
  );

  const items = queryResult.Items ?? [];
  const recordItem = items.find((i) => i['sk'] === RECORD_SK) as
    | Record<string, unknown>
    | undefined;
  const encounterItem = items.find((i) => i['sk'] === encounterSk(encounterId)) as
    | Record<string, unknown>
    | undefined;

  if (!recordItem) {
    throw new Error(`Patient record not found for contactId: ${contactId}`);
  }
  if (!encounterItem) {
    throw new Error(`Encounter not found: ${encounterId}`);
  }

  // Encounter must be in 'script-written' state to charge
  if (encounterItem['state'] !== 'script-written') {
    throw new Error('encounter not approved for charge');
  }

  // Extract card / demographics from record
  const cardOnFile = (recordItem['cardOnFile'] ?? {}) as {
    stripeCustomerId?: string;
    paymentMethodId?: string;
    setupIntentId?: string;
  };
  const demographics = (recordItem['demographics'] ?? {}) as {
    email?: string;
    firstName?: string;
    lastName?: string;
  };

  const { paymentMethodId } = cardOnFile;
  if (!paymentMethodId) {
    throw new Error('No paymentMethodId on file for patient');
  }

  const stripe = await getStripeClient();

  // 4. Ensure a Stripe Customer with the card attached.
  // In the normal flow the card was captured via create-setup-intent against a
  // customer, so both ids are present and already attached. For older records
  // with no customer, create one and attach — using the id RETURNED by attach
  // (a test/reused token mints a new pm id on attach).
  let stripeCustomerId = cardOnFile.stripeCustomerId;
  let effectivePaymentMethodId = paymentMethodId;

  if (!stripeCustomerId) {
    const email = demographics.email ?? '';
    const name = [demographics.firstName, demographics.lastName]
      .filter(Boolean)
      .join(' ') || email;

    const customer = await stripe.customers.create({ email, name });
    stripeCustomerId = customer.id;

    const attached = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });
    effectivePaymentMethodId = attached.id;
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: effectivePaymentMethodId },
    });

    // Persist new stripeCustomerId + the attached payment-method id
    await ddb.send(
      new UpdateCommand({
        TableName: PATIENT_RECORDS_TABLE,
        Key: { contactId, sk: RECORD_SK },
        UpdateExpression:
          'SET cardOnFile.stripeCustomerId = :sid, cardOnFile.paymentMethodId = :pmid, updatedAt = :ua',
        ExpressionAttributeValues: {
          ':sid': stripeCustomerId,
          ':pmid': effectivePaymentMethodId,
          ':ua': new Date().toISOString(),
        },
      }),
    );
  }

  // 5. Charge — wrap in try/catch so Stripe card errors return {ok:false}
  let chargeId: string;
  let chargeStatus: string;
  const chargeKind = billingType;

  // Deterministic idempotency root: same encounter + amount ⇒ Stripe returns the
  // SAME charge on any retry instead of creating a second one (audit 2026-07-07).
  // A retry after a transient post-charge DDB/network failure can no longer
  // double-charge the patient's saved card.
  const idemRoot = `charge:${contactId}:${encounterId}:${amountCents}`;

  try {
    if (billingType === 'one_time') {
      const pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: effectivePaymentMethodId,
        off_session: true,
        confirm: true,
        description: label,
      }, { idempotencyKey: `${idemRoot}:pi` });
      chargeId = pi.id;
      chargeStatus = pi.status;
    } else {
      // subscription — idempotency keys on every create so a retry reuses the
      // same product/price/subscription rather than stacking duplicates.
      const product = await stripe.products.create({
        name: label || 'My4MLife Rx',
      }, { idempotencyKey: `${idemRoot}:prod` });
      const price = await stripe.prices.create({
        unit_amount: amountCents,
        currency: 'usd',
        recurring: { interval: interval ?? 'month' },
        product: product.id,
      }, { idempotencyKey: `${idemRoot}:price` });
      const sub = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: price.id }],
        default_payment_method: effectivePaymentMethodId,
        off_session: true,
      } as any, { idempotencyKey: `${idemRoot}:sub` });
      chargeId = sub.id;
      chargeStatus = sub.status;
    }
  } catch (err: unknown) {
    // Stripe errors (card_declined, authentication_required, etc.)
    const stripeErr = err as { message?: string; code?: string; type?: string };
    if (stripeErr.type?.startsWith('Stripe') || stripeErr.code) {
      return {
        ok: false,
        error: stripeErr.message ?? 'Stripe error',
        code: stripeErr.code ?? stripeErr.type ?? 'unknown',
      };
    }
    throw err; // non-Stripe errors bubble up
  }

  // Guard: only treat as paid when the charge actually cleared. A subscription
  // whose first invoice fails comes back 'incomplete'/'past_due'; a one-time PI
  // can be 'requires_action'. Don't mark the encounter fulfilled in those cases
  // (audit 2026-07-07).
  const paidOk = chargeKind === 'one_time'
    ? chargeStatus === 'succeeded'
    : chargeStatus === 'active' || chargeStatus === 'trialing';
  if (!paidOk) {
    return { ok: false, error: `payment not completed (status: ${chargeStatus})`, code: 'payment_incomplete' };
  }

  // 6. On success: write Touchpoint, update encounter → 'fulfilled', write audit
  const now = new Date().toISOString();

  // Touchpoint — idempotent
  try {
    await ddb.send(
      new PutCommand({
        TableName: TOUCHPOINTS_TABLE,
        Item: {
          contactId,
          sk: `stripe#${chargeId}`,
          chargeId,
          chargeKind,
          amountCents,
          ts: now,
        },
        ConditionExpression: 'attribute_not_exists(sk)',
      }),
    );
  } catch (err: unknown) {
    if ((err as { name?: string }).name !== 'ConditionalCheckFailedException') {
      throw err;
    }
    // already written — idempotent, continue
  }

  // Update encounter → 'fulfilled'
  await ddb.send(
    new UpdateCommand({
      TableName: PATIENT_RECORDS_TABLE,
      Key: { contactId, sk: encounterSk(encounterId) },
      UpdateExpression:
        'SET #state = :state, chargedAmountCents = :amt, chargeRef = :ref, chargeKind = :kind, chargedAt = :cat, updatedAt = :ua',
      ExpressionAttributeNames: { '#state': 'state' },
      ExpressionAttributeValues: {
        ':state': 'fulfilled',
        ':amt': amountCents,
        ':ref': chargeId,
        ':kind': chargeKind,
        ':cat': now,
        ':ua': now,
      },
    }),
  );

  // Write audit entry
  const auditTs = now;
  const dollarAmount = (amountCents / 100).toFixed(2);
  await ddb.send(
    new PutCommand({
      TableName: PATIENT_RECORDS_TABLE,
      Item: {
        contactId,
        sk: auditSk(auditTs, 0),
        at: auditTs,
        action: `charged: $${dollarAmount} ${chargeKind}`,
        detail: `chargeRef=${chargeId}`,
        actor: 'coordinator',
      },
    }),
  );

  return {
    ok: true,
    kind: chargeKind,
    id: chargeId,
    status: chargeStatus,
    amountCents,
  };
};
