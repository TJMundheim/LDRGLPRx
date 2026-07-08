import { getStripeClient } from '@my4mlife/stripe-client';
import { resolveContactId } from '@my4mlife/contact-id';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const REGION = 'us-east-2';
const DIGITAL_BUCKET = process.env['DIGITAL_FULFILLMENT_BUCKET'] ?? 'my4mlife-digital-fulfillment';
const EMAIL_SENDER_FN = process.env['EMAIL_SENDER_FN'] ?? 'my4mlife-email-sender';
const PROTEGE_SIGNUP_FN = process.env['PROTEGE_SIGNUP_FN'] ?? 'my4mlife-protege-signup';
const DIGITAL_URL_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

// SKUs that grant Protégé membership on purchase. The buyer is signed up
// as a Protégé via the standard protege-signup flow using the customer
// info Stripe collected at checkout (name, email, phone). When set, the
// welcome email omits the book card so the buyer of the app-only SKU
// doesn't think the book was included in their $69.99 purchase.
const PROTEGE_MEMBERSHIP_SKUS: Record<string, { welcomeVariant: 'standard' | 'app-only' }> = {
  'app-access': { welcomeVariant: 'app-only' },
};

// SKU → digital asset map. Adding a new digital product is one entry:
// upload PDF to S3 under `s3Key`, add a row here, create Stripe price.
type DigitalAsset = { name: string; s3Key: string; subjectLine: string; bodyIntro: string };
const DIGITAL_PRODUCTS: Record<string, DigitalAsset> = {
  'cohort-workbook': {
    name: 'Cohort Workbook',
    s3Key: 'cohort-workbook-v1.pdf',
    subjectLine: 'Your My4MLife Cohort Workbook is ready to download',
    bodyIntro: 'Thanks for purchasing the My4MLife Cohort Workbook. Your download link is below — valid for 7 days. If you need a fresh link after that, just reply to this email and we will send one.',
  },
  'begin-with-the-end-in-mind': {
    name: 'Begin with the End in Mind',
    s3Key: 'begin-with-the-end-in-mind-v1.pdf',
    subjectLine: 'Your copy of Begin with the End in Mind is ready to download',
    bodyIntro: 'Thanks for purchasing Begin with the End in Mind. Your download link is below — valid for 7 days. The book has 17 chapters plus an Action Guide (Part V) you can print or screenshot as a daily scorecard. If you need a fresh link after the 7 days, just reply to this email and we will send one.',
  },
};

function makeDdb() {
  return DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
}

const s3 = new S3Client({ region: REGION });
const lambda = new LambdaClient({ region: REGION });

