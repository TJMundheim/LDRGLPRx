import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFArray, PDFName, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { buildFields, fillOrderForm, signatureLine, QTY_FIELD, type Practice } from './genesis-form';
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
  it('maps practice constants and order data to Push Patch page field names', () => {
    const f = buildFields(ORDER, PRACTICE);
    expect(f).toMatchObject({
      clinician: 'Dr. Test Clinician', practice: 'Test Practice', practice_phone: '555-0100', email: 'pay@example.com',
      placer: 'Placer Person', placer_phone: '555-0101', salesrep: 'Rep One',
      rpa_notes1: 'My4MLife order cs_test_123 · 12-hour',
      rpa_notes2: 'Billing: 1 Billing St, Austin, TX 78701',
    });
    expect(f.patient_name).toBe('Jane Doe');
    expect(f.shipping).toBe('12 Ranch Rd Apt 4, Austin, TX 78701 · Phone: +15125550123');
    // The Push Patch page has no billing or signature box: those fields are never written.
    expect(f.billing).toBeUndefined();
    expect(f.pgx_physician_signature).toBeUndefined();
  });

  it('single-line address when line2 is missing', () => {
    const f = buildFields({ ...ORDER, ship: { address: { line1: '12 Ranch Rd', line2: null, city: 'Austin', state: 'TX', postal_code: '78701' } } }, PRACTICE);
    expect(f.shipping).toBe('12 Ranch Rd, Austin, TX 78701 · Phone: +15125550123');
    expect(f.patient_name).toBe('Jane Doe'); // no ship-to name → the patient name
  });

  it('the ship-to recipient name (when given) fills patient_name; the shipping block never carries a name', () => {
    const f = buildFields({ ...ORDER, ship: { ...ORDER.ship, name: 'Janet Roe' } }, PRACTICE);
    expect(f.patient_name).toBe('Janet Roe');
    expect(f.shipping.startsWith('12 Ranch Rd')).toBe(true);
    expect(f.shipping).not.toContain('Janet Roe');
    expect(f.shipping).not.toContain('Jane Doe');
  });

  it('notes line 2 carries only billing (no signature) and is blank without billing', () => {
    expect(buildFields(ORDER, PRACTICE).rpa_notes2).toBe('Billing: 1 Billing St, Austin, TX 78701');
    expect(buildFields(ORDER, { ...PRACTICE, billing: undefined }).rpa_notes2).toBe('');
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

describe('signatureLine', () => {
  const f = { clinician: 'Dr. Test Clinician' };
  it('uses the clinician field value and the Central-time date', () => {
    expect(signatureLine(f, '2026-10-03T15:00:00Z')).toBe('Electronically signed — Dr. Test Clinician · Oct 3, 2026');
    // 02:00 UTC on Oct 4 is still Oct 3 evening in Chicago
    expect(signatureLine(f, '2026-10-04T02:00:00Z')).toContain('· Oct 3, 2026');
  });
  it('lead phrase is configurable, defaults to "Electronically signed", defaults date to now', () => {
    expect(signatureLine(f, '2026-10-03T15:00:00Z', 'Signed by')).toBe('Signed by — Dr. Test Clinician · Oct 3, 2026');
    expect(signatureLine(f, undefined, '')).toMatch(/^Electronically signed — Dr\. Test Clinician · [A-Z][a-z]{2} \d{1,2}, \d{4}$/);
  });
});

// Standard-font text is written as <HEX> strings in the page's (deflated) content streams: decode the PAGE's streams and look for it.
const hex = (s: string) => Buffer.from(s, 'latin1').toString('hex').toUpperCase();
const hasText = async (bytes: Uint8Array, s: string) => {
  const doc = await PDFDocument.load(bytes);
  const c = doc.context.lookup(doc.getPage(0).node.get(PDFName.of('Contents')));
  const streams = (c instanceof PDFArray ? c.asArray().map((r) => doc.context.lookup(r)) : [c]) as PDFRawStream[];
  return streams.some((st) => Buffer.from(decodePDFRawStream(st).decode()).toString('latin1').includes(`<${hex(s)}>`));
};

describe('fillOrderForm', () => {
  it('draws the bold label and the signature line inside the page, below the notes boxes', async () => {
    const bytes = await fillOrderForm(buildFields(ORDER, PRACTICE), { signedAt: '2026-10-03T15:00:00Z' });
    expect(await hasText(bytes, 'Provider signature:')).toBe(true);
    expect(await hasText(bytes, 'Electronically signed \x97 Dr. Test Clinician \xb7 Oct 3, 2026')).toBe(true);
    const doc = await PDFDocument.load(bytes);
    const notesBottom = Math.min(...['rpa_notes1', 'rpa_notes2'].map((n) => doc.getForm().getTextField(n).acroField.getWidgets()[0].getRectangle().y));
    expect(notesBottom).toBeGreaterThan(24); // signature baseline y=14 + 10pt font stays under the notes boxes
    expect(doc.getPage(0).getHeight()).toBe(792);
  });

  it('lead phrase from config is used; no signature is drawn when there is no clinician', async () => {
    const custom = await fillOrderForm(buildFields(ORDER, PRACTICE), { signedAt: '2026-10-03T15:00:00Z', lead: 'Approved by' });
    expect(await hasText(custom, 'Approved by \x97 Dr. Test Clinician \xb7 Oct 3, 2026')).toBe(true);
    expect(await hasText(await fillOrderForm(buildFields(ORDER, {})), 'Provider signature:')).toBe(false);
  });

  it('outputs ONLY the Push Patch order page, filled and still editable (not flattened)', async () => {
    const bytes = await fillOrderForm(buildFields(ORDER, PRACTICE));
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const get = await read(bytes);
    expect(get('clinician')).toBe('Dr. Test Clinician');
    expect(get('practice')).toBe('Test Practice');
    expect(get('email')).toBe('pay@example.com');
    expect(get('patient_name')).toBe('Jane Doe');
    expect(get('shipping')).toBe('12 Ranch Rd Apt 4, Austin, TX 78701 · Phone: +15125550123');
    expect(get('qty_push4')).toBe('1');
    expect(get('qty_push1')).toBe('');
    expect(get('rpa_notes1')).toBe('My4MLife order cs_test_123 · 12-hour');
    expect(get('rpa_notes2')).toBe('Billing: 1 Billing St, Austin, TX 78701');
    // exactly the page-5 fields remain; fields that only lived on removed pages are gone
    const names = doc.getForm().getFields().map((f) => f.getName()).sort();
    expect(names).toEqual(['clinician', 'email', 'patient_name', 'placer', 'placer_phone', 'practice', 'practice_phone', 'qty_push1', 'qty_push2', 'qty_push3',
      'qty_push4', 'qty_push5', 'qty_push6', 'qty_push7', 'qty_push8', 'rpa_notes1', 'rpa_notes2', 'salesrep', 'shipping']);
    // every remaining widget sits on the one remaining page
    const page = doc.getPage(0);
    const annots = page.node.Annots()?.asArray() ?? [];
    for (const f of doc.getForm().getFields()) for (const w of f.acroField.getWidgets()) expect(w.P()).toBe(page.ref);
    expect(annots.length).toBe(names.length);
  });

  it('microneedling qty lands in qty_push8', async () => {
    const get = await read(await fillOrderForm(buildFields(ORDER, { ...PRACTICE, microneedling_per_order: '1' })));
    expect(get('qty_push8')).toBe('1');
  });

  it('missing practice values are simply left blank', async () => {
    const get = await read(await fillOrderForm(buildFields(ORDER, {})));
    expect(get('clinician')).toBe('');
    expect(get('patient_name')).toBe('Jane Doe');
  });

  it('blank form: patient_name exists and is empty (clinics may order for office inventory)', async () => {
    const get = await read(await fillOrderForm({ salesrep: 'TJ Mundheim' }));
    expect(get('patient_name')).toBe('');
    expect(get('salesrep')).toBe('TJ Mundheim');
  });
});

describe('account block layout', () => {
  const ROWS = ['clinician', 'practice', 'practice_phone', 'patient_name', 'shipping', 'placer', 'placer_phone', 'email', 'salesrep'];
  const PRODUCT_TOP = 792 - 397.4; // "Product Order Information" text top (pdf-lib coords)
  const TITLE_BOTTOM = 792 - 182.6; // "Push Patch Order Form" text bottom
  const rects = async (bytes: Uint8Array) => {
    const form = (await PDFDocument.load(bytes)).getForm();
    return Object.fromEntries(form.getFields().map((f) => [f.getName(), f.acroField.getWidgets()[0].getRectangle()]));
  };
  const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

  it('rows run top→bottom in order, Patient Name directly above Shipping, inside title…Product Order Information', async () => {
    const r = await rects(await fillOrderForm(buildFields(ORDER, PRACTICE)));
    const ys = ROWS.map((n) => r[n].y);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThan(ys[i - 1]);
    for (const n of ROWS) {
      expect(r[n].y + r[n].height).toBeLessThanOrEqual(TITLE_BOTTOM);
      expect(r[n].y).toBeGreaterThanOrEqual(PRODUCT_TOP + 1);
      expect(r[n].x + r[n].width).toBeLessThanOrEqual(580);
    }
    expect(r['patient_name'].width).toBeGreaterThanOrEqual(180);
  });

  it('no account-row widget overlaps any other widget', async () => {
    for (const bytes of [await fillOrderForm(buildFields(ORDER, PRACTICE)), await fillOrderForm({ salesrep: 'TJ Mundheim' })]) {
      const all = Object.entries(await rects(bytes));
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++)
        if (ROWS.includes(all[i][0]) || ROWS.includes(all[j][0])) expect(overlap(all[i][1], all[j][1]), `${all[i][0]} vs ${all[j][0]}`).toBe(false);
    }
  });

  it('redraws every account label (incl. the new Patient Name row) and covers the red banner', async () => {
    const bytes = await fillOrderForm({ salesrep: 'TJ Mundheim' });
    for (const l of ['Account Information', 'Ordering Clinician Name:', 'Patient Name (if shipping direct to patient):', 'Shipping Address for PushPatch:', 'Sales Rep:'])
      expect(await hasText(bytes, l), l).toBe(true);
    const doc = await PDFDocument.load(bytes);
    const c = doc.context.lookup(doc.getPage(0).node.get(PDFName.of('Contents')));
    const streams = (c instanceof PDFArray ? c.asArray().map((r) => doc.context.lookup(r)) : [c]) as PDFRawStream[];
    const ops = streams.map((st) => Buffer.from(decodePDFRawStream(st).decode()).toString('latin1')).join('\n');
    // one white box spans the whole old account block, banner (y 182–198 from top) included, title untouched
    // pdf-lib path: "1 0 0 1 x y cm … 0 0 m / 0 h l / w h l / w 0 l"
    const m = ops.match(/1 1 1 rg[\s\S]*?1 0 0 1 ([\d.]+) ([\d.]+) cm[\s\S]*?0 0 m\s+0 [\d.]+ l\s+([\d.]+) ([\d.]+) l/);
    expect(m).not.toBeNull();
    const [x, y, w, h] = m!.slice(1).map(Number);
    expect(x).toBeLessThanOrEqual(124); expect(x + w).toBeGreaterThanOrEqual(580);
    expect(y).toBeLessThanOrEqual(792 - 380); expect(y + h).toBeGreaterThanOrEqual(792 - 184); // banner glyphs start ~y187 (bbox 182.3 incl. leading)
    expect(y).toBeGreaterThanOrEqual(PRODUCT_TOP); expect(y + h).toBeLessThanOrEqual(TITLE_BOTTOM);
  });
});

describe('label typo fix', () => {
  it('redraws the NAD+ 1300 / GHK-Cu row as "5mg" (not "5gm")', async () => {
    const bytes = await fillOrderForm({ salesrep: 'TJ Mundheim' });
    expect(await hasText(bytes, '5mg (6 Per Box - $300 ea.) Quantity:')).toBe(true);
  });
});
