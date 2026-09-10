// my4mlife-plan-of-action — AppSync direct Lambda data source.
// 'draft': notes + brief -> Bedrock -> stored draft. 'send': store 'sending',
// email patient, mark 'sent', audit, notify coordinator.
import { getRecord, getBrief, getPlan, putDraftPlan, upsertPlanSending, markPlanSent, writeAudit } from './store';
import { buildPrompt, DISCLAIMER } from './prompt';
import { draftPlan, type PlanJson } from './bedrock';
import { validateLinks, renderPlan } from './render';
import { sendMail, NOTIFY_TO } from './mail';

interface AppSyncEvent {
  arguments: {
    action: 'draft' | 'send';
    contactId: string;
    encounterId: string;
    coordinatorNotes?: string;
    planJson?: PlanJson | string;
  };
  identity?: unknown;
}

interface PlanResult {
  encounterId: string;
  state: 'draft' | 'sent';
  json: PlanJson;
  createdAt: string;
  sentAt: string | null;
}

function firstNameOf(record: Record<string, unknown> | undefined): string | undefined {
  return (record?.['demographics'] as { firstName?: string } | undefined)?.firstName;
}

function emailOf(record: Record<string, unknown> | undefined): string | undefined {
  return (record?.['demographics'] as { email?: string } | undefined)?.email;
}

async function handleDraft(contactId: string, encounterId: string, coordinatorNotes?: string): Promise<PlanResult> {
  const [record, brief] = await Promise.all([getRecord(contactId), getBrief(contactId, encounterId)]);
  const { system, user } = buildPrompt({ firstName: firstNameOf(record), coordinatorNotes, briefJson: brief?.['json'] });

  const plan = await draftPlan(system, user);
  plan.disclaimer = DISCLAIMER;

  const ts = new Date().toISOString();
  await putDraftPlan(contactId, encounterId, plan, ts);

  return { encounterId, state: 'draft', json: plan, createdAt: ts, sentAt: null };
}

/** AppSync parses AWSJSON arguments into objects, but be defensive: a caller
 *  (or a direct invoke) may still hand us the raw JSON string. */
function asPlan(raw: unknown): PlanJson | undefined {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as PlanJson; } catch { throw new Error('planJson is not valid JSON'); }
  }
  return (raw ?? undefined) as PlanJson | undefined;
}

async function handleSend(contactId: string, encounterId: string, planJsonArg?: unknown): Promise<PlanResult> {
  let plan = asPlan(planJsonArg);
  let createdAt: string | undefined;

  if (!plan) {
    const existing = await getPlan(contactId, encounterId);
    if (!existing) throw new Error('no plan found to send');
    plan = asPlan(existing['json']);
    if (!plan) throw new Error('stored plan has no body');
    createdAt = existing['createdAt'] as string | undefined;
  }

  plan.disclaimer = DISCLAIMER;
  validateLinks(plan);

  const record = await getRecord(contactId);
  const email = emailOf(record);
  if (!email) throw new Error('no patient email on file');

  // Store before sending so a mail failure below still leaves a record.
  const sendingTs = new Date().toISOString();
  await upsertPlanSending(contactId, encounterId, plan, sendingTs);

  const { html, text } = renderPlan(plan, firstNameOf(record));
  await sendMail(email, plan.subject, html, text);

  const ts = new Date().toISOString();
  await markPlanSent(contactId, encounterId, plan, ts);
  await writeAudit(contactId, encounterId, 'plan-sent', ts);

  await sendMail(NOTIFY_TO, `[Plan sent] ${plan.subject}`, html, text);

  return { encounterId, state: 'sent', json: plan, createdAt: createdAt ?? sendingTs, sentAt: ts };
}

export const handler = async (event: AppSyncEvent): Promise<PlanResult> => {
  const { action, contactId, encounterId, coordinatorNotes, planJson } = event.arguments;
  if (action === 'draft') return handleDraft(contactId, encounterId, coordinatorNotes);
  if (action === 'send') return handleSend(contactId, encounterId, planJson);
  throw new Error(`unknown action: ${action}`);
};
