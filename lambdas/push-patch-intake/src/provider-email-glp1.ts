// Physician review email for the GLP-1 lane. PHI-light like Push Patch: first initial + last name in the
// body, the full clinical detail the physician needs to decide (BMI, answers) behind the packet link too.
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { GLP1_PRODUCT_NAMES } from '@my4mlife/push-patch-checkout';
import { signToken } from './sign';
import { param, esc, button, BASE_URL } from './provider-email';
import { bmi, type Glp1Health } from './validate-glp1';

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';
const PROVIDER_EMAIL_PARAM = process.env.PROVIDER_EMAIL_PARAM ?? '/my4mlife/provider/email';
const HMAC_PARAM = process.env.HMAC_PARAM ?? 'push-patch-decision-hmac-key';

const join = (a: string[]) => (a.length ? a.join(', ') : 'none');

export async function sendGlp1Review(a: {
  contactId: string; encounterId: string; patientName: string; sku: string; autoShip: boolean; health: Glp1Health;
  denied: string[]; packetUrl: string; consentLine: string; testOrder?: boolean;
}): Promise<void> {
  const [to, secret] = await Promise.all([param(PROVIDER_EMAIL_PARAM), param(HMAC_PARAM)]);
  const product = (GLP1_PRODUCT_NAMES as Record<string, string>)[a.sku] ?? a.sku;
  const h = a.health;
  const subject = `${a.testOrder ? '[TEST ORDER $2] ' : ''}GLP-1 review: ${a.patientName.trim()} · ${product}`;
  const link = (action: 'approve' | 'decline') => `${BASE_URL}/api/push-patch-decision?t=${signToken(a.contactId, a.encounterId, action, secret)}`;
  const lines = [
    `Product: ${product}`, `Auto-ship (every 4 weeks): ${a.autoShip ? 'yes' : 'no'}`,
    `Sex: ${h.sex}`, `Height ${h.heightFt}'${h.heightIn}", weight ${h.weightLb} lb${h.goalWeightLb ? `, goal ${h.goalWeightLb} lb` : ''}`,
    `BMI ${bmi(h.heightFt, h.heightIn, h.weightLb)}`,
    `Conditions: ${join(h.conditions)}`, `Safety history: ${join(h.safetyHistory)}`,
    `Prior GLP-1: ${h.priorGlp1}${h.priorGlp1Drug ? ` (${h.priorGlp1Drug}${h.priorGlp1Dose ? `, ${h.priorGlp1Dose}` : ''})` : ''}`,
    `Interacting meds: ${join(h.interactingMeds)}`, `Other meds: ${h.otherMeds}`, `Allergies: ${h.allergies}`,
    `Patient denied: ${join(a.denied.filter(Boolean))}`,
  ];
  const approve = link('approve'), decline = link('decline');
  const html = `<div style="max-width:560px;font:16px Arial,sans-serif"><p>${lines.map(esc).join('<br>')}</p><p>${esc(a.consentLine)}</p>`
    + `<p><a href="${esc(a.packetUrl)}">Open the clinical packet</a> (link expires in 7 days).</p>`
    + button(approve, 'Approve (choose dose)', '#1b7f3b') + button(decline, 'Decline (full refund)', '#b00020') + `<p>Reply-all for questions.</p></div>`;
  const text = `${lines.join('\n')}\n\n${a.consentLine}\n\nPacket: ${a.packetUrl}\nApprove: ${approve}\nDecline (full refund): ${decline}\n\nReply-all for questions.`;
  const res = await lambda.send(new InvokeCommand({ FunctionName: EMAIL_SENDER_FN, InvocationType: 'RequestResponse', Payload: Buffer.from(JSON.stringify({ kind: 'info', to, subject, html, text })) }));
  if (res.FunctionError) throw new Error('provider email could not be sent');
}
