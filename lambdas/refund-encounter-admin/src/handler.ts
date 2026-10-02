// refund-encounter-admin — AppSync DIRECT LAMBDA RESOLVER (mutation refundEncounterAdmin).
// Thin wrapper: Admins check, then @my4mlife/encounter-refund does the guarded Stripe refund.
import { refundEncounter, RefundError } from '@my4mlife/encounter-refund';

export interface AppSyncEvent {
  arguments: { contactId: string; encounterId: string };
  identity?: { groups?: string[]; username?: string; [key: string]: unknown };
}

export interface EncounterRefundResult {
  ok: boolean;
  refundId?: string;
  amountCents?: number;
  emailSent?: boolean;
  error?: string;
  code?: string;
}

export const handler = async (event: AppSyncEvent): Promise<EncounterRefundResult> => {
  if (!(event.identity?.groups ?? []).includes('Admins')) throw new Error('Unauthorized: Admins group required');
  const { contactId, encounterId } = event.arguments;
  try {
    return await refundEncounter({ contactId, encounterId, actor: event.identity?.username ?? 'admin' });
  } catch (e) {
    const err = e as Error & { code?: string };
    return { ok: false, error: err.message, code: e instanceof RefundError ? err.code : 'refund_failed' };
  }
};
