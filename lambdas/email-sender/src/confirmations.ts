// Personal confirmations sent from Dr. TJ, by formId. null = use the generic template confirmation.
import { composeCoachingConfirmation } from './coaching-confirmation';
import { composePartnerConfirmation } from './partner-confirmation';
import { composeSpeakingConfirmation } from './speaking-confirmation';

type Compose = (f: Record<string, unknown>) => { subject: string; html: string; text: string };
const FROM_DRTJ: Record<string, Compose> = {
  'coaching-application': composeCoachingConfirmation,
  'partner-application': composePartnerConfirmation,
  'speaking-inquiry': composeSpeakingConfirmation,
};

// Public forms that carry the honeypot (hp) + timing (t) fields.
export const BOT_CHECKED = new Set(['partner-application', 'speaking-inquiry']);

export function drtjConfirmation(formId: string, fields: Record<string, unknown>) {
  const compose = FROM_DRTJ[formId];
  return compose ? compose(fields) : null;
}
