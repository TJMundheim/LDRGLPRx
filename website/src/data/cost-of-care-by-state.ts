// Cost-of-care index by state, for The Uninsured Decade calculator (/go/uninsured-decade).
//
// Sources:
// - National baselines (2025 survey, fielded July-Nov 2025): CareScout/Genworth 2025 Cost of Care
//   Survey — nursing home private room median $129,575/yr ($355/day), assisted living median
//   $6,200/mo. See docs/book-uninsured-decade/source/figures-verified-2026-09-07.md.
// - Per-state nursing home + assisted living figures: Raya's Paradise state breakdowns, which cite
//   the CareScout/Genworth 2025 survey as their source (accessed 2026-09-08). CareScout does not
//   publish the full state table on its own marketing page, so this is a secondary aggregator of
//   the primary survey, not the primary source itself.
// - Per-state in-home hourly figures: A Place for Mom, "2026 Costs of Long-Term Care and Senior
//   Living Report" (accessed 2026-09-08). National median in that report is $34/hr, close to but
//   not identical to CareScout's $35/hr national median — indices below are computed against each
//   dataset's own national median, so the two stay internally consistent even though they come
//   from different survey instruments.
//
// `estimated: true` means at least one figure for that state/territory could not be verified in a
// state-level table and was backfilled with the national median (per project instruction: "where
// you cannot verify a state, use the national median and mark `estimated: true`").
//
// facilityIndex = state nursingHomeAnnual / national nursing home annual median ($129,575)
// inHomeIndex   = state inHomeHourly / national in-home hourly median ($34/hr, A Place for Mom basis)

export interface StateCostOfCare {
  state: string;
  abbr: string;
  /** CareScout/Genworth 2025 median annual private-room nursing home cost for this state. */
  nursingHomeAnnual: number;
  /** CareScout/Genworth 2025 median monthly assisted-living cost for this state. */
  assistedLivingMonthly: number;
  /** A Place for Mom 2026 report median hourly non-medical in-home care rate for this state. */
  inHomeHourly: number;
  /** State nursingHomeAnnual / national nursing home median. Used to scale the late-stage (facility) cost. */
  facilityIndex: number;
  /** State inHomeHourly / national in-home median. Used to scale early/mid-stage (in-home) cost. */
  inHomeIndex: number;
  /** True if one or more figures for this state were unavailable and backfilled with the national median. */
  estimated: boolean;
}

export const COST_OF_CARE_SOURCE = 'CareScout/Genworth 2025 Cost of Care Survey (nursing home, assisted living); A Place for Mom 2026 Costs of Long-Term Care and Senior Living Report (in-home hourly)';
export const COST_OF_CARE_YEAR = 2025;

export const NATIONAL_NURSING_HOME_ANNUAL = 129575;
export const NATIONAL_ASSISTED_LIVING_MONTHLY = 6200;
export const NATIONAL_IN_HOME_HOURLY = 34;

