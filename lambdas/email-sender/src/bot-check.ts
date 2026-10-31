// Same bot test as lead-capture: honeypot (hp) must be empty and the form must take >= 3000ms (t) to fill.
const MIN_FILL_MS = 3000;

export function isBot(f: { hp?: unknown; t?: unknown }): boolean {
  if (typeof f.hp === 'string' && f.hp !== '') return true;
  return typeof f.t !== 'number' || !Number.isFinite(f.t) || f.t < MIN_FILL_MS;
}
