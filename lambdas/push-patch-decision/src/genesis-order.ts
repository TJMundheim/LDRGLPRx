// Approve path → Genesis order email with the filled order-form PDF attached.
// Complete practice config + known blend → Genesis (cc TJ). Otherwise the filled-so-far PDF goes to TJ only.
import { loadPractice } from './genesis-config';
import { buildFields, fillOrderForm, QTY_FIELD, type OrderInput } from './genesis-form';
import { blendFor, esc } from './blends';
import { send } from './mailer';

const TJ = 'drtj@my4mlife.com';
export type OrderArgs = OrderInput & { lastName: string };

export interface OrderSent { to: string; toGenesis: boolean }

export async function sendGenesisOrder(a: OrderArgs): Promise<OrderSent> {
  const { practice, missing } = await loadPractice();
  const blend = blendFor(a.sku);
  const pdf = await fillOrderForm(buildFields(a, practice));
  const attachment = { filename: `My4MLife-PushPatch-${a.sessionId}.pdf`, contentBase64: Buffer.from(pdf).toString('base64'), contentType: 'application/pdf' };
  const known = !!QTY_FIELD[a.sku];
  const send2Genesis = missing.length === 0 && known;
  const to = send2Genesis ? process.env.GENESIS_ORDER_EMAIL ?? 'orders@novobioalliance.com' : TJ;
  const subject = send2Genesis ? `encrypt — Push Patch order — ${blend.name} — ${a.lastName}`
    : known ? `[ACTION NEEDED] Genesis practice info missing — Push Patch order ${a.sessionId}`
    : `[ACTION NEEDED] Genesis order blend not recognized — Push Patch order ${a.sessionId}`;
  const lines = [
    ...(send2Genesis ? [] : [`NOT SENT TO GENESIS. ${known ? `Missing in SSM /my4mlife/genesis/practice: ${missing.join(', ')}.` : `Unrecognized blend sku: ${a.sku}.`} Fix it, then forward the attached form.`, '']),
    'New Push Patch order — physician approved.', `Blend: ${blend.name}`, 'Quantity: 1', `Ship to: ${a.ship?.name || a.name}`,
    `Order: ${a.sessionId}`, '', 'The completed order form is attached.',
  ];
  const text = lines.join('\n');
  await send({
    to, subject, text, html: text.split('\n\n').map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join(''),
    ...(to.toLowerCase() !== TJ ? { cc: TJ } : {}), attachments: [attachment],
  });
  return { to, toGenesis: send2Genesis };
}
