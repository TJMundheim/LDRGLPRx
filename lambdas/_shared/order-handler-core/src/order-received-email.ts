import { InvokeCommand } from '@aws-sdk/client-lambda';

// Copy: docs/launch/push-patch/async-visit-copy.md "Order-received email (2026-10-15)".
// Generic process text only; no PHI (first name + session link, nothing else).
const BASE = process.env['INTAKE_BASE_URL'] ?? 'https://www.my4mlife.com/go/push-patch/thank-you';
export const ORDER_RECEIVED_SUBJECT = 'Your Push Patch order is in — one 2-minute step left';

function esc(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function composeOrderReceived(sessionId: string, firstName?: string): { subject: string; html: string } {
  const link = `${BASE}?session_id=${encodeURIComponent(sessionId)}`;
  const name = firstName?.trim() ? esc(firstName.trim()) : 'there';
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#0a1628;line-height:1.55">
<p>Hi ${name},</p>
<p>Thank you for your order. One step is left before it can ship: a short health questionnaire so one of our network&#39;s licensed physicians can review it. It takes about 2 minutes.</p>
<p style="margin:24px 0"><a href="${link}" style="background:#00b894;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Finish your questionnaire</a></p>
<p>Review happens within an hour during business hours, 9 a.m.&ndash;5 p.m. Central. If you are not cleared, your payment is refunded within 10 business days.</p>
<p>If you&#39;ve already finished, you can ignore this email. Questions? Reply here.</p>
<p>The My4MLife team</p>
<p style="color:#666;font-size:13px;margin-top:32px">My4MLife</p>
<p style="color:#666;font-size:12px"><em>These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, prevent or alleviate any condition. Results vary by person.</em></p>
</div>`;
  return { subject: ORDER_RECEIVED_SUBJECT, html };
}

/**
 * Best-effort send. Synchronous invoke so a failed send is detected and
 * logged (error name only, never the address or body); never throws.
 */
export async function sendOrderReceivedEmail(
  lambda: { send: (cmd: InvokeCommand) => Promise<{ FunctionError?: string }> },
  fnName: string,
  args: { to: string; sessionId: string; firstName?: string },
): Promise<void> {
  try {
    const { subject, html } = composeOrderReceived(args.sessionId, args.firstName);
    const r = await lambda.send(new InvokeCommand({
      FunctionName: fnName,
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify({ kind: 'info', from: 'support', to: args.to, subject, html })),
    }));
    if (r?.FunctionError) throw new Error('email-sender failed');
  } catch (err) {
    console.error('[order-handler] push-patch order-received email failed', { orderId: args.sessionId, error: (err as { name?: string })?.name ?? 'Error' });
  }
}
