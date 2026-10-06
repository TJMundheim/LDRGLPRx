// Rebuilds the Push Patch page's "Account Information" block (TJ 2026-10-05): white-covers the template's label
// column + the red "FOR INTERNAL USE ONLY …" banner, redraws every account label in order (with a new "Patient Name"
// row above shipping — blank when a clinic orders for office inventory), and moves each field's widget onto its row.
// Template measurements (fitz, top-left origin, page 612x792): title bottom y182.6, banner y182–198, header
// "Account Information" y201–219 (Arial Bold 12), labels x13.7 (Arial 11.04), "Product Order Information" top y397.4.
import { PDFDocument, PDFForm, PDFPage, StandardFonts, rgb } from 'pdf-lib';

const H = 792;
const COVER = { top: 183.5, bottom: 395 }; // between the title and "Product Order Information"
const LABEL_X = 13.7, LABEL_SIZE = 11.04, HEADER_SIZE = 12, HEADER_BASE = 198;
const ROWS_TOP = 203, PITCH = 20.5, BOX_H = 19, SHIP_H = 24, BOX_RIGHT = 566, GAP = 3, MIN_BOX = 180;
const GRAY = rgb(0.55, 0.55, 0.55), BLACK = rgb(0, 0, 0), WHITE = rgb(1, 1, 1);

export const ACCOUNT_ROWS: [field: string, label: string][] = [
  ['clinician', 'Ordering Clinician Name:'],
  ['practice', 'Practice Name:'],
  ['practice_phone', 'Practice Phone Number:'],
  ['patient_name', 'Patient Name (if shipping direct to patient):'],
  ['shipping', 'Shipping Address for PushPatch:'],
  ['placer', 'Name of Person Placing Order:'],
  ['placer_phone', 'Phone for Person Placing Order:'],
  ['email', 'Email for Payment Link:'],
  ['salesrep', 'Sales Rep:'],
];

export async function layoutAccountBlock(doc: PDFDocument, form: PDFForm, page: PDFPage): Promise<void> {
  const reg = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({ x: 0, y: H - COVER.bottom, width: 612, height: COVER.bottom - COVER.top, color: WHITE });
  page.drawText('Account Information', { x: LABEL_X, y: H - HEADER_BASE, size: HEADER_SIZE, font: bold, color: BLACK });
  let top = ROWS_TOP;
  for (const [name, label] of ACCOUNT_ROWS) {
    const h = name === 'shipping' ? SHIP_H : BOX_H;
    const baseline = top + h / 2 + 4; // centres the label's cap height on the box
    page.drawText(label, { x: LABEL_X, y: H - baseline, size: LABEL_SIZE, font: reg, color: BLACK });
    const x = Math.min(LABEL_X + reg.widthOfTextAtSize(label, LABEL_SIZE) + GAP, BOX_RIGHT - MIN_BOX);
    const rect = { x, y: H - top - h, width: BOX_RIGHT - x, height: h };
    const existing = form.getFieldMaybe(name);
    if (existing) {
      existing.acroField.getWidgets()[0].setRectangle(rect);
      form.markFieldAsDirty(existing.ref); // regenerate the appearance at the new size even when left empty
    } else {
      const tf = form.createTextField(name);
      tf.addToPage(page, { ...rect, borderColor: GRAY, borderWidth: 1, backgroundColor: WHITE, font: reg });
      tf.setFontSize(8);
    }
    top += name === 'shipping' ? SHIP_H + (PITCH - BOX_H) : PITCH;
  }
}

// TJ 2026-10-06: Genesis's updated one-pager corrects "GHK-Cu 5gm" to "5mg" on the NAD+ 1300 / GHK-Cu row.
// Template span (fitz): ArialMT 11.04, baseline y469.47; "5gm" starts x139.49, span ends x320.67, top y457.99, bottom y473.06.
export const LABEL_FIX = { from: '5gm', text: '5mg (6 Per Box - $300 ea.) Quantity:', x: 139.49, baseline: 469.47, top: 457.5, bottom: 473.5, right: 321.5 };
export async function fixLabelTypos(doc: PDFDocument, page: PDFPage): Promise<void> {
  const reg = await doc.embedFont(StandardFonts.Helvetica), f = LABEL_FIX;
  page.drawRectangle({ x: f.x - 0.5, y: H - f.bottom, width: f.right - f.x + 0.5, height: f.bottom - f.top, color: WHITE });
  page.drawText(f.text, { x: f.x, y: H - f.baseline, size: LABEL_SIZE, font: reg, color: BLACK });
}
