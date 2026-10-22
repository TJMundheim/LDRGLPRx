import { asList, type ContactItem } from './segments';

export const HEADER = 'email,firstName,lastName,phone,lifecycleStage,sources,tags,lifetimeValueUSD,createdAt';

function cell(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@]/.test(s) && !/^\+?[\d\s()-]+$/.test(s)) s = `'${s}`; // spreadsheet formula injection guard (phones/negatives pass)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(items: ContactItem[]): string {
  const rows = items.map((i) => [
    i.email, i.firstName, i.lastName, i.phone, i.lifecycleStage,
    asList(i.sources).join(';'), asList(i.tags).join(';'), i.lifetimeValueUSD, i.createdAt,
  ].map(cell).join(','));
  return [HEADER, ...rows].join('\r\n') + '\r\n';
}
