// Post-processes every model reply before it reaches a browser.
// Three jobs: strip links that are not on the allowlist, hard-fail the reply if
// it contains anything forbidden, and report which exit (if any) it offered.
import allowlist from './allowlist.json';
import { ASSESSMENT_PATH, CONSULT_PATH, SAFE_FALLBACK } from './config';

const ALLOWED_PATHS = new Set<string>(allowlist.paths);
const SITE = 'https://my4mlife.com';

export type Exit = 'assessment' | 'consult' | null;
export interface Link { label: string; url: string }
export interface GuardResult { reply: string; links: Link[]; exit: Exit; blocked: boolean; blockedBy?: string }

// Absolute my4mlife URLs, bare paths, and any other scheme'd URL.
const URL_RE = /\bhttps?:\/\/[^\s<>()\[\]"']+|(?<![\w/])\/[a-z0-9][a-z0-9/-]*/gi;

/** Only $249 (live visits) and $125 (Biome NS Rx, 30-day) are published; any other figure is invented. */
const PRICE_RE = /\$\s?(?!249\b|125\b)\d[\d,]*/;

const FORBIDDEN: Array<[RegExp, string]> = [
  [/bpc[\s-]?157/i, 'rx-formula'],
  [/l-?glutamine|aloe\s+vera/i, 'rx-formula'],
  [/\b(physician|medical doctor|m\.?d\.?)\b[^.]{0,30}\b(dr\.?\s*tj|mundheim)\b/i, 'credential'],
  [/\b(dr\.?\s*tj|mundheim)\b[^.]{0,30}\b(is|as)\s+(a\s+)?(physician|medical doctor|md)\b/i, 'credential'],
  [/\bboard[- ]certified\b/i, 'credential'],
  [/\b(i|we)\s+(can\s+)?(prescribe|diagnose)\b/i, 'scope'],
  [/\b(cures?|will treat|guaranteed)\b/i, 'claim'],
  [PRICE_RE, 'price'],
  [/\b(in|into|through) (your|their|his|her|my) (early |mid-?|late )?(twenties|thirties|forties|fifties|sixties|seventies|eighties|[2-8]0s)\b|\b(twenty|thirty|forty|fifty|sixty|seventy)-?something\b/i, 'age'],
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

  for (const [re, label] of FORBIDDEN) {
    if (re.test(text)) {
      return { reply: SAFE_FALLBACK, links: [consultLink()], exit: 'consult', blocked: true, blockedBy: label };
    }
  }

  let page: string | null = null;   // first allowed non-exit page
  let door: string | null = null;   // first exit (/assessment or /consult)
  const stripped = text.replace(URL_RE, (match) => {
    const path = normalise(match);
    if (!path) return '';            // not on the allowlist — remove it entirely
    const isExit = path === ASSESSMENT_PATH || path === CONSULT_PATH;
    if (isExit && door === null) door = path;
    if (!isExit && page === null) page = path;
    return '';                       // links are surfaced as buttons, not inline
  });

  const reply = stripped.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+([.,;:])/g, '$1').replace(/\(\s*\)/g, '')
    .replace(/\s+(at|here|via|visit|see)[:]?\s*(?=[.!?]|$)/gim, '').replace(/\n[ \t]*[.:]\s*$/g, '').trim();

  if (!reply) return { reply: SAFE_FALLBACK, links: [consultLink()], exit: 'consult', blocked: true, blockedBy: 'empty' };

  // Every answer leaves through one of the two doors; the assessment is the default.
  const exitPath: string = door ?? ASSESSMENT_PATH;
  const exit: Exit = exitPath === CONSULT_PATH ? 'consult' : 'assessment';
  const toLink = (path: string): Link => ({ label: labelFor(path), url: `${SITE}${path === '/' ? '' : path}` });
  const pagePath: string | null = page;
  const links = pagePath ? [toLink(pagePath), toLink(exitPath)] : [toLink(exitPath)];
  return { reply, links, exit, blocked: false };
}

function consultLink(): Link {
  return { label: labelFor(CONSULT_PATH), url: `${SITE}${CONSULT_PATH}` };
}
