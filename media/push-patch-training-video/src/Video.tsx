import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig } from 'remotion';
import { FPS } from './theme';
import { useLayout } from './layout';
import { LEAD, chunks } from './timing';
import { Background, SceneFade } from './components/ui';
import { Captions, Cue, Band } from './components/Captions';

export type Scene = {
  id: string;
  dur: number; // frames
  audio?: string; // narration id (public/audio/<id>.mp3), starts at LEAD
  el: React.ReactNode;
  captions?: boolean; // default: true when audio is set
  fadeIn?: number;
  fadeOut?: number;
};

export const totalFrames = (scenes: Scene[]) => scenes.reduce((a, s) => a + s.dur, 0);

const starts = (scenes: Scene[]) => {
  let t = 0;
  return scenes.map((s) => { const st = t; t += s.dur; return st; });
};

export const Video: React.FC<{ scenes: Scene[] }> = ({ scenes }) => {
  const L = useLayout();
  const { durationInFrames } = useVideoConfig();
  const st = starts(scenes);
  const cues: Cue[] = [];
  const bands: Band[] = [];
  const voice: [number, number][] = [];
  scenes.forEach((s, i) => {
    if (!s.audio) return;
    const a0 = st[i] + LEAD;
    voice.push([a0, a0]);
    const cs = chunks(s.audio, L.captionMaxChars);
    voice[voice.length - 1][1] = a0 + Math.round((cs[cs.length - 1].endMs / 1000) * FPS);
    if (s.captions === false) return;
    bands.push({ from: st[i], to: st[i] + s.dur });
    for (const c of cs) cues.push({ from: a0 + Math.round((c.startMs / 1000) * FPS), to: a0 + Math.round((c.endMs / 1000) * FPS), text: c.text });
  });
  // music: ~28 dB under the voice while narration plays, a little up between, faded at both ends
  const musicVol = (f: number) => {
    let duck = 0;
    for (const [a, b] of voice) duck = Math.max(duck, Math.min(interpolate(f, [a - 12, a], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), interpolate(f, [b, b + 18], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
    const base = 0.11 - 0.065 * duck;
    const env = Math.min(interpolate(f, [0, 30], [0, 1], { extrapolateRight: 'clamp' }), interpolate(f, [durationInFrames - 60, durationInFrames - 2], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
    return base * env;
  };
  return (
    <AbsoluteFill style={{ backgroundColor: '#0b1220' }}>
      <Background />
      {scenes.map((s, i) => (
        <Sequence key={s.id} from={st[i]} durationInFrames={s.dur} name={s.id}>
          <SceneFade dur={s.dur} inF={s.fadeIn} outF={s.fadeOut}>{s.el}</SceneFade>
          {s.audio && (
            <Sequence from={LEAD} name={`${s.id} voice`} layout="none">
              <Audio src={staticFile(`audio/${s.audio}.mp3`)} />
            </Sequence>
          )}
        </Sequence>
      ))}
      <Captions cues={cues} bands={bands} />
      <Audio src={staticFile('audio/music.wav')} volume={musicVol} />
    </AbsoluteFill>
  );
};
