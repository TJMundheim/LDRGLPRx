// Fills Genesis's fillable order form and emits ONLY its Push Patch order page (page 5 of the 5-page template;
// pages 1–4 — consolidated form, terms/bank details, RPA, PGX/NGX — are removed). AcroForm fields are shared
// across pages by name, so everything is resolved against page 5. Fields stay editable (not flattened).
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
// Page-5 boxes are one line tall (~20 pt) but wide (~390–560 pt): the address is two lines in a small font,
// the notes are single lines in a small font. The Push Patch page has no billing or signature box.
const PUSH_PAGE = 4;
const SMALL_FONT: Record<string, number> = { shipping: 7, rpa_notes1: 8, rpa_notes2: 7 };

export interface OrderInput {
  sku: string; sessionId: string; name: string; phone: string;
  ship?: { name?: string | null; address?: Record<string, string | null> | null } | null;
}

export function buildFields(o: OrderInput, p: Partial<Practice>): Record<string, string> {
  const ad = o.ship?.address ?? {};
  const street = [ad['line1'], ad['line2']].filter(Boolean).join(' ');
  const shipping = [[o.ship?.name || o.name, street].filter(Boolean).join(', '),
    `${ad['city'] ?? ''}, ${ad['state'] ?? ''} ${ad['postal_code'] ?? ''}`.trim() + ` · Phone: ${o.phone}`].join('\n');
  const billing = p.billing ? `Billing: ${p.billing.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join(', ')}` : '';
  const signed = `${p.physician_signature || 'Electronically signed'} — ${p.clinician}`;
  const f: Record<string, string> = {
    shipping, rpa_notes1: `My4MLife order ${o.sessionId} · 12-hour`, rpa_notes2: [billing, signed].filter(Boolean).join(' · '),
  };
  const set = (k: string, v?: string) => { if (v) f[k] = v; };
  set('clinician', p.clinician); set('practice', p.practice); set('practice_phone', p.practice_phone);
  set('email', p.payment_email); set('placer', p.placer);
  set('placer_phone', p.placer_phone); set('salesrep', p.salesrep);
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
  const keep = new Set((doc.getPage(PUSH_PAGE).node.Annots()?.asArray() ?? []).map(String));
  // Drop every widget not on the Push Patch page (and fields that only existed on other pages) so the
  // remaining AcroForm is valid once pages 1–4 are removed.
  for (const field of form.getFields()) {
    const af = field.acroField;
    const kids = af.Kids();
    const refs = kids ? kids.asArray().map(String) : [String(af.ref)]; // a field with no Kids is itself the widget
    const onPage = refs.map((r) => keep.has(r));
    if (!onPage.some(Boolean)) { form.acroForm.removeField(af); continue; }
    for (let i = refs.length - 1; i >= 0; i--) if (!onPage[i]) af.removeWidget(i);
  }
  for (let i = doc.getPageCount() - 1; i >= 0; i--) if (i !== PUSH_PAGE) doc.removePage(i);
  for (const [name, value] of Object.entries(fields)) {
    const field = form.getTextField(name);
    if (name === 'shipping') field.enableMultiline();
    if (SMALL_FONT[name]) field.setFontSize(SMALL_FONT[name]);
    field.setText(value);
  }
  return doc.save(); // regenerates field appearances; AcroForm stays fillable
}
