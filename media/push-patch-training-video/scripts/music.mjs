// Procedural ambient pad (no samples, no licensing): soft sine/triangle chords with slow
// cross-fades, written as a 48 kHz stereo WAV. Level is set in the composition (Music.tsx)
// so it sits ~28 dB under the narration.
//   node scripts/music.mjs [seconds=210]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SR = 48000;
const SECONDS = Number(process.argv[2] ?? 210);
const N = SR * SECONDS;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
// D major colour: Dmaj9 - Bm11 - Gmaj9 - Aadd9/E ... (MIDI notes)
const chords = [
  [38, 50, 57, 61, 64, 66],
  [35, 47, 54, 57, 61, 64],
  [31, 43, 50, 54, 57, 62],
  [33, 45, 52, 57, 59, 64],
];
const CH = 9; // seconds per chord
const XF = 3.5; // crossfade seconds
const L = new Float32Array(N), R = new Float32Array(N);
const tri = (p) => 2 / Math.PI * Math.asin(Math.sin(p));
for (let c = 0; c * CH < SECONDS + CH; c++) {
  const notes = chords[c % chords.length];
  const t0 = c * CH - XF, t1 = (c + 1) * CH + XF;
  const s0 = Math.max(0, Math.floor(t0 * SR)), s1 = Math.min(N, Math.floor(t1 * SR));
  notes.forEach((m, k) => {
    const f = hz(m), det = 1 + (k % 2 ? 0.0012 : -0.0009);
    const amp = (k === 0 ? 0.22 : 0.13) / Math.sqrt(notes.length);
    const pan = 0.5 + 0.35 * Math.sin(k * 1.7);
    for (let i = s0; i < s1; i++) {
      const t = i / SR;
      // raised-cosine envelope over the chord window
      const u = (t - t0) / (t1 - t0);
      const env = Math.sin(Math.PI * Math.min(Math.max(u, 0), 1)) ** 2;
      const lfo = 1 + 0.08 * Math.sin(2 * Math.PI * (0.07 + k * 0.013) * t + k);
      const ph = 2 * Math.PI * f * t;
      const v = amp * env * lfo * (0.8 * Math.sin(ph) + 0.2 * tri(ph * det));
      L[i] += v * (1 - pan) * 2 * 0.5 + v * 0.25;
      R[i] += v * pan * 2 * 0.5 + v * 0.25;
    }
  });
}
// global fade in/out + normalise to -12 dBFS peak
const fade = 4 * SR;
let peak = 0;
for (let i = 0; i < N; i++) {
  const g = Math.min(1, i / fade, (N - i) / fade);
  L[i] *= g; R[i] *= g;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 10 ** (-12 / 20) / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(L[i] * norm * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(R[i] * norm * 32767), 46 + i * 4);
}
mkdirSync(join(ROOT, 'public/audio'), { recursive: true });
writeFileSync(join(ROOT, 'public/audio/music.wav'), buf);
console.log(`music.wav ${SECONDS}s written`);
