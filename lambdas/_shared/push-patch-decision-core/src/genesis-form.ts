// Fills Genesis's fillable order form (page 1; AcroForm fields are shared across pages by name).
// Fields stay editable (not flattened) so Genesis can adjust before processing.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import type { Practice } from './genesis-config';

export type { Practice };
export const TEMPLATE = 'genesis-order-form-2026.pdf';
// Blend sku → qty field on the form (verified by rendering the template).
export const QTY_FIELD: Record<string, string> = {
  'push-patch-enhanced-glow': 'qty_push1', 'push-patch-nad-ghk': 'qty_push2', 'push-patch-glutathione-ghk': 'qty_push3',
  'push-patch-bpc-nad-ghk': 'qty_push4', 'push-patch-kpv-nad-ghk': 'qty_push5', 'push-patch-wolverine': 'qty_push6',
  'push-patch-nad-motsc-ghk': 'qty_push7',
};
const MICRONEEDLING_FIELD = 'qty_push8';
// Page-1 address boxes are one line tall (17 pt). Grow them into the gaps between rows and use a small
// font so a 3–4 line address is fully visible; the field value itself is always complete.
const MULTILINE = ['shipping', 'billing'];
const GROW = 6;
const FONT = 5.5;

export interface OrderInput {
  sku: string; sessionId: string; name: string; phone: string;
  ship?: { name?: string | null; address?: Record<string, string | null> | null } | null;
}

export function buildFields(o: OrderInput, p: Partial<Practice>): Record<string, string> {
  const ad = o.ship?.address ?? {};
  const shipping = [o.ship?.name || o.name, [ad['line1'], ad['line2']].filter(Boolean).join(' '),
    `${ad['city'] ?? ''}, ${ad['state'] ?? ''} ${ad['postal_code'] ?? ''}`.trim(), `Phone: ${o.phone}`].join('\n');
  const f: Record<string, string> = { shipping, rpa_notes1: `My4MLife order ${o.sessionId} · 12-hour` };
  const set = (k: string, v?: string) => { if (v) f[k] = v; };
  set('clinician', p.clinician); set('practice', p.practice); set('practice_phone', p.practice_phone);
  set('email', p.payment_email); set('billing', p.billing); set('placer', p.placer);
  set('placer_phone', p.placer_phone); set('salesrep', p.salesrep); set('pgx_physician_signature', p.physician_signature);
  if (QTY_FIELD[o.sku]) f[QTY_FIELD[o.sku]] = '1';
  if (Number(p.microneedling_per_order) > 0) f[MICRONEEDLING_FIELD] = String(Number(p.microneedling_per_order));
  return f;
}

// Patient-confirmed address saved on the encounter wins; Stripe's checkout address is the fallback.
export type ShipTo = { name?: string; line1?: string; line2?: string; city?: string; state?: string; postalCode?: string };
export function resolveShip(shipTo: ShipTo | undefined, stripeShip: OrderInput['ship']): OrderInput['ship'] {
  if (!shipTo || typeof shipTo !== 'object') return stripeShip;
  return { name: shipTo.name, address: { line1: shipTo.line1 ?? null, line2: shipTo.line2 ?? null, city: shipTo.city ?? null, state: shipTo.state ?? null, postal_code: shipTo.postalCode ?? null } };
}

// Built bundle: the template is copied next to handler.js by `pnpm build`; from src it lives in ../assets.
function template(): Buffer {
  const path = [join(__dirname, TEMPLATE), join(__dirname, '..', 'assets', TEMPLATE)].find(existsSync);
  if (!path) throw new Error('genesis order form template not found');
  return readFileSync(path);
}

export async function fillOrderForm(fields: Record<string, string>): Promise<Uint8Array> {
  const doc = await PDFDocument.load(template());
  const form = doc.getForm();
  const page1 = doc.getPage(0).ref;
  for (const [name, value] of Object.entries(fields)) {
    const field = form.getTextField(name);
    if (MULTILINE.includes(name)) {
      field.enableMultiline();
      field.setFontSize(FONT);
      for (const w of field.acroField.getWidgets()) {
        if (w.P() !== page1) continue;
        const r = w.getRectangle();
        w.setRectangle({ x: r.x, y: r.y - GROW, width: r.width, height: r.height + 2 * GROW });
      }
    }
    field.setText(value);
  }
  return doc.save(); // regenerates field appearances; AcroForm stays fillable
}
