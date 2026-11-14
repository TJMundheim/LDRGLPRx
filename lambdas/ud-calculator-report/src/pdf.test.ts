import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildReport } from '../../../website/src/lib/uninsured-decade-report';
import { renderReportPdf } from './pdf';

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
});
