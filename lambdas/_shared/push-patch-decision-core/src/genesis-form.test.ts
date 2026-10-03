import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildFields, fillOrderForm, QTY_FIELD, type Practice } from './genesis-form';
import { blendFor, BLENDS } from './blends';

const PRACTICE: Practice = {
  clinician: 'Dr. Test Clinician', practice: 'Test Practice', practice_phone: '555-0100', payment_email: 'pay@example.com',
  billing: '1 Billing St\nAustin, TX 78701', placer: 'Placer Person', placer_phone: '555-0101', salesrep: 'Rep One',
};
const ORDER = {
  sku: 'push-patch-bpc-nad-ghk', sessionId: 'cs_test_123', name: 'Jane Doe', phone: '+15125550123',
  ship: { name: 'Jane Doe', address: { line1: '12 Ranch Rd', line2: 'Apt 4', city: 'Austin', state: 'TX', postal_code: '78701', country: 'US' } },
};
const read = async (bytes: Uint8Array) => {
  const form = (await PDFDocument.load(bytes)).getForm();
  return (n: string) => form.getTextField(n).getText() ?? '';
};

describe('buildFields', () => {
  it('maps practice constants and order data to page-1 field names', () => {
    const f = buildFields(ORDER, PRACTICE);
    expect(f).toMatchObject({
      clinician: 'Dr. Test Clinician', practice: 'Test Practice', practice_phone: '555-0100', email: 'pay@example.com',
      billing: '1 Billing St\nAustin, TX 78701', placer: 'Placer Person', placer_phone: '555-0101', salesrep: 'Rep One',
      rpa_notes1: 'My4MLife order cs_test_123 · 12-hour',
    });
    expect(f.shipping).toBe('Jane Doe\n12 Ranch Rd Apt 4\nAustin, TX 78701\nPhone: +15125550123');
    expect(f.rpa_notes2).toBeUndefined();
    expect(f.pgx_physician_signature).toBeUndefined();
  });

  it('single-line address when line2 is missing', () => {
    const f = buildFields({ ...ORDER, ship: { address: { line1: '12 Ranch Rd', line2: null, city: 'Austin', state: 'TX', postal_code: '78701' } } }, PRACTICE);
    expect(f.shipping).toBe('Jane Doe\n12 Ranch Rd\nAustin, TX 78701\nPhone: +15125550123');
  });

  it('the ship-to recipient name (when given) leads the shipping block instead of the patient name', () => {
    const f = buildFields({ ...ORDER, ship: { ...ORDER.ship, name: 'Janet Roe' } }, PRACTICE);
    expect(f.shipping.split('\n')[0]).toBe('Janet Roe');
  });

  it('sets the physician signature only when configured', () => {
    expect(buildFields(ORDER, { ...PRACTICE, physician_signature: 'Dr. Sig' }).pgx_physician_signature).toBe('Dr. Sig');
  });

  it('every catalog blend has exactly one distinct qty field and sets only that one to "1"', () => {
    const fields = Object.keys(BLENDS).map((sku) => QTY_FIELD[sku]);
    expect(new Set(fields).size).toBe(Object.keys(BLENDS).length);
    for (const sku of Object.keys(BLENDS)) {
      const f = buildFields({ ...ORDER, sku }, PRACTICE);
      const qty = Object.entries(f).filter(([k]) => k.startsWith('qty_push'));
      expect(qty).toEqual([[QTY_FIELD[sku], '1']]);
    }
  });

  it('pins the verified sku → field mapping', () => {
    expect(QTY_FIELD).toEqual({
      'push-patch-enhanced-glow': 'qty_push1', 'push-patch-nad-ghk': 'qty_push2', 'push-patch-glutathione-ghk': 'qty_push3',
      'push-patch-bpc-nad-ghk': 'qty_push4', 'push-patch-kpv-nad-ghk': 'qty_push5', 'push-patch-wolverine': 'qty_push6',
      'push-patch-nad-motsc-ghk': 'qty_push7',
    });
  });

  it('microneedling qty goes in qty_push8 only when > 0', () => {
    expect(buildFields(ORDER, PRACTICE).qty_push8).toBeUndefined();
    expect(buildFields(ORDER, { ...PRACTICE, microneedling_per_order: '0' }).qty_push8).toBeUndefined();
    expect(buildFields(ORDER, { ...PRACTICE, microneedling_per_order: '2' }).qty_push8).toBe('2');
  });

  it('unknown sku sets no blend quantity', () => {
    const f = buildFields({ ...ORDER, sku: 'nope' }, PRACTICE);
    expect(Object.keys(f).filter((k) => k.startsWith('qty_push'))).toEqual([]);
    expect(blendFor('nope').name).toBe('nope');
  });
});

describe('fillOrderForm', () => {
  it('fills the Genesis template, keeps fields editable (not flattened), and returns a PDF', async () => {
    const bytes = await fillOrderForm(buildFields(ORDER, PRACTICE));
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
    const get = await read(bytes);
    expect(get('clinician')).toBe('Dr. Test Clinician');
    expect(get('shipping')).toBe('Jane Doe\n12 Ranch Rd Apt 4\nAustin, TX 78701\nPhone: +15125550123');
    expect(get('billing')).toBe('1 Billing St\nAustin, TX 78701');
    expect(get('qty_push4')).toBe('1');
    expect(get('qty_push1')).toBe('');
    expect(get('rpa_notes1')).toBe('My4MLife order cs_test_123 · 12-hour');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getForm().getFields().length).toBeGreaterThan(20);
    expect(doc.getPageCount()).toBe(5);
  });

  it('missing practice values are simply left blank', async () => {
    const get = await read(await fillOrderForm(buildFields(ORDER, {})));
    expect(get('clinician')).toBe('');
    expect(get('shipping')).toContain('Jane Doe');
  });
});
