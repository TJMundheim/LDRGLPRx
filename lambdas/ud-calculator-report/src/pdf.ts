import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { money, type UdInputs, type UdReport } from '../../../website/src/lib/uninsured-decade-report';
import {
  NET_WORTH_BAND_LABELS, LIFETIME_DEMENTIA_RISK_COUPLE, tenYearPremium, expectedValue,
} from '../../../website/src/lib/uninsured-decade-math';

const W = 612, H = 792, M = 48, CW = W - 2 * M;
const INK = rgb(0.1, 0.1, 0.1), MUTED = rgb(0.4, 0.4, 0.4), GREEN = rgb(0.043, 0.365, 0.29), RULE = rgb(0.8, 0.8, 0.8);
const TAGLINE = "Don't lose your identity and your dignity while you still have a choice.";
const FOOT = 'my4mlife.com/go/uninsured-decade?src=advisor-pdf';

/** Standard Helvetica is WinAnsi only: map typographic glyphs to plain ones and drop anything else. */
export function clean(s: string): string {
  return s.replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-')
    .replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/…/g, '...').replace(/·|•/g, '-')
    .replace(/[   ]/g, ' ').replace(/×/g, 'x').replace(/≈/g, '~')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // José -> Jose rather than Jos
    .replace(/[^\x20-\x7E]/g, '');
}

/**
 * Width as pdf-lib actually draws it. font.widthOfTextAtSize applies AFM kerning pairs (Ta, Yo, r,),
 * but drawText emits a plain Tj with no kerning, so measuring with it under-reports and the next word
 * lands on the space. Summing single glyphs gives the unkerned advance.
 */
export function textWidth(font: PDFFont, s: string, size: number): number {
  let w = 0;
  for (const ch of s) w += font.widthOfTextAtSize(ch, size);
  return w;
}

type Seg = { t: string; bold?: boolean };

/** Same formatting as the page's ledger row (#ud-hours-row): '0' at target, else one decimal. */
export const hoursDisplay = (r: UdReport): string => (r.atTarget ? '0' : r.hoursToAdd.toFixed(1));

