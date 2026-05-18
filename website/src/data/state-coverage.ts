// PLACEHOLDER LIST — replace with telemed partner's actual coverage when received.
// When the real list arrives this is the ONLY file that needs to change:
// move codes between COVERED_STATES and WAITLIST_STATES.

export interface USState {
  code: string;
  name: string;
}

export const US_STATES: USState[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

// PLACEHOLDER: arbitrary alphabetized 34 of 50. Swap on real-list arrival.
export const COVERED_STATES: string[] = [
  'AL','AZ','AR','CA','CO','CT','DE','FL','GA','ID',
  'IL','IN','IA','KS','KY','LA','MD','MA','MI','MN',
  'MO','NV','NJ','NM','NY','NC','OH','OK','PA','SC',
  'TN','TX','VA','WA',
];

// Remaining 16 — waitlist eligible.
export const WAITLIST_STATES: string[] = [
  'AK','HI','ME','MS','MT','NE','NH','ND','OR','RI',
  'SD','UT','VT','WV','WI','WY',
];

export function isCovered(stateCode: string): boolean {
  return COVERED_STATES.includes(stateCode.toUpperCase());
}

export function isWaitlistEligible(stateCode: string): boolean {
  return WAITLIST_STATES.includes(stateCode.toUpperCase());
}

export function stateName(code: string): string {
  return US_STATES.find((s) => s.code === code.toUpperCase())?.name ?? code;
}
