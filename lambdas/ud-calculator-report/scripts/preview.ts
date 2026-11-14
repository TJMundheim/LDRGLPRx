// Renders a sample report (Jane, 62/60, TX) to docs/launch/uninsured-decade/preview/. No network, no AWS.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildReport } from '../../../website/src/lib/uninsured-decade-report';
import { renderReportPdf } from '../src/pdf';
import { buildEmail } from '../src/email';

const inputs = { age: 62, spouseAge: 60, stateAbbr: 'TX', netWorthBand: '500k-1m' as const, monthlySpend: 400, exerciseHours: 3, rrrPct: 30, now: new Date('2026-11-14T12:00:00Z') };
const out = resolve(__dirname, '../../../docs/launch/uninsured-decade/preview');
mkdirSync(out, { recursive: true });
(async () => {
  const report = buildReport(inputs);
  writeFileSync(resolve(out, 'ud-report-sample.pdf'), await renderReportPdf(report, 'Jane', inputs));
  writeFileSync(resolve(out, 'ud-report-email.html'), buildEmail(report, 'Jane', false).html);
  writeFileSync(resolve(out, 'ud-report-email-advisor.html'), buildEmail(report, 'Jane', true).html);
  console.log('wrote previews to', out);
})();
