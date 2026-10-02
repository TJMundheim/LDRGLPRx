// Add N business days (Mon–Fri, no holiday calendar) to a date; returns an ISO date (YYYY-MM-DD, UTC).
export function addBusinessDays(from: Date, n: number): string {
  const d = new Date(from.getTime());
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}
