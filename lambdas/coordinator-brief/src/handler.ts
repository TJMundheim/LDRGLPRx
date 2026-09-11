// coordinator-brief — assembles a Bedrock-drafted pre-call brief for Dr. TJ
// ahead of a coordinator call, stores it on the PatientRecord, and (for the
// automatic pipeline triggers) emails it to the coordinator inbox.
//
// Three invocation shapes:
//   Direct invoke — { kind: 'coordinator-notify', contactId, encounterId }
//     Generates + stores the brief AND emails it via the email-sender Lambda.
//   AppSync direct-resolver — { arguments: { contactId, encounterId }, identity }
//     Generates + stores the brief on demand (admin UI "regenerate brief"
//     button); no email send.
//   Assessment-complete — { kind: 'assessment-complete', contactId }
//     Fired by audit-complete once a MindSpan assessment finishes AFTER
//     intake. Looks up the patient's latest care-coordinator encounter and
//     regenerates that brief with the new scores; skips silently if the
//     contact has no care-coordinator encounter yet.
//
// NOTE: AI calls use @aws-sdk/client-bedrock-runtime only — never
// @anthropic-ai/sdk in production Lambdas.
import type { Brief } from './bedrock';
import { storeBrief, storeAudit } from './store';
import { buildBrief, notifyCoordinator } from './notify';
import { findLatestCoordinatorEncounter } from './lookup';

interface DirectInvokeEvent {
  kind: 'coordinator-notify';
  contactId: string;
  encounterId: string;
}

interface AssessmentCompleteEvent {
  kind: 'assessment-complete';
  contactId: string;
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

export const handler = async (event: DirectInvokeEvent | AppSyncEvent | AssessmentCompleteEvent): Promise<BriefResult | { skipped: true }> => {
  const isAppSync = 'arguments' in event;

  if (isAppSync) {
    const { contactId, encounterId } = event.arguments;
    const actor = event.identity?.username ?? event.identity?.sub ?? 'system';
    const { brief, createdAt } = await buildBrief(contactId, encounterId);
    await storeBrief(contactId, encounterId, brief, createdAt);
    await storeAudit(contactId, actor);
    return { encounterId, json: brief, createdAt };
  }

  if (event.kind === 'assessment-complete') {
    const found = await findLatestCoordinatorEncounter(event.contactId);
    if (!found) return { skipped: true };
    return notifyCoordinator(event.contactId, found.encounterId, '[Pre-call brief — updated with MindSpan]');
  }

  const { contactId, encounterId } = event;
  return notifyCoordinator(contactId, encounterId);
};
