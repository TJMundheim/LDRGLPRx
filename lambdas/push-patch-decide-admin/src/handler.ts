// push-patch-decide-admin — AppSync DIRECT LAMBDA RESOLVER (mutation decidePushPatchAdmin).
// Thin wrapper: Admins check, then the SAME decide() the physician email link uses.
import { decide } from '@my4mlife/push-patch-decision-core';

export interface AppSyncEvent {
  arguments: { contactId: string; encounterId: string; action: string };
  identity?: { groups?: string[]; username?: string; [key: string]: unknown };
}

export interface PushPatchDecisionResult {
  ok: boolean;
  state?: string;
  mailOk?: boolean;
  code?: string;
  error?: string;
}

export const handler = async (event: AppSyncEvent): Promise<PushPatchDecisionResult> => {
  if (!(event.identity?.groups ?? []).includes('Admins')) throw new Error('Unauthorized: Admins group required');
  const { contactId, encounterId, action } = event.arguments;
  if (action !== 'approve' && action !== 'decline') return { ok: false, code: 'invalid_action', error: 'action must be approve or decline' };
  try {
    const out = await decide({ contactId, encounterId, action, decidedBy: `admin:${event.identity?.username ?? 'admin'}` });
    switch (out.kind) {
      case 'approved': return { ok: true, state: 'script-written', mailOk: out.mailOk };
      case 'declined': return { ok: true, state: 'declined', mailOk: out.mailOk };
      case 'already-decided': return { ok: false, code: 'already_decided', state: out.state, error: `Already decided: ${out.state}` };
      default: return { ok: false, code: 'not_found', error: 'Push Patch encounter not found' };
    }
  } catch (e) {
    console.error('push-patch-decide-admin failed', (e as Error).name); // no PHI: error class only
    return { ok: false, code: 'decision_failed', error: 'The decision could not be completed. Nothing was changed; try again.' };
  }
};
