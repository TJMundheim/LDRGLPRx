import { describe, it, expect } from 'vitest';
import { addBusinessDays } from './business-days';

// Mon–Fri only; no holiday calendar. Returns an ISO date (YYYY-MM-DD, UTC).
describe('addBusinessDays', () => {
  it.each([
    ['2026-10-05T12:00:00Z', 10, '2026-10-19'], // Mon + 10 bd = Mon two weeks on
    ['2026-10-02T12:00:00Z', 10, '2026-10-16'], // Fri + 10 bd (spans two weekends' worth of skipping)
    ['2026-10-02T12:00:00Z', 1, '2026-10-05'],  // Fri + 1 bd = Mon (skips the weekend)
    ['2026-10-03T12:00:00Z', 1, '2026-10-05'],  // Sat + 1 bd = Mon
    ['2026-10-04T12:00:00Z', 1, '2026-10-05'],  // Sun + 1 bd = Mon
    ['2026-10-03T12:00:00Z', 10, '2026-10-16'], // Sat + 10 bd
    ['2026-10-07T12:00:00Z', 5, '2026-10-14'],  // Wed + 5 bd = next Wed
    ['2026-10-07T12:00:00Z', 0, '2026-10-07'],  // zero stays put
    ['2026-12-30T12:00:00Z', 3, '2027-01-04'],  // crosses a year boundary (Wed→Mon)
  ])('%s + %d business days = %s', (start, n, expected) => {
    expect(addBusinessDays(new Date(start), n)).toBe(expected);
  });

  it('result never lands on a weekend for n >= 1', () => {
    for (let d = 0; d < 14; d++) {
      const start = new Date(Date.UTC(2026, 9, 1 + d, 12));
      const day = new Date(addBusinessDays(start, 10) + 'T12:00:00Z').getUTCDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
  });
});