export const COST_OF_CARE_BY_STATE: StateCostOfCare[] = [
  { state: 'Alabama', abbr: 'AL', nursingHomeAnnual: 105444, assistedLivingMonthly: 4425, inHomeHourly: 26, facilityIndex: 0.8138, inHomeIndex: 0.7647, estimated: false },
  { state: 'Alaska', abbr: 'AK', nursingHomeAnnual: 129575, assistedLivingMonthly: 9882, inHomeHourly: 37.5, facilityIndex: 1.0, inHomeIndex: 1.1029, estimated: true },
  { state: 'Arizona', abbr: 'AZ', nursingHomeAnnual: 137244, assistedLivingMonthly: 6250, inHomeHourly: 36, facilityIndex: 1.0592, inHomeIndex: 1.0588, estimated: false },
  { state: 'Arkansas', abbr: 'AR', nursingHomeAnnual: 96720, assistedLivingMonthly: 4637, inHomeHourly: 30, facilityIndex: 0.7464, inHomeIndex: 0.8824, estimated: false },
  { state: 'California', abbr: 'CA', nursingHomeAnnual: 182136, assistedLivingMonthly: 7000, inHomeHourly: 38.5, facilityIndex: 1.4056, inHomeIndex: 1.1324, estimated: false },
  { state: 'Colorado', abbr: 'CO', nursingHomeAnnual: 146184, assistedLivingMonthly: 6584, inHomeHourly: 40, facilityIndex: 1.1282, inHomeIndex: 1.1765, estimated: false },
  { state: 'Connecticut', abbr: 'CT', nursingHomeAnnual: 200748, assistedLivingMonthly: 9118, inHomeHourly: 34, facilityIndex: 1.5493, inHomeIndex: 1.0, estimated: false },
  { state: 'Delaware', abbr: 'DE', nursingHomeAnnual: 181584, assistedLivingMonthly: 7600, inHomeHourly: 35, facilityIndex: 1.4014, inHomeIndex: 1.0294, estimated: false },
  { state: 'District of Columbia', abbr: 'DC', nursingHomeAnnual: 129575, assistedLivingMonthly: 6200, inHomeHourly: 30, facilityIndex: 1.0, inHomeIndex: 0.8824, estimated: true },
  { state: 'Florida', abbr: 'FL', nursingHomeAnnual: 146004, assistedLivingMonthly: 5610, inHomeHourly: 31, facilityIndex: 1.1268, inHomeIndex: 0.9118, estimated: false },
  { state: 'Georgia', abbr: 'GA', nursingHomeAnnual: 113148, assistedLivingMonthly: 5300, inHomeHourly: 31, facilityIndex: 0.8732, inHomeIndex: 0.9118, estimated: false },
  { state: 'Hawaii', abbr: 'HI', nursingHomeAnnual: 196740, assistedLivingMonthly: 12096, inHomeHourly: 40, facilityIndex: 1.5183, inHomeIndex: 1.1765, estimated: false },
  { state: 'Idaho', abbr: 'ID', nursingHomeAnnual: 146004, assistedLivingMonthly: 5175, inHomeHourly: 35, facilityIndex: 1.1268, inHomeIndex: 1.0294, estimated: false },
  { state: 'Illinois', abbr: 'IL', nursingHomeAnnual: 110592, assistedLivingMonthly: 6219, inHomeHourly: 35, facilityIndex: 0.8535, inHomeIndex: 1.0294, estimated: false },
  { state: 'Indiana', abbr: 'IN', nursingHomeAnnual: 123912, assistedLivingMonthly: 5639, inHomeHourly: 34, facilityIndex: 0.9563, inHomeIndex: 1.0, estimated: false },
  { state: 'Iowa', abbr: 'IA', nursingHomeAnnual: 120456, assistedLivingMonthly: 5381, inHomeHourly: 34, facilityIndex: 0.9296, inHomeIndex: 1.0, estimated: false },
  { state: 'Kansas', abbr: 'KS', nursingHomeAnnual: 108768, assistedLivingMonthly: 5975, inHomeHourly: 34, facilityIndex: 0.8394, inHomeIndex: 1.0, estimated: false },
  { state: 'Kentucky', abbr: 'KY', nursingHomeAnnual: 135048, assistedLivingMonthly: 5528, inHomeHourly: 33, facilityIndex: 1.0422, inHomeIndex: 0.9706, estimated: false },
  { state: 'Louisiana', abbr: 'LA', nursingHomeAnnual: 96912, assistedLivingMonthly: 5163, inHomeHourly: 26, facilityIndex: 0.7479, inHomeIndex: 0.7647, estimated: false },
  { state: 'Maine', abbr: 'ME', nursingHomeAnnual: 178848, assistedLivingMonthly: 8205, inHomeHourly: 40, facilityIndex: 1.3803, inHomeIndex: 1.1765, estimated: false },
  { state: 'Maryland', abbr: 'MD', nursingHomeAnnual: 173376, assistedLivingMonthly: 7173, inHomeHourly: 35, facilityIndex: 1.338, inHomeIndex: 1.0294, estimated: false },
  { state: 'Massachusetts', abbr: 'MA', nursingHomeAnnual: 189804, assistedLivingMonthly: 9600, inHomeHourly: 39, facilityIndex: 1.4648, inHomeIndex: 1.1471, estimated: false },
  { state: 'Michigan', abbr: 'MI', nursingHomeAnnual: 143628, assistedLivingMonthly: 5818, inHomeHourly: 33, facilityIndex: 1.1085, inHomeIndex: 0.9706, estimated: false },
  { state: 'Minnesota', abbr: 'MN', nursingHomeAnnual: 166440, assistedLivingMonthly: 6573, inHomeHourly: 42, facilityIndex: 1.2845, inHomeIndex: 1.2353, estimated: false },
  { state: 'Mississippi', abbr: 'MS', nursingHomeAnnual: 118620, assistedLivingMonthly: 4369, inHomeHourly: 25, facilityIndex: 0.9155, inHomeIndex: 0.7353, estimated: false },
  { state: 'Missouri', abbr: 'MO', nursingHomeAnnual: 91248, assistedLivingMonthly: 5400, inHomeHourly: 33, facilityIndex: 0.7042, inHomeIndex: 0.9706, estimated: false },
  { state: 'Montana', abbr: 'MT', nursingHomeAnnual: 114972, assistedLivingMonthly: 6075, inHomeHourly: 42, facilityIndex: 0.8873, inHomeIndex: 1.2353, estimated: false },
  { state: 'Nebraska', abbr: 'NE', nursingHomeAnnual: 110592, assistedLivingMonthly: 6350, inHomeHourly: 34, facilityIndex: 0.8535, inHomeIndex: 1.0, estimated: false },
  { state: 'Nevada', abbr: 'NV', nursingHomeAnnual: 173556, assistedLivingMonthly: 6241, inHomeHourly: 34, facilityIndex: 1.3394, inHomeIndex: 1.0, estimated: false },
  { state: 'New Hampshire', abbr: 'NH', nursingHomeAnnual: 161328, assistedLivingMonthly: 8025, inHomeHourly: 41, facilityIndex: 1.2451, inHomeIndex: 1.2059, estimated: false },
  { state: 'New Jersey', abbr: 'NJ', nursingHomeAnnual: 173376, assistedLivingMonthly: 8710, inHomeHourly: 36, facilityIndex: 1.338, inHomeIndex: 1.0588, estimated: false },
  { state: 'New Mexico', abbr: 'NM', nursingHomeAnnual: 127596, assistedLivingMonthly: 5950, inHomeHourly: 32, facilityIndex: 0.9847, inHomeIndex: 0.9412, estimated: false },
  { state: 'New York', abbr: 'NY', nursingHomeAnnual: 200748, assistedLivingMonthly: 7110, inHomeHourly: 35, facilityIndex: 1.5493, inHomeIndex: 1.0294, estimated: false },
  { state: 'North Carolina', abbr: 'NC', nursingHomeAnnual: 129576, assistedLivingMonthly: 6496, inHomeHourly: 30, facilityIndex: 1.0, inHomeIndex: 0.8824, estimated: false },
  { state: 'North Dakota', abbr: 'ND', nursingHomeAnnual: 147648, assistedLivingMonthly: 4729, inHomeHourly: 35, facilityIndex: 1.1395, inHomeIndex: 1.0294, estimated: false },
  { state: 'Ohio', abbr: 'OH', nursingHomeAnnual: 124668, assistedLivingMonthly: 6103, inHomeHourly: 34, facilityIndex: 0.9621, inHomeIndex: 1.0, estimated: false },
  { state: 'Oklahoma', abbr: 'OK', nursingHomeAnnual: 93072, assistedLivingMonthly: 6150, inHomeHourly: 30, facilityIndex: 0.7183, inHomeIndex: 0.8824, estimated: false },
  { state: 'Oregon', abbr: 'OR', nursingHomeAnnual: 221376, assistedLivingMonthly: 6875, inHomeHourly: 40, facilityIndex: 1.7085, inHomeIndex: 1.1765, estimated: false },
  { state: 'Pennsylvania', abbr: 'PA', nursingHomeAnnual: 164256, assistedLivingMonthly: 6480, inHomeHourly: 34, facilityIndex: 1.2677, inHomeIndex: 1.0, estimated: false },
  { state: 'Rhode Island', abbr: 'RI', nursingHomeAnnual: 160596, assistedLivingMonthly: 7781, inHomeHourly: 39, facilityIndex: 1.2394, inHomeIndex: 1.1471, estimated: false },
  { state: 'South Carolina', abbr: 'SC', nursingHomeAnnual: 115344, assistedLivingMonthly: 5350, inHomeHourly: 32, facilityIndex: 0.8902, inHomeIndex: 0.9412, estimated: false },
  { state: 'South Dakota', abbr: 'SD', nursingHomeAnnual: 122280, assistedLivingMonthly: 4900, inHomeHourly: 44, facilityIndex: 0.9437, inHomeIndex: 1.2941, estimated: false },
  { state: 'Tennessee', abbr: 'TN', nursingHomeAnnual: 120456, assistedLivingMonthly: 5845, inHomeHourly: 32, facilityIndex: 0.9296, inHomeIndex: 0.9412, estimated: false },
  { state: 'Texas', abbr: 'TX', nursingHomeAnnual: 91248, assistedLivingMonthly: 5666, inHomeHourly: 30, facilityIndex: 0.7042, inHomeIndex: 0.8824, estimated: false },
  { state: 'Utah', abbr: 'UT', nursingHomeAnnual: 127752, assistedLivingMonthly: 5475, inHomeHourly: 35, facilityIndex: 0.9859, inHomeIndex: 1.0294, estimated: false },
  { state: 'Vermont', abbr: 'VT', nursingHomeAnnual: 186336, assistedLivingMonthly: 8597, inHomeHourly: 43, facilityIndex: 1.4381, inHomeIndex: 1.2647, estimated: false },
  { state: 'Virginia', abbr: 'VA', nursingHomeAnnual: 140160, assistedLivingMonthly: 6945, inHomeHourly: 35, facilityIndex: 1.0817, inHomeIndex: 1.0294, estimated: false },
  { state: 'Washington', abbr: 'WA', nursingHomeAnnual: 191628, assistedLivingMonthly: 7600, inHomeHourly: 42, facilityIndex: 1.4789, inHomeIndex: 1.2353, estimated: false },
  { state: 'West Virginia', abbr: 'WV', nursingHomeAnnual: 159144, assistedLivingMonthly: 6340, inHomeHourly: 28.5, facilityIndex: 1.2282, inHomeIndex: 0.8382, estimated: false },
  { state: 'Wisconsin', abbr: 'WI', nursingHomeAnnual: 147828, assistedLivingMonthly: 6540, inHomeHourly: 35, facilityIndex: 1.1409, inHomeIndex: 1.0294, estimated: false },
  { state: 'Wyoming', abbr: 'WY', nursingHomeAnnual: 131076, assistedLivingMonthly: 5325, inHomeHourly: 35.5, facilityIndex: 1.0116, inHomeIndex: 1.0441, estimated: false },
];

const BY_ABBR: Record<string, StateCostOfCare> = Object.fromEntries(
  COST_OF_CARE_BY_STATE.map((row) => [row.abbr, row])
);

/** Look up a state's cost-of-care row by two-letter abbreviation. Falls back to national-median (Texas is NOT the fallback — an unknown code returns a synthetic national row). */
export function getCostOfCare(abbr: string): StateCostOfCare {
  const row = BY_ABBR[abbr?.toUpperCase()];
  if (row) return row;
  return {
    state: 'National (unrecognized state code)',
    abbr: abbr ?? '??',
    nursingHomeAnnual: NATIONAL_NURSING_HOME_ANNUAL,
    assistedLivingMonthly: NATIONAL_ASSISTED_LIVING_MONTHLY,
    inHomeHourly: NATIONAL_IN_HOME_HOURLY,
    facilityIndex: 1,
    inHomeIndex: 1,
    estimated: true,
  };
}
