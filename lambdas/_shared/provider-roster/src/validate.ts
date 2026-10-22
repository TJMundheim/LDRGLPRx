import type { Provider } from './types';

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Parse + validate the /my4mlife/providers value. Throws a descriptive Error on any problem. */
export function validateRoster(json: unknown): Provider[] {
  let data = json;
  if (typeof json === 'string') {
    try { data = JSON.parse(json); } catch { throw new Error('provider roster is not valid JSON'); }
  }
  const list = (data as { providers?: unknown } | null)?.providers;
  if (!Array.isArray(list) || list.length === 0) throw new Error('provider roster needs a non-empty "providers" array');
  const seen = new Set<string>();
  const out = list.map((raw: Record<string, unknown>, i: number): Provider => {
    const id = text(raw?.id);
    const name = text(raw?.name);
    if (!id) throw new Error(`provider #${i + 1} has an empty id`);
    if (!name) throw new Error(`provider "${id}" has an empty name`);
    if (seen.has(id)) throw new Error(`provider ids must be unique ("${id}" repeats)`);
    seen.add(id);
    return { id, name, credentials: text(raw.credentials), inbox: text(raw.inbox), default: raw.default === true };
  });
  if (out.filter((p) => p.default).length !== 1) throw new Error('provider roster needs exactly one default provider');
  return out;
}
