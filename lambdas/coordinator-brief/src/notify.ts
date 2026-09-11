// Builds a Bedrock-drafted pre-call brief, stores it, and emails the
// coordinator inbox. Shared by the direct-invoke and assessment-complete
// event shapes in handler.ts.
import { gather } from './gather';
import { systemPrompt, userPrompt } from './prompt';
import { generateBrief, type Brief } from './bedrock';
import { renderHtml, renderText } from './render';
import { mailBrief } from './mail';
import { storeBrief, storeAudit } from './store';
import type { BriefResult } from './handler';

export async function buildBrief(contactId: string, encounterId: string): Promise<{ brief: Brief; createdAt: string; header: { name: string; phone: string; bestTime: string } }> {
  const gathered = await gather(contactId, encounterId);
  const brief = await generateBrief(systemPrompt, userPrompt(gathered));
  const createdAt = new Date().toISOString();

  const demo = (gathered.record?.['demographics'] as Record<string, unknown>) ?? {};
  const screening = (gathered.record?.['screeningAnswers'] as Record<string, unknown>) ?? {};
  const name = (gathered.contact?.['firstName'] as string) ?? (demo['firstName'] as string) ?? 'the patient';
  const phone = (gathered.contact?.['phone'] as string) ?? (demo['phone'] as string) ?? 'no phone on file';
  const bestTime = (gathered.contact?.['bestTime'] as string)
    ?? (gathered.encounter?.['bestTime'] as string)
    ?? (screening['bestTime'] as string)
    ?? 'soon';

  return { brief, createdAt, header: { name, phone, bestTime } };
}

/** Generates + stores a brief and emails it to the coordinator inbox.
 *  `subjectPrefix` overrides the default "[Pre-call brief]" prefix — used
 *  when a MindSpan assessment completion regenerates an already-sent brief.
 */
export async function notifyCoordinator(contactId: string, encounterId: string, subjectPrefix?: string): Promise<BriefResult> {
  const { brief, createdAt, header } = await buildBrief(contactId, encounterId);
  await storeBrief(contactId, encounterId, brief, createdAt);
  await storeAudit(contactId, 'system');

  const topLane = brief.recommended_lanes?.[0]?.lane ?? 'consult';
  await mailBrief({
    name: header.name,
    bestTime: header.bestTime,
    topLane,
    html: renderHtml(header, brief),
    text: renderText(header, brief),
    subjectPrefix,
  });

  return { encounterId, json: brief, createdAt };
}
