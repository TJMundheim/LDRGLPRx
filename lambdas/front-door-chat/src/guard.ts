// Post-processes every model reply before it reaches a browser.
// Three jobs: strip links that are not on the allowlist, hard-fail the reply if
// it contains anything forbidden, and report which exit (if any) it offered.
import allowlist from './allowlist.json';
import { ASSESSMENT_PATH, CONSULT_PATH, SAFE_FALLBACK } from './config';

const ALLOWED_PATHS = new Set<string>(allowlist.paths);
const SITE = 'https://my4mlife.com';

export type Exit = 'assessment' | 'consult' | null;
export interface Link { label: string; url: string }
export interface GuardResult { reply: string; links: Link[]; exit: Exit; blocked: boolean }

// Absolute my4mlife URLs, bare paths, and any other scheme'd URL.
const URL_RE = /\bhttps?:\/\/[^\s<>()\[\]"']+|(?<![\w/])\/[a-z0-9][a-z0-9/-]*/gi;

/** Only $249 exists in the approved lane text; any other dollar figure is invented. */
const PRICE_RE = /\$\s?(?!249\b)\d[\d,]*/;

const FORBIDDEN: Array<[RegExp, string]> = [
  [/bpc[\s-]?157/i, 'rx-formula'],
  [/l-?glutamine|aloe\s+vera/i, 'rx-formula'],
  [/\b(physician|medical doctor|m\.?d\.?)\b[^.]{0,30}\b(dr\.?\s*tj|mundheim)\b/i, 'credential'],
  [/\b(dr\.?\s*tj|mundheim)\b[^.]{0,30}\b(is|as)\s+(a\s+)?(physician|medical doctor|md)\b/i, 'credential'],
  [/\b(i|we)\s+(can\s+)?(prescribe|diagnose)\b/i, 'scope'],
  [/\b(cures?|will treat|guaranteed)\b/i, 'claim'],
  [PRICE_RE, 'price'],
];

function normalise(raw: string): string | null {
  const path = raw.startsWith('http')
    ? (() => { try { const u = new URL(raw); return allowlist.origins.includes(u.origin) ? u.pathname : null; } catch { return null; } })()
    : raw;
  if (!path) return null;
  const clean = path.length > 1 ? path.replace(/[.,;:)]+$/, '').replace(/\/$/, '') || '/' : path;
  return ALLOWED_PATHS.has(clean) ? clean : null;
}

function labelFor(path: string): string {
  if (path === ASSESSMENT_PATH) return 'Take the MindSpan assessment';
  if (path === CONSULT_PATH) return 'Book the free care coordinator call';
  if (path === '/') return 'my4mlife.com';
  const last = path.split('/').filter(Boolean).pop() ?? '';
  return `Read: ${last.replace(/-/g, ' ')}`;
}

/** Returns the sanitised reply plus the single allowed link and the exit it implies. */
export function guard(raw: string): GuardResult {
  const text = raw.trim();

  for (const [re] of FORBIDDEN) {
    if (re.test(text)) {
      return { reply: SAFE_FALLBACK, links: [consultLink()], exit: 'consult', blocked: true };
    }
  }

  let kept: string | null = null;
  const stripped = text.replace(URL_RE, (match) => {
    const path = normalise(match);
    if (!path) return '';            // not on the allowlist — remove it entirely
    if (kept === null) kept = path;  // keep only the first allowed link
    return '';                       // the link is surfaced as a button, not inline
  });

  const reply = stripped.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+([.,;:])/g, '$1').replace(/\(\s*\)/g, '').trim();

  if (!reply) return { reply: SAFE_FALLBACK, links: [consultLink()], exit: 'consult', blocked: true };

  const path: string | null = kept;
  if (!path) return { reply, links: [], exit: null, blocked: false };

  const exit: Exit = path === ASSESSMENT_PATH ? 'assessment' : path === CONSULT_PATH ? 'consult' : null;
  return { reply, links: [{ label: labelFor(path), url: `${SITE}${path === '/' ? '' : path}` }], exit, blocked: false };
}

function consultLink(): Link {
  return { label: labelFor(CONSULT_PATH), url: `${SITE}${CONSULT_PATH}` };
}
