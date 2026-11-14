import { COST_OF_CARE_BY_STATE } from '../../../website/src/data/cost-of-care-by-state';
import { NET_WORTH_BAND_LABELS, type NetWorthBand } from '../../../website/src/lib/uninsured-decade-math';
import type { UdInputs } from '../../../website/src/lib/uninsured-decade-report';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATES = new Set(COST_OF_CARE_BY_STATE.map((r) => r.abbr));
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown, lo: number, hi: number, int = false): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi && (!int || Number.isInteger(v));

export interface Request {
  inputs: UdInputs; firstName: string; email: string; advisorEmail?: string; emailOptIn: boolean; consentVersion: string;
}

/** Returns a Request, or a plain-language error message. Only validated fields ever leave this function. */
export function validate(b: any): Request | string {
  const firstName = str(b.firstName, 41), email = str(b.email, 254).toLowerCase();
  if (!firstName || firstName.length > 40 || !EMAIL_RE.test(email)) return 'Please check your first name and email, then try again.';
  const rawAdvisor = str(b.advisorEmail, 254).toLowerCase();
  if (rawAdvisor && (!EMAIL_RE.test(rawAdvisor) || rawAdvisor === email)) return 'Please check the advisor email and try again.';

  const hasSpouse = b.spouseAge !== undefined && b.spouseAge !== null;
  if (!num(b.age, 45, 85, true) || (hasSpouse && !num(b.spouseAge, 45, 85, true))) return 'Ages must be whole numbers from 45 to 85.';
  if (typeof b.stateAbbr !== 'string' || !STATES.has(b.stateAbbr)) return 'Please choose a state.';
  if (typeof b.netWorthBand !== 'string' || !Object.prototype.hasOwnProperty.call(NET_WORTH_BAND_LABELS, b.netWorthBand)) return 'Please choose a net worth range.';
  if (!num(b.monthlySpend, 0, 100000)) return 'Monthly spend must be between 0 and 100,000.';
  if (!num(b.exerciseHours, 0, 40)) return 'Exercise hours must be between 0 and 40.';
  if (!num(b.rrrPct, 0, 50)) return 'Risk reduction must be between 0 and 50.';

  return {
    inputs: {
      age: b.age, ...(hasSpouse ? { spouseAge: b.spouseAge } : {}), stateAbbr: b.stateAbbr, netWorthBand: b.netWorthBand as NetWorthBand,
      monthlySpend: b.monthlySpend, exerciseHours: b.exerciseHours, rrrPct: b.rrrPct,
    },
    firstName, email, ...(rawAdvisor ? { advisorEmail: rawAdvisor } : {}),
    emailOptIn: b.emailOptIn === true, consentVersion: str(b.consentVersion, 60) || 'ud-calc-v1',
  };
}