async function deliverDigitalAsset(args: { skuId: string; asset: DigitalAsset; email: string; firstName: string | undefined; orderId: string }): Promise<void> {
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: DIGITAL_BUCKET, Key: args.asset.s3Key }), { expiresIn: DIGITAL_URL_TTL_SEC });
  const greeting = args.firstName ? `Hi ${esc(args.firstName)},` : 'Hi,';
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#0a1628;line-height:1.55">
<h1 style="font-size:22px;margin:0 0 12px">${greeting}</h1>
<p style="margin:8px 0 16px">${esc(args.asset.bodyIntro)}</p>
<p style="margin:24px 0"><a href="${url}" style="background:#00b894;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Download ${esc(args.asset.name)} (PDF) &rarr;</a></p>
<p style="color:#555;font-size:13px;margin:24px 0 0">If the button doesn't work, paste this link into your browser:<br/><a href="${url}" style="color:#00a381;word-break:break-all">${esc(url)}</a></p>
<p style="color:#666;font-size:13px;margin-top:24px">Order reference: ${esc(args.orderId)}</p>
<p style="color:#666;font-size:13px;margin-top:24px">Begin with the end in mind. — Dr. TJ &amp; the My4MLife team</p>
</div>`;
  const payload = { kind: 'info', to: args.email, subject: args.asset.subjectLine, html };
  await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'Event',
    Payload: Buffer.from(JSON.stringify(payload)),
  }));
}

function esc(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export async function processEvent(e: { id: string; type: string; livemode: boolean }): Promise<void> {
  const stripe = await getStripeClient({ livemode: e.livemode });

  // e.id is the Stripe EVENT id (evt_...). Retrieve the event to get the
  // canonical object id (cs_... checkout session).
  const evt = await stripe.events.retrieve(e.id);
  const sessionId = (evt.data.object as { id?: string }).id;
  if (!sessionId) throw new Error(`order-handler: event ${e.id} has no data.object.id`);

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'customer'],
  });

  const ddb = makeDdb();
  const now = new Date().toISOString();
  const mode = e.livemode ? 'live' : 'test';

  const email =
    (typeof session.customer === 'object' && session.customer !== null
      ? (session.customer as { email?: string }).email
      : undefined) ??
    session.customer_details?.email ??
    '';

  const metadataContactId = (session.metadata as Record<string, string> | null)?.['contactId'] ?? null;
  const contactId = resolveContactId({ metadataContactId, email });
  if (!contactId) {
    // Anonymous purchase with no contact context — refuse rather than
    // collapse into a corrupt {email:''} Contact row. DLQ will surface
    // upstream data issues.
    throw new Error(`order-handler: cannot resolve contactId for session ${session.id} (no metadata.contactId, no email)`);
  }

  const amountUSD = (session.amount_total ?? 0) / 100;

  // 1. Orders insert FIRST — keyed by session ID, idempotent via condition.
  // We use the success of this insert as the "this is a new order" signal so
  // that LTV is only incremented once even if the event is retried.
  let isNewOrder = true;
  try {
    await ddb.send(
      new PutCommand({
        TableName: 'Orders',
        Item: {
          orderId: session.id,
          contactId,
          email,
          amountUSD,
          currency: session.currency,
          paymentStatus: session.payment_status,
          mode,
          createdAt: now,
        },
        ConditionExpression: 'attribute_not_exists(orderId)',
      })
    );
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      isNewOrder = false;
    } else {
      throw err;
    }
  }

  // 2. Contact upsert — only increment LTV if this is a new order.
  const updateExpr = [
    'SET lastPurchaseAt = :now',
    'updatedAt = :now',
    'hasUsedFirstPurchaseDiscount = :true',
  ];
  const values: Record<string, unknown> = { ':now': now, ':true': true };
  if (isNewOrder) {
    updateExpr.push('lifetimeValueUSD = if_not_exists(lifetimeValueUSD, :zero) + :amount');
    values[':zero'] = 0;
    values[':amount'] = amountUSD;
  }
  await ddb.send(
    new UpdateCommand({
      TableName: 'Contact',
      Key: { contactId },
      UpdateExpression: updateExpr.join(', '),
      ExpressionAttributeValues: values,
    })
  );

  // 3. Touchpoints insert — composite PK contactId + sk. Idempotent via
  // attribute_not_exists(sk) so a retry of the same event is a no-op.
  // We use first-time touchpoint creation as the signal that this is the
  // initial run of this event (vs an EventBridge retry), gating any
  // side-effecting follow-ups like digital fulfillment emails.
  let firstRun = true;
  try {
    await ddb.send(
      new PutCommand({
        TableName: 'Touchpoints',
        Item: {
          contactId,
          sk: `stripe#${e.id}`,
          stripeEventId: e.id,
          eventType: e.type,
          sessionId: session.id,
          email,
          mode,
          ts: now,
        },
        ConditionExpression: 'attribute_not_exists(sk)',
      })
    );
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      firstRun = false;
    } else {
      throw err;
    }
  }

  const skuId = ((session.metadata as Record<string, string> | null)?.['skuIds'] ?? '').trim();

  // Run a side-effect at most once across EventBridge retries, but re-attempt
  // it if it (or a later step) failed. We claim a per-effect marker up front;
  // on failure we DELETE the marker so the retry runs the effect again. This
  // replaces the old firstRun gate that skipped fulfillment on any retry —
  // which left paying customers with no book/workbook/app (audit #11).
  async function deliverOnce(markerSk: string, fn: () => Promise<void>): Promise<void> {
    try {
      await ddb.send(new PutCommand({
        TableName: 'Touchpoints',
        Item: { contactId, sk: markerSk, kind: 'fulfillment-marker', stripeEventId: e.id, ts: now },
        ConditionExpression: 'attribute_not_exists(sk)',
      }));
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'ConditionalCheckFailedException') return; // already delivered
      throw err;
    }
    try {
      await fn();
    } catch (err) {
      try { await ddb.send(new DeleteCommand({ TableName: 'Touchpoints', Key: { contactId, sk: markerSk } })); } catch { /* best-effort rollback */ }
      throw err;
    }
  }

  // 4. Digital fulfillment — idempotent across retries via its own marker.
  {
    const asset = skuId ? DIGITAL_PRODUCTS[skuId] : undefined;
    if (asset && email) {
      const firstName = ((session.metadata as Record<string, string> | null)?.['firstName'] ?? '').trim() || undefined;
      try {
        await deliverOnce(`fulfill-digital#${e.id}`, () =>
          deliverDigitalAsset({ skuId, asset, email, firstName, orderId: session.id }));
      } catch (err) {
        console.error('[order-handler] digital fulfillment failed', { orderId: session.id, skuId, error: String(err) });
        throw err; // EB retries; marker rolled back so delivery re-attempts
      }
    }
  }

  if (firstRun) {
    // 4b. Physical-product coordinator notification — Biome NS Ultra ships
    // manually (coordinator fulfills until the distribution partner is live).
    // Fire-and-forget: a notification failure must never fail the order.
    if (skuId.startsWith('biome-ns-ultra')) {
      try {
        const ship = (session as unknown as { shipping_details?: { name?: string; address?: Record<string, string | null> } }).shipping_details;
        const a = ship?.address ?? {};
        const addressHtml = [ship?.name, a.line1, a.line2, `${a.city ?? ''}, ${a.state ?? ''} ${a.postal_code ?? ''}`, a.country]
          .filter(Boolean).join('<br>');
        const billing = skuId.endsWith('-sub') ? 'Monthly subscription ($129/mo)' : 'One-time ($149)';
        await lambda.send(new InvokeCommand({
          FunctionName: process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender',
          InvocationType: 'Event',
          Payload: Buffer.from(JSON.stringify({
            kind: 'info',
            to: 'drtj@my4mlife.com',
            subject: `New Biome NS Ultra order — ${billing}`,
            html: `<p><strong>New Biome NS Ultra order</strong></p>
<p>Customer: ${email}<br>Billing: ${billing}<br>Amount: $${((session.amount_total ?? 0) / 100).toFixed(2)}<br>Order/session: ${session.id}</p>
<p><strong>Ship to:</strong><br>${addressHtml || '(no shipping address on session — check Stripe dashboard)'}</p>`,
          })),
        }));
      } catch (err) {
        console.error('[order-handler] coordinator order notification failed', { orderId: session.id, error: String(err) });
      }
    }

  }

  // 5. Protégé membership grant — idempotent across retries via its own marker
  // (audit #11: previously skipped on any retry, so a customer who paid for
  // app-access could end up with no account).
  const membership = skuId ? PROTEGE_MEMBERSHIP_SKUS[skuId] : undefined;
  if (membership && email) {
    const customerName = session.customer_details?.name ?? (session.metadata as Record<string, string> | null)?.['firstName'] ?? '';
    const firstName = customerName.trim().split(/\s+/)[0] || 'Friend';
    const phone = session.customer_details?.phone
      ?? (session.metadata as Record<string, string> | null)?.['phone']
      ?? '';
    try {
      await deliverOnce(`fulfill-protege#${e.id}`, () => lambda.send(new InvokeCommand({
        FunctionName: PROTEGE_SIGNUP_FN,
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify({
          body: JSON.stringify({
            firstName,
            email,
            phone: phone || '+10000000000', // protege-signup requires E.164; fallback if Stripe didn't collect
            consent: { ai: true, protege: true },
            welcomeEmailVariant: membership.welcomeVariant,
          }),
          requestContext: { http: { method: 'POST' } },
          headers: { 'content-type': 'application/json' },
        })),
      }).then(() => undefined)));
    } catch (err) {
      console.error('[order-handler] Protégé membership grant failed', { orderId: session.id, skuId, error: String(err) });
      throw err;
    }
  }
}