export async function renderReportPdf(r: UdReport, firstName: string, inputs: UdInputs): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const f = (b?: boolean): PDFFont => (b ? bold : reg);
  const need = (h: number) => { if (y - h < M + 22) { page = doc.addPage([W, H]); y = H - M; } };

  type Word = { t: string; bold: boolean; gap: boolean };
  /** Wrap mixed bold/regular segments to `width` using measured word widths. Words are drawn one at a time at explicit x positions. */
  const wrap = (segs: Seg[], size: number, width: number): Word[][] => {
    const lines: Word[][] = [];
    let cur: Word[] = [], used = 0, space = false;
    for (const s of segs) for (const tok of clean(s.t).match(/\S+|\s+/g) ?? []) {
      if (/^\s/.test(tok)) { space = true; continue; }
      const ww = textWidth(f(s.bold), tok, size), gapW = textWidth(reg, ' ', size);
      const gap = cur.length > 0 && space;
      if (gap && used + gapW + ww > width) { lines.push(cur); cur = []; used = 0; }
      const g = cur.length > 0 && gap;
      cur.push({ t: tok, bold: !!s.bold, gap: g });
      used += (g ? gapW : 0) + ww;
      space = false;
    }
    if (cur.length) lines.push(cur);
    return lines;
  };
  /** Merge a line's words into same-font runs with real spaces, so text extraction and copy/paste keep word gaps. */
  const runs = (ln: Word[]) => ln.reduce<{ t: string; bold: boolean }[]>((acc, w) => {
    const last = acc[acc.length - 1], piece = (w.gap ? ' ' : '') + w.t;
    if (last && last.bold === w.bold) last.t += piece; else acc.push({ t: piece, bold: w.bold });
    return acc;
  }, []);
  const lineWidth = (ln: Word[], size: number) => runs(ln).reduce((a, r) => a + textWidth(f(r.bold), r.t, size), 0);
  const drawLines = (lines: Word[][], x: number, size: number, lh: number, color = INK, align: 'l' | 'c' = 'l', width = CW) => {
    for (const ln of lines) {
      need(lh);
      y -= lh;
      let cx = align === 'c' ? x + (width - lineWidth(ln, size)) / 2 : x;
      for (const r of runs(ln)) {
        page.drawText(r.t, { x: cx, y, size, font: f(r.bold), color });
        cx += textWidth(f(r.bold), r.t, size);
      }
    }
  };
  const para = (segs: Seg[] | string, size = 9.5, opts: { color?: ReturnType<typeof rgb>; after?: number; align?: 'l' | 'c' } = {}) => {
    drawLines(wrap(typeof segs === 'string' ? [{ t: segs }] : segs, size, CW), M, size, size * 1.35, opts.color ?? INK, opts.align ?? 'l');
    y -= opts.after ?? 6;
  };
  const heading = (t: string) => { need(30); y -= 8; para([{ t, bold: true }], 11, { color: GREEN, after: 3 }); };

  // Header, title
  need(40);
  page.drawText('My4MLife  -  The Uninsured Decade', { x: M, y: y - 10, size: 9, font: bold, color: GREEN });
  y -= 18; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: RULE }); y -= 8;
  para([{ t: 'Your Uninsured Decade report', bold: true }], 20, { after: 2 });
  const date = (inputs.now ?? new Date()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  para(`Prepared for ${firstName} - ${date}`, 10, { color: MUTED, after: 8 });

  // A. Inputs
  heading('Your inputs');
  const rows: [string, string][] = [
    ['Your age', String(inputs.age)], ['Spouse / partner age', inputs.spouseAge === undefined ? 'None' : String(inputs.spouseAge)],
    ['State', r.stateName], ['Approximate net worth', NET_WORTH_BAND_LABELS[inputs.netWorthBand]],
    ['Current monthly out-of-pocket health spend', money(inputs.monthlySpend)], ['Hours/week of exercise', String(inputs.exerciseHours)],
    ['Assumed relative risk reduction', `${r.rrrPct}%`],
  ];
  for (const [k, v] of rows) {
    need(13); y -= 12;
    page.drawText(clean(k), { x: M, y, size: 9.5, font: reg, color: MUTED });
    page.drawText(clean(v), { x: M + 250, y, size: 9.5, font: bold, color: INK });
  }
  y -= 4;

  // B. Headline numbers
  heading('Three headline numbers');
  const big = (label: string, value: string, sub: string, why: string) => {
    need(60);
    para([{ t: label + ':  ', bold: true }, { t: value, bold: true }], 12, { after: 1 });
    para(sub, 9, { color: MUTED, after: 1 });
    para(why, 9, { after: 6 });
  };
  big('The Bill', money(r.bill), `Illustrative 10-year staged care cost, adjusted to ${r.stateName}, in ${r.onsetYear} dollars.`, r.billWhy);
  big('The Premium: new money', money(r.ledger.newMoneyTenYear), 'What the basket costs beyond what you already spend, over 10 years.', r.premiumWhy);
  big('Years Until Spend-Down', r.spendDownDisplay, 'At your net worth band, custodial care alone would take about this long to spend you down to Medicaid eligibility.', r.spendDownWhy);

  // C. Ledger table
  heading('The ledger');
  const cols = [190, 100, CW - 290], tableRows: [string, string, string][] = [
    ['Line', '10-year amount', 'Notes'],
    ['Stage 1 - early-stage care', money(r.stages.stage1), 'Mostly in-home support, illustrative'],
    ['Stage 2 - mid-stage care', money(r.stages.stage2), 'Heavier in-home / adult-day support'],
    ['Stage 3 - late-stage custodial care', money(r.stages.stage3), 'Memory care / nursing home, state-adjusted'],
    ['The Bill (total)', money(r.bill), 'Sum of stages 1-3, in onset-year dollars'],
    ['The Premium - full basket (10 years)', money(r.ledger.fullBasketTenYear), '4M protocol basket, $675/mo ($81,000 over 10 yrs)'],
    ['Already spending (10 years)', money(r.ledger.alreadySpendingTenYear), 'Your reported current monthly health spend x 120'],
    ['New money (10 years)', money(r.ledger.newMoneyTenYear), 'The actual new spend the basket requires'],
    ['Hours to add per month', hoursDisplay(r), r.hoursNote],
    ['Expected savings, dementia-cost avoidance only [assumption, not a guarantee]', money(r.ev.expectedSavings), 'Compared against the full basket - the honest premium'],
  ];
  tableRows.forEach((row, i) => {
    const cells = row.map((c, j) => wrap([{ t: c, bold: i === 0 || j === 1 }], 8.5, cols[j] - 8));
    const h = Math.max(...cells.map((c) => c.length)) * 11.5 + 7;
    need(h);
    let cx = M;
    const top = y;
    cells.forEach((lines, j) => {
      y = top;
      drawLines(lines, cx + 2, 8.5, 11.5, i === 0 ? GREEN : INK);
      cx += cols[j];
    });
    y = top - h + 5;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.4, color: RULE });
  });
  y -= 2;

  // D. Expected value
  const who = r.isCouple ? 'the two of you' : 'you';
  heading(`Expected value, stated honestly: for ${who}`);
  para("This is the part most calculators fudge. We won't. Nothing lowers your risk to zero, and nothing \"prevents\" dementia - the honest claim is that a sustained, structured lifestyle protocol can lower the odds. Here's what that's worth in dollars, using an assumption you control:");
  const couplePct = Math.round(LIFETIME_DEMENTIA_RISK_COUPLE * 100);
  para([{ t: 'Lifetime risk of any dementia after age 55 is ' }, { t: '42%', bold: true },
    ...(r.isCouple ? [{ t: ' (or, for a couple, about a ' }, { t: `${couplePct}%`, bold: true }, { t: ' chance at least one partner is affected)' }] : []),
    { t: ' - per the largest long-running U.S. cohort study to date (Fang, Coresh et al., Nature Medicine, 13 Jan 2025, ARIC cohort).' }]);
  para([{ t: 'Assumed relative risk reduction: ' }, { t: `${r.rrrPct}%`, bold: true }], 9.5, { after: 1 });
  para('45% = Lancet Commission 2024 ceiling if all 14 modifiable risk factors are addressed (a population figure, not a personal guarantee). This is an assumption, not a guarantee - see disclaimer below.', 9, { color: MUTED });
  const cut = r.evVerdict.indexOf('. ') + 1;
  para([
    { t: 'Unmitigated expected cost (probability-weighted): ' }, { t: money(r.ev.unmitigatedExpectedCost), bold: true }, { t: `. With a ${r.rrrPct}% assumed risk reduction: ` },
    { t: money(r.ev.mitigatedExpectedCost), bold: true }, { t: '. Expected savings: ' }, { t: money(r.ev.expectedSavings), bold: true },
    { t: ` against a ${money(r.fullPremium)} ten-year premium - the full basket, the honest comparison. ` },
    { t: r.evVerdict.slice(0, cut) + ' ', bold: true }, { t: r.evVerdict.slice(cut) },
  ]);

  // E. Closing paragraphs (illustrative sentence computed exactly as the page does)
  const premium = tenYearPremium();
  const atDefault = expectedValue(405_262, 0.30, LIFETIME_DEMENTIA_RISK_COUPLE, premium);
  const atCeiling = expectedValue(405_262, 0.45, LIFETIME_DEMENTIA_RISK_COUPLE, premium);
  const illustrative = `A couple at the default 30% assumed risk reduction shows expected savings of roughly ${money(atDefault.expectedSavings)} against a ${money(premium)} ten-year premium; at the 45% Lancet ceiling, roughly ${money(atCeiling.expectedSavings)}.`;
  para([{ t: 'Read plainly: whichever way your number lands, dementia-cost avoidance is a single-disease bet, and this is never a single-disease decision. ', bold: true },
    { t: illustrative + " The honest case for the spend is that the ledger really tips once the same modifiable factors' effect on diabetes, cardiovascular disease, and stroke - plus the wide right tail past the $405,262 average cost, plus quality-of-life and caregiver-hour value - are counted alongside dementia. None of that is captured in the math above. Insurance is a ruin-avoidance trade, not an ROI calculation - the same trade you already make on your house. You don't insure your house because you expect it to burn down; you insure it because you can't afford it if it does." }]);
  para([{ t: "What the ledger can't count. ", bold: true }, { t: 'The same premium that may lower the odds of the bill pays a dividend now, whether or not a claim ever comes: sleep, strength, energy, a retirement decade spent on your feet. That dividend is worth more than any number above, and it is the reason the people who do this keep doing it. What it protects was never really the money. ' + TAGLINE }]);
  para('A policy funds the risk; it can\'t lower it - that part is on you. Take this printout to the advisor who sent you here, and review your plan, policies, powers of attorney, and health-care directives with them - that step is necessary, not optional.');
  para('One more caveat: the 42% figure counts all dementia, including mild cases diagnosed late in life - so treat this as a range to reason with, not a promise about your own outcome.', 9, { color: MUTED });

  // F. Advisor endorsement box
  const endorse = wrap([{ t: 'Review this report with your financial advisor, estate attorney, or CPA. They protect the money. This protects the person the money is for. You need both.', bold: true }], 10, CW - 20);
  const bh = endorse.length * 14 + 16;
  need(bh + 8); y -= 4;
  page.drawRectangle({ x: M, y: y - bh, width: CW, height: bh, borderColor: GREEN, borderWidth: 1 });
  const top = y; y -= 4;
  drawLines(endorse, M + 10, 10, 14, GREEN);
  y = top - bh - 10;

  // G. Tagline
  para([{ t: TAGLINE, bold: true }], 10.5, { align: 'c', after: 10 });

  // H. Disclaimers
  para([{ t: 'Medical Disclaimer: ', bold: true }, { t: 'My4MLife provides access to telehealth services and prescription medications through licensed healthcare providers and pharmacies. Compounded medications are not FDA-approved. Individual results may vary. GLP-1 medications are prescription-only and require a physician evaluation. This website does not provide medical advice. Always consult with a qualified healthcare provider regarding your health. Testimonials reflect individual experiences and are not guarantees of results. Images may use models for privacy.' }], 7.5, { color: MUTED, after: 4 });
  para("These figures are illustrative estimates based on published third-party cost-of-care data (Alzheimer's Association, CareScout/Genworth, USC Schaeffer Center) and a hypothetical relative-risk-reduction assumption. This is not financial, tax, insurance, or legal advice, and no protocol guarantees a reduction in your personal risk. Consult your own financial advisor and physician.", 7.5, { color: MUTED });

  // I. Footer on every page
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(FOOT, { x: M, y: 28, size: 8, font: reg, color: MUTED });
    const label = `Page ${i + 1} of ${pages.length}`;
    p.drawText(label, { x: W - M - textWidth(reg, label, 8), y: 28, size: 8, font: reg, color: MUTED });
  });
  return doc.save();
}
