import { InvokeCommand } from '@aws-sdk/client-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { sendOrderReceivedEmail } from './order-received-email.js';

type Lambda = { send: (cmd: InvokeCommand) => Promise<{ FunctionError?: string; Payload?: Uint8Array }> };
type Args = {
  ddb: { send: (cmd: PutCommand) => Promise<unknown> };
  lambda: Lambda;
  emailFn: string;
  session: { id: string; payment_status?: string | null; payment_intent?: unknown; customer_details?: { email?: string | null } | null; metadata?: Record<string, string> | null };
  contactId: string;
  skuId: string;
  email: string;
  firstName: string | undefined;
};

/** Sync-invoke push-patch-intake finalize. Returns its result; any failure throws (Stripe retry). */
async function finalize(lambda: Lambda, sessionId: string, intakeId: string): Promise<'ok' | 'already' | 'missing'> {
  const r = await lambda.send(new InvokeCommand({
    FunctionName: process.env['PUSH_PATCH_INTAKE_FN'] ?? 'my4mlife-push-patch-intake',
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ mode: 'finalize', sessionId, intakeId })),
  }));
  if (r.FunctionError) throw new Error('push-patch finalize failed');
  const out = r.Payload ? JSON.parse(new TextDecoder().decode(r.Payload)) as { result?: string } : {};
  if (out.result === 'ok' || out.result === 'already' || out.result === 'missing') return out.result;
  throw new Error('push-patch finalize returned an unexpected result');
}

/**
 * Block 4c. With metadata.intakeId (pay-last flow): finalize, then write the marker
 * stamped intakeSubmittedAt (reminders skip it) and send the receipt only if the marker
 * is new. Finalize failure throws with no marker. 'missing' / no intakeId = legacy path.
 * Marker/email failures never fail the order.
 */
export async function handlePushPatchOrder(a: Args): Promise<void> {
  const { session } = a;
  // Delayed methods (ACH): 'completed' arrives unpaid; wait for async_payment_succeeded (finalize needs paid).
  if (session.payment_status === 'unpaid') {
    console.log('[order-handler] push-patch session unpaid; awaiting async_payment_succeeded', { orderId: session.id });
    return;
  }
  const intakeId = session.metadata?.['intakeId']?.trim();
  const result = intakeId ? await finalize(a.lambda, session.id, intakeId) : 'missing';
  const finalized = result !== 'missing';
  try {
    const createdAt = new Date();
    await a.ddb.send(new PutCommand({
      TableName: 'Touchpoints',
      Item: {
        contactId: a.contactId,
        sk: `PUSH_PATCH_PENDING#${session.id}`,
        sessionId: session.id,
        skuId: a.skuId,
        paymentIntentId: session.payment_intent as string,
        email: session.customer_details?.email,
        createdAt: createdAt.toISOString(),
        intakeDue: new Date(createdAt.getTime() + 30 * 60 * 1000).toISOString(),
        remindersSent: 0,
        ...(finalized ? { intakeSubmittedAt: createdAt.toISOString() } : {}),
      },
      ConditionExpression: 'attribute_not_exists(sk)',
    }));
    if (a.email) {
      await sendOrderReceivedEmail(a.lambda, a.emailFn, {
        to: a.email, sessionId: session.id, firstName: a.firstName, kind: finalized ? 'receipt' : 'finish-form',
      });
    }
  } catch (err: unknown) {
    if ((err as { name?: string }).name !== 'ConditionalCheckFailedException') {
      console.error('[order-handler] push-patch pending marker write failed', { orderId: session.id, error: String(err) });
    }
  }
}
