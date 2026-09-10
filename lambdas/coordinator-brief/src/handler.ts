// coordinator-brief — assembles a Bedrock-drafted pre-call brief for Dr. TJ
// ahead of a coordinator call, stores it on the PatientRecord, and (for the
// automatic pipeline trigger) emails it to the coordinator inbox.
//
// Two invocation shapes:
//   Direct invoke — { kind: 'coordinator-notify', contactId, encounterId }
//     Generates + stores the brief AND emails it via the email-sender Lambda.
//   AppSync direct-resolver — { arguments: { contactId, encounterId }, identity }
//     Generates + stores the brief on demand (admin UI "regenerate brief"
//     button); no email send.
//
// NOTE: AI calls use @aws-sdk/client-bedrock-runtime only — never
// @anthropic-ai/sdk in production Lambdas.
import { gather } from './gather';
import { systemPrompt, userPrompt } from './prompt';
import { generateBrief, type Brief } from './bedrock';
import { renderHtml, renderText } from './render';
import { mailBrief } from './mail';
import { storeBrief, storeAudit } from './store';

interface DirectInvokeEvent {
  kind: 'coordinator-notify';
  contactId: string;
  encounterId: string;
}

interface AppSyncEvent {
  arguments: { contactId: string; encounterId: string };
  identity?: { username?: string; sub?: string; [key: string]: unknown };
}

export interface BriefResult {
  encounterId: string;
  /** The brief itself. Returned as an object, not a string — the GraphQL field
   *  is AWSJSON, which AppSync serialises for us. */
  json: Brief;
  createdAt: string;
}

async function buildBrief(contactId: string, encounterId: string): Promise<{ brief: Brief; createdAt: string; header: { name: string; phone: string; bestTime: string } }> {
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

export const handler = async (event: DirectInvokeEvent | AppSyncEvent): Promise<BriefResult> => {
  const isAppSync = 'arguments' in event;

  if (isAppSync) {
    const { contactId, encounterId } = event.arguments;
    const actor = event.identity?.username ?? event.identity?.sub ?? 'system';
    const { brief, createdAt } = await buildBrief(contactId, encounterId);
    await storeBrief(contactId, encounterId, brief, createdAt);
    await storeAudit(contactId, actor);
    return { encounterId, json: brief, createdAt };
  }

  const { contactId, encounterId } = event;
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
  });

  return { encounterId, json: brief, createdAt };
};
