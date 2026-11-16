import raw from './generated/timing.json';
import { FPS } from './theme';

export type Tok = { t: number; text: string };
type Entry = { engine: string; durationMs: number; speechEndMs: number; tokens: Tok[] };
const T = raw as unknown as Record<string, Entry>;

export const LEAD = 12; // frames of silence before narration starts in a scene

export const audio = (id: string): Entry => {
  const e = T[id];
  if (!e) throw new Error(`no timing for ${id} (run: pnpm audio)`);
  return e;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** seconds into the narration where `phrase` starts (nth occurrence). */
export const wordSec = (id: string, phrase: string, nth = 0): number => {
  const toks = audio(id).tokens;
  const target = norm(phrase);
  let seen = 0;
  for (let i = 0; i < toks.length; i++) {
    let acc = '';
    for (let k = i; k < toks.length && acc.length < target.length; k++) acc += norm(toks[k].text);
    if (acc === target) {
      if (seen === nth) return toks[i].t / 1000;
      seen++;
    }
  }
  throw new Error(`phrase "${phrase}" not found in ${id}`);
};

/** scene-relative frame for a word (includes the scene lead-in). */
export const wf = (id: string, phrase: string, nth = 0) => LEAD + Math.round(wordSec(id, phrase, nth) * FPS);

export const sceneLen = (id: string, tailSec = 0.7) => LEAD + Math.ceil((audio(id).durationMs / 1000) * FPS) + Math.round(tailSec * FPS);

export type Chunk = { startMs: number; endMs: number; text: string };

/** split narration into caption chunks of at most maxChars (two lines), breaking at sentence ends,
 *  then at commas/colons, then at word boundaries. */
export const chunks = (id: string, maxChars: number): Chunk[] => {
  const e = audio(id);
  const toks = e.tokens;
  const groups: Tok[][] = [];
  let cur: Tok[] = [];
  const len = (g: Tok[]) => g.map((t) => t.text).join(' ').length;
  const sentenceEnd = (t: Tok) => /[.?!]$/.test(t.text);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (cur.length && len([...cur, t]) > maxChars) {
      // backtrack to the last comma/colon in cur if it leaves a reasonable chunk
      let cut = -1;
      for (let k = cur.length - 1; k > 0; k--) if (/[,:;]$/.test(cur[k].text) && len(cur.slice(0, k + 1)) > maxChars * 0.2) { cut = k; break; }
      if (cut >= 0) { groups.push(cur.slice(0, cut + 1)); cur = cur.slice(cut + 1); } else { groups.push(cur); cur = []; }
    }
    cur.push(t);
    if (sentenceEnd(t)) {
      // merge very short sentences ("We're here.") with the next one when they fit together
      const next = toks.slice(i + 1);
      const nextSentence: Tok[] = [];
      for (const n of next) { nextSentence.push(n); if (sentenceEnd(n)) break; }
      if (len(cur) < 16 && nextSentence.length && len([...cur, ...nextSentence]) <= maxChars * 0.75) continue;
      groups.push(cur); cur = [];
    }
  }
  if (cur.length) groups.push(cur);
  return groups.map((g, i) => {
    const startMs = Math.max(0, g[0].t - 60);
    const last = g[g.length - 1];
    const nextStart = i + 1 < groups.length ? groups[i + 1][0].t - 60 : e.speechEndMs + 500;
    const endMs = Math.min(nextStart, Math.max(last.t + 700 + 55 * last.text.length, startMs + 900));
    return { startMs, endMs: i + 1 < groups.length ? endMs : Math.max(endMs, e.speechEndMs + 300), text: g.map((t) => t.text).join(' ') };
  });
};
