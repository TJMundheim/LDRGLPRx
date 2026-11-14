import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { buildReport } from '../../../website/src/lib/uninsured-decade-report';
import { reply, botCheck } from './http';
import { validate } from './validate';
import { renderReportPdf } from './pdf';
import { buildEmail, sendReportEmail } from './email';
import { upsertReportContact } from './contact';

/**
 * Uninsured Decade report: POST /api/ud-calculator-report
 * Body: { age, spouseAge?, stateAbbr, netWorthBand, monthlySpend, exerciseHours, rrrPct, firstName, email, advisorEmail?, emailOptIn, consentVersion, hp?, t? }
 * Every number is computed here by buildReport; nothing client-supplied reaches the email or PDF except validated inputs and the first name.
 * Logs outcome codes only: never email, name, or advisor address.
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = (event.headers?.['origin'] ?? event.headers?.['Origin']) as string | undefined;
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(204, {}, origin);

  let body: any;
  try { body = event.body ? JSON.parse(event.body) : {}; }
  catch { return reply(400, { error: 'invalid JSON body' }, origin); }
  if (!body || typeof body !== 'object') return reply(400, { error: 'invalid JSON body' }, origin);

  const bot = botCheck(body);
  if (bot) { console.log(`[ud-report] bot-blocked ${bot}`); return reply(200, { ok: true }, origin); }

  const req = validate(body);
  if (typeof req === 'string') { console.log('[ud-report] invalid'); return reply(400, { error: req }, origin); }

  // Contact capture is best effort and never blocks the report.
  try { await upsertReportContact(req.email, req.firstName, req.emailOptIn, req.consentVersion); } catch { console.error('[ud-report] contact-failed'); }

  try {
    const report = buildReport(req.inputs);
    const pdf = await renderReportPdf(report, req.firstName, req.inputs);
    const safeName = req.firstName.normalize('NFD').replace(/[^A-Za-z0-9-]/g, '') || 'Report';
    await sendReportEmail(req.email, req.advisorEmail, buildEmail(report, req.firstName, !!req.advisorEmail), `Uninsured-Decade-${safeName}.pdf`, pdf);
  } catch { console.error('[ud-report] send-failed'); return reply(502, { error: 'We could not email your report just now.' }, origin); }

  console.log(`[ud-report] sent${req.advisorEmail ? ' with-advisor' : ''}`);
  return reply(200, { ok: true }, origin);
};
