// Generate narration audio (Amazon Polly) + caption timing for every scene.
//
//   node scripts/polly.mjs            # all scenes + voice samples
//   node scripts/polly.mjs --force    # re-synthesize even if the mp3 exists
//
// Audio: Polly voice Ruth, engine "generative" (falls back to long-form, then neural).
// Captions: the generative engine does not return speech marks, so we request word +
// sentence marks from the NEURAL engine for the same SSML, then map them onto the
// generative audio. Mapping is anchored at every sentence start and every <break>:
// each anchor is snapped to the matching pause (silence -> speech onset) detected in
// the generative waveform, and words between anchors are scaled linearly.
// Output: public/audio/<id>.mp3 and src/generated/timing.json.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = join(ROOT, 'public/audio');
const TMP = join(ROOT, 'out/.polly');
const REGION = 'us-east-1';
const FORCE = process.argv.includes('--force');
mkdirSync(AUDIO, { recursive: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(join(ROOT, 'src/generated'), { recursive: true });

const narr = JSON.parse(readFileSync(join(ROOT, 'scripts/narration.json'), 'utf8'));

function polly(args) {
  return execFileSync('aws', ['polly', 'synthesize-speech', '--region', REGION, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function synth(ssml, voice, outMp3) {
  for (const engine of ['generative', 'long-form', 'neural']) {
    try {
      polly(['--engine', engine, '--voice-id', voice, '--text-type', 'ssml', '--text', ssml, '--output-format', 'mp3', '--sample-rate', '24000', outMp3]);
      return engine;
    } catch (e) {
      console.warn(`  ${voice}/${engine} failed: ${String(e.stderr || e.message).trim().split('\n').pop()}`);
    }
  }
  throw new Error('all engines failed');
}

function marks(ssml, voice, outJson) {
  polly(['--speech-mark-types', 'word', 'sentence', '--engine', 'neural', '--voice-id', voice, '--text-type', 'ssml', '--text', ssml, '--output-format', 'json', outJson]);
  return readFileSync(outJson, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

// --- waveform analysis -------------------------------------------------------
function envelope(mp3) {
  const wav = join(TMP, 'tmp.wav');
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', mp3, wav]);
  const buf = readFileSync(wav);
  let off = 12, dataOff = -1, dataLen = 0;
  while (off < buf.length - 8) {
    const id = buf.toString('ascii', off, off + 4), len = buf.readUInt32LE(off + 4);
    if (id === 'data') { dataOff = off + 8; dataLen = len; break; }
    off += 8 + len + (len % 2);
  }
  const n = Math.floor(Math.min(dataLen, buf.length - dataOff) / 2);
  const hop = 160; // 10 ms
  const frames = [];
  for (let i = 0; i + hop <= n; i += hop) {
    let s = 0;
    for (let j = 0; j < hop; j++) { const v = buf.readInt16LE(dataOff + 2 * (i + j)) / 32768; s += v * v; }
    frames.push(Math.sqrt(s / hop));
  }
  rmSync(wav);
  return { frames, durationMs: (n / 16000) * 1000 };
}

// silences >= minMs, returned as [startMs, endMs]; plus speech on/off
function analyse(env, minMs = 110) {
  const thr = 0.012; // ~ -38 dBFS: TTS pauses are near digital silence
  const sil = env.frames.map((r) => r < thr);
  const first = sil.indexOf(false), last = sil.lastIndexOf(false);
  const runs = [];
  let i = first;
  while (i <= last) {
    if (sil[i]) { let j = i; while (j <= last && sil[j]) j++; if ((j - i) * 10 >= minMs) runs.push([i * 10, j * 10]); i = j; } else i++;
  }
  return { onMs: first * 10, offMs: (last + 1) * 10, silences: runs };
}

// --- tokens ------------------------------------------------------------------
const REPLACE = [
  ['three and a half milliliters', '3.5 mL'],
  ['one and a half milliliters', '1.5 mL'],
  ['one and a half', '1.5'],
  ['two-milliliter', '2 mL'],
  ['twelve hours', '12 hours'],
  ['seventy-seven degrees', '77°F'],
  ['ten minutes', '10 minutes'],
  ['support at my four M life dot com', 'support@my4mlife.com'],
];
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function tokens(ssml, wordMarks) {
  // mask tags with spaces so offsets stay valid (text is ASCII, so bytes == chars)
  const masked = ssml.replace(/<[^>]*>/g, (m) => ' '.repeat(m.length));
  const words = wordMarks.filter((m) => !m.value.startsWith('<'));
  const out = [];
  for (const m of masked.matchAll(/\S+/g)) {
    const a = m.index, b = a + m[0].length;
    const w = words.find((x) => x.start >= a && x.start < b);
    out.push({ text: m[0], nt: w ? w.time : null, start: a });
  }
  for (let i = 0; i < out.length; i++) if (out[i].nt == null) out[i].nt = i ? out[i - 1].nt : 0;
  // anchor flags: first token, tokens after a <break>, tokens starting a sentence
  const breakEnds = [...ssml.matchAll(/<break[^>]*>/g)].map((m) => m.index + m[0].length);
  for (let i = 0; i < out.length; i++) {
    const prev = i ? out[i - 1] : null;
    out[i].anchor = i === 0 || /[.?!:]$/.test(prev.text) || breakEnds.some((e) => e > prev.start && e <= out[i].start);
  }
  return out;
}

function applyReplacements(toks) {
  const res = [];
  for (let i = 0; i < toks.length; ) {
    let done = false;
    for (const [phrase, rep] of REPLACE) {
      const pw = phrase.split(' ').map(norm);
      if (i + pw.length > toks.length) continue;
      if (pw.every((p, k) => norm(toks[i + k].text) === p)) {
        const lastText = toks[i + pw.length - 1].text;
        const trail = lastText.match(/[^A-Za-z0-9]*$/)[0];
        res.push({ ...toks[i], text: rep + trail });
        i += pw.length; done = true; break;
      }
    }
    if (!done) res.push(toks[i++]);
  }
  return res;
}

// --- alignment ---------------------------------------------------------------
function align(toks, neu, gen) {
  // neural anchor times come straight from word marks; snap each to the generative pause structure
  const anchors = toks.map((t, i) => (t.anchor ? i : -1)).filter((i) => i >= 0);
  const nSpan = neu.offMs - neu.onMs, gSpan = gen.offMs - gen.onMs;
  const gOnsets = gen.silences.map((s) => s[1]);
  const A = []; // {i, n, g, snapped}
  for (const i of anchors) {
    const n = toks[i].nt;
    if (!A.length) { A.push({ i, n, g: gen.onMs, snapped: true }); continue; }
    const p = A[A.length - 1];
    // local estimate: global ratio applied to delta from previous anchor
    const est = p.g + (n - p.n) * (gSpan / nSpan);
    let best = null;
    for (const o of gOnsets) if (o > p.g + 150 && Math.abs(o - est) < 900 && (!best || Math.abs(o - est) < Math.abs(best - est))) best = o;
    A.push({ i, n, g: best ?? est, snapped: best != null, est });
  }
  // phrase end = start of the silence that precedes the next anchor (both engines)
  const silBefore = (sils, t, fallback) => { const s = sils.find((x) => Math.abs(x[1] - t) < 160); return s ? s[0] : fallback; };
  for (let k = 0; k < A.length; k++) {
    const a = A[k], b = A[k + 1];
    const nEnd = b ? silBefore(neu.silences, b.n, b.n) : neu.offMs;
    const gEnd = b ? silBefore(gen.silences, b.g, b.g) : gen.offMs;
    const lastI = b ? b.i : toks.length;
    for (let i = a.i; i < lastI; i++) {
      const r = nEnd > a.n ? (toks[i].nt - a.n) / (nEnd - a.n) : 0;
      toks[i].t = Math.round(a.g + Math.min(Math.max(r, 0), 1) * (gEnd - a.g));
    }
  }
  return { anchors: A.length, snapped: A.filter((a) => a.snapped).length, maxShift: Math.round(Math.max(0, ...A.filter((a) => a.est != null).map((a) => Math.abs(a.g - a.est)))) };
}

function afinfoSeconds(mp3) {
  const o = execFileSync('afinfo', [mp3], { encoding: 'utf8' });
  const m = o.match(/estimated duration:\s*([\d.]+)/);
  return m ? Number(m[1]) : null;
}

// --- run ---------------------------------------------------------------------
const prevPath = join(ROOT, 'src/generated/timing.json');
const prev = existsSync(prevPath) ? JSON.parse(readFileSync(prevPath, 'utf8')) : {};
const timing = {};
const jobs = [...Object.entries(narr.main), ...Object.entries(narr.short)];
for (const [id, body] of jobs) {
  const ssml = `<speak>${body}</speak>`;
  const mp3 = join(AUDIO, `${id}.mp3`);
  const neuralMp3 = join(TMP, `${id}.neural.mp3`);
  let engine = prev[id]?.engine ?? 'unknown';
  if (FORCE || !existsSync(mp3)) engine = synth(ssml, narr.voice, mp3);
  if (FORCE || !existsSync(neuralMp3)) polly(['--engine', 'neural', '--voice-id', narr.voice, '--text-type', 'ssml', '--text', ssml, '--output-format', 'mp3', neuralMp3]);
  const wm = marks(ssml, narr.voice, join(TMP, `${id}.marks.json`));
  const gEnv = envelope(mp3), nEnv = envelope(neuralMp3);
  const gen = analyse(gEnv), neu = analyse(nEnv);
  let toks = tokens(ssml, wm);
  const stats = align(toks, neu, gen);
  toks = applyReplacements(toks);
  const af = afinfoSeconds(mp3);
  timing[id] = {
    engine,
    durationMs: Math.round(gEnv.durationMs),
    afinfoSeconds: af,
    speechEndMs: gen.offMs,
    tokens: toks.map((t) => ({ t: t.t, text: t.text })),
  };
  console.log(`${id.padEnd(12)} engine=${engine.padEnd(10)} dur=${(gEnv.durationMs / 1000).toFixed(2)}s afinfo=${af}s anchors=${stats.anchors} snapped=${stats.snapped} maxShift=${stats.maxShift}ms`);
}
writeFileSync(join(ROOT, 'src/generated/timing.json'), JSON.stringify(timing, null, 1) + '\n');

// voice samples (Ruth vs Matthew) for TJ to compare
const sampleSsml = `<speak>${narr.sample}</speak>`;
for (const [voice, file] of [['Ruth', 'sample-ruth.mp3'], ['Matthew', 'sample-matthew.mp3']]) {
  const out = join(AUDIO, file);
  if (FORCE || !existsSync(out)) console.log(`${file}: engine=${synth(sampleSsml, voice, out)} ${afinfoSeconds(out)}s`);
}
console.log('wrote src/generated/timing.json');
