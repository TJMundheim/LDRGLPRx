// my4mlife-provider-handoff — AppSync direct Lambda data source.
//
// Makes "Send to provider" real: enforce the HIPAA consent gate, generate the
// clinical packet (via export-clinical-packet — the single renderer), email the
// provider inbox a short cover note with the presigned link, stamp the
// encounter, and write a `provider.sent` audit row.
//
// Defense in depth: updateEncounterStateAdmin's own consent gate stays as is;
// this Lambda checks the same two consents on the record independently.
import { hasProviderConsents } from '@my4mlife/patient-record';
import { providerEmail } from './config';
import { getEncounter, getRecord, stampProviderSent, writeProviderSentAudit } from './store';
import { generatePacket } from './packet';
import { COORDINATOR_CC, renderCoverNote, sendMail, subjectFor } from './mail';

interface AppSyncEvent {
  arguments: { contactId: string; encounterId: string };
  identity?: { groups?: string[]; claims?: { 'cognito:groups'?: string[] } };
}

export interface ProviderHandoffResult {
  ok: boolean;
  sentTo?: string;
  packetUrl?: string;
  error?: string;
}

function isAdmin(event: AppSyncEvent): boolean {
  const groups = event.identity?.groups ?? event.identity?.claims?.['cognito:groups'] ?? [];
  return Array.isArray(groups) && groups.includes('Admins');
}

export function patientNameOf(record: Record<string, unknown> | undefined): string {
  const d = record?.['demographics'] as { firstName?: string; lastName?: string } | undefined;
  return [d?.firstName, d?.lastName].filter(Boolean).join(' ').trim();
}

export const handler = async (event: AppSyncEvent): Promise<ProviderHandoffResult> => {
  if (!isAdmin(event)) throw new Error('Unauthorized');

  const { contactId, encounterId } = event.arguments;
  if (!contactId || !encounterId) return { ok: false, error: 'contactId and encounterId required' };

  try {
    const [record, encounter] = await Promise.all([
      getRecord(contactId),
      getEncounter(contactId, encounterId),
    ]);
    if (!record) return { ok: false, error: 'patient record not found' };
    if (!encounter) return { ok: false, error: 'encounter not found' };

    const consents = record['consents'] as Record<string, unknown> | undefined;
    if (!hasProviderConsents(consents)) {
      return { ok: false, error: 'Consent required: NPP + Patient Authorization not signed' };
    }

    const to = await providerEmail();
    const { packetUrl, packetKey } = await generatePacket(contactId, encounterId);

    const patientName = patientNameOf(record) || 'Patient';
    const laneLabel = (encounter['laneLabel'] as string | undefined) ?? 'prescription review';
    const resend = encounter['state'] === 'sent-to-provider';

    const { html, text } = renderCoverNote({ patientName, laneLabel, packetUrl, resend });
    await sendMail({ to, cc: COORDINATOR_CC, subject: subjectFor(patientName, laneLabel), html, text });

    const at = new Date().toISOString();
    await stampProviderSent({ contactId, encounterId, sentTo: to, packetKey, at });
    await writeProviderSentAudit({ contactId, encounterId, sentTo: to, packetKey, resend, at });

    return { ok: true, sentTo: to, packetUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'Unauthorized') throw err;
    // Never log the presigned URL or any patient field.
    console.error('[provider-handoff] failed:', msg);
    return { ok: false, error: msg };
  }
};
