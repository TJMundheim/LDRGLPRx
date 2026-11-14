import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { buildReport } from '../../../website/src/lib/uninsured-decade-report';
import { renderReportPdf, textWidth, clean, hoursDisplay } from './pdf';

const inputs = { age: 62, spouseAge: 60, stateAbbr: 'TX', netWorthBand: '500k-1m' as const, monthlySpend: 400, exerciseHours: 3, rrrPct: 30, now: new Date('2026-11-14T12:00:00Z') };

describe('renderReportPdf', () => {
  it('returns PDF bytes starting with %PDF', async () => {
    const bytes = await renderReportPdf(buildReport(inputs), 'Jane', inputs);
    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe('%PDF');
  });
  it('has 1 to 3 pages', async () => {
    const bytes = await renderReportPdf(buildReport(inputs), 'Jane', inputs);
    const n = (await PDFDocument.load(bytes)).getPageCount();
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(3);
  });
  it('still renders for a single person with a long first name', async () => {
    const i = { ...inputs, spouseAge: undefined, age: 75 };
    const bytes = await renderReportPdf(buildReport(i), 'Alexandria-Josephine', i);
    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe('%PDF');
  });

  it('measures unkerned widths, matching what drawText renders (regression: "Takethis", "Yourinputs")', async () => {
    const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    // AFM kerning makes the kerned width narrower than the glyphs actually drawn.
    expect(font.widthOfTextAtSize('Take', 10)).toBeLessThan(textWidth(font, 'Take', 10));
    expect(textWidth(font, 'Take', 10)).toBeCloseTo(['T', 'a', 'k', 'e'].reduce((a, c) => a + font.widthOfTextAtSize(c, 10), 0), 6);
  });
  it('draws whole phrases with real spaces, so word gaps survive text extraction', async () => {
    const doc = await PDFDocument.load(await renderReportPdf(buildReport(inputs), 'Jane', inputs));
    let hex = '';
    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
      if (obj instanceof PDFRawStream) hex += Buffer.from(decodePDFRawStream(obj).decode()).toString('latin1');
    }
    const enc = (t: string) => '<' + Buffer.from(t, 'latin1').toString('hex').toUpperCase() + '>';
    expect(hex).toContain(enc('Your inputs'));
    const mid = (t: string) => Buffer.from(t, 'latin1').toString('hex').toUpperCase();
    expect(hex).toContain(mid("Take this printout"));
    expect(hex).toContain(mid("You don't insure"));
  });
  it('clean() keeps accented names readable in WinAnsi Helvetica', () => {
    expect(clean('José Núñez')).toBe('Jose Nunez');
  });
  it('hours row matches the page format (one decimal, 0 at target)', () => {
    expect(hoursDisplay(buildReport({ ...inputs, exerciseHours: 1 }))).toBe(buildReport({ ...inputs, exerciseHours: 1 }).hoursToAdd.toFixed(1));
    expect(hoursDisplay(buildReport({ ...inputs, exerciseHours: 1 }))).toMatch(/^\d+\.\d$/);
    expect(hoursDisplay(buildReport({ ...inputs, exerciseHours: 3 }))).toBe('0');
  });
});
