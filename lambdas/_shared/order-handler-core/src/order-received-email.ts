import { InvokeCommand } from '@aws-sdk/client-lambda';

// Copy: docs/launch/push-patch/async-visit-copy.md "Order-received email (2026-10-15)".
// Generic process text only; no PHI (first name + session link, nothing else).
const BASE = process.env['INTAKE_BASE_URL'] ?? 'https://www.my4mlife.com/go/push-patch/thank-you';
export const ORDER_RECEIVED_SUBJECT = 'Your Push Patch order is in — one 2-minute step left';

function esc(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export const RECEIPT_SUBJECT = 'Your Push Patch order is in';
// GLP-1 lane (skuId glp1-*): own subject/wording, no patch or 6-week language.
const GLP1_NAMES: Record<string, string> = { 'glp1-sema': 'semaglutide', 'glp1-tirzep': 'tirzepatide', 'glp1-reta': 'retatrutide' };
export const isGlp1 = (skuId?: string): boolean => !!skuId && skuId.startsWith('glp1-');
export const GLP1_RECEIPT_SUBJECT = 'Your GLP-1 order is in';
export const GLP1_FINISH_SUBJECT = 'Your GLP-1 order is in — one 2-minute step left';
const GLP1_BASE = process.env['GLP1_INTAKE_BASE_URL'] ?? 'https://www.my4mlife.com/go/glp-1/thank-you';
export type OrderEmailKind = 'receipt' | 'finish-form';

const footer = (disclaimer: string) => `<p style="color:#666;font-size:13px;margin-top:32px">My4MLife</p>
<p style="color:#666;font-size:12px"><em>${disclaimer}</em></p>
</div>`;
const FOOTER = footer('These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, prevent or alleviate any condition. Results vary by person.');
const GLP1_FOOTER = footer('Prescription medication. Prescribed only if approved by a licensed physician in our network after reviewing your health information.');
const WRAP = '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#0a1628;line-height:1.55">';

// Pay-last flow: no action link, no PHI (first name only). Copy: Appendix A of docs/plan/push-patch-pay-last-2026-10-15.md.
function composeGlp1(sessionId: string, skuId: string, firstName: string | undefined, kind: OrderEmailKind): { subject: string; html: string } {
  const name = firstName?.trim() ? esc(firstName.trim()) : 'there';
  const drug = GLP1_NAMES[skuId] ? ` (${GLP1_NAMES[skuId]})` : '';
  const what = `your 1 month GLP-1 order${drug}`;
  const link = `${GLP1_BASE}?session_id=${encodeURIComponent(sessionId)}`;
  const body = kind === 'receipt'
    ? `<p>Thank you for ${what}. A licensed physician in our network is reviewing your answers now, usually within an hour during business hours, 9 a.m.&ndash;5 p.m. Central.</p>
<p>If you are not cleared, your payment is refunded in full within 10 business days.</p>
<p>If cleared, your physician sets your dose and we place your pharmacy order. We will email you when it is on its way.</p>`
    : `<p>Thank you for ${what}. One step is left before a physician can review it: a short health questionnaire. It takes about 2 minutes.</p>
<p style="margin:24px 0"><a href="${link}" style="background:#00b894;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Finish your questionnaire</a></p>
<p>Review happens within an hour during business hours, 9 a.m.&ndash;5 p.m. Central. If you are not cleared, your payment is refunded within 10 business days.</p>
<p>If you&#39;ve already finished, you can ignore this email.</p>`;
  const html = `${WRAP}
<p>Hi ${name},</p>
${body}
<p>Questions? Reply here.</p>
<p>The My4MLife team</p>
${GLP1_FOOTER}`;
  return { subject: kind === 'receipt' ? GLP1_RECEIPT_SUBJECT : GLP1_FINISH_SUBJECT, html };
}

function composeReceipt(firstName?: string): { subject: string; html: string } {
  const name = firstName?.trim() ? esc(firstName.trim()) : 'there';
  const html = `${WRAP}
<p>Hi ${name},</p>
<p>Thank you for your order. A licensed physician in our network is reviewing it now, usually within an hour during business hours, 9 a.m.&ndash;5 p.m. Central.</p>
<p>If you are not cleared, your payment is refunded in full within 10 business days.</p>
<p>If cleared, your patches are prepared within 1&ndash;3 business days, then ground delivery in 3&ndash;5 business days.</p>
<p>Questions? Reply here.</p>
<p>The My4MLife team</p>
${FOOTER}`;
  return { subject: RECEIPT_SUBJECT, html };
}

export function composeOrderReceived(sessionId: string, firstName?: string, kind: OrderEmailKind = 'finish-form', skuId?: string): { subject: string; html: string } {
  if (isGlp1(skuId)) return composeGlp1(sessionId, skuId as string, firstName, kind);
  if (kind === 'receipt') return composeReceipt(firstName);
  const link = `${BASE}?session_id=${encodeURIComponent(sessionId)}`;
  const name = firstName?.trim() ? esc(firstName.trim()) : 'there';
  const html = `${WRAP}
<p>Hi ${name},</p>
<p>Thank you for your order. One step is left before it can ship: a short health questionnaire so one of our network&#39;s licensed physicians can review it. It takes about 2 minutes.</p>
<p style="margin:24px 0"><a href="${link}" style="background:#00b894;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Finish your questionnaire</a></p>
<p>Review happens within an hour during business hours, 9 a.m.&ndash;5 p.m. Central. If you are not cleared, your payment is refunded within 10 business days.</p>
<p>If you&#39;ve already finished, you can ignore this email. Questions? Reply here.</p>
<p>The My4MLife team</p>
${FOOTER}`;
  return { subject: ORDER_RECEIVED_SUBJECT, html };
}

/**
 * Best-effort send. Synchronous invoke so a failed send is detected and
 * logged (error name only, never the address or body); never throws.
 */
export async function sendOrderReceivedEmail(
  lambda: { send: (cmd: InvokeCommand) => Promise<{ FunctionError?: string }> },
  fnName: string,
  args: { to: string; sessionId: string; firstName?: string; kind?: OrderEmailKind; skuId?: string },
): Promise<void> {
  try {
    const { subject, html } = composeOrderReceived(args.sessionId, args.firstName, args.kind, args.skuId);
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
