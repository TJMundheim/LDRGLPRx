import React from 'react';
import { OffthreadVideo, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { FPS } from '../theme';

// Source clips are 540x960 portrait phone video with burned-in captions at y~785-855 and,
// in some shots, TJ's face at the top. Every clip declares a SAFE rectangle (source px):
// the crop never shows anything outside it, whatever the panel aspect.
export const SRC_W = 540;
export const SRC_H = 960;
export const CAPTION_TOP = 772; // keep everything above the burned-in captions

export type ClipSpec = {
  file: string; // public/clips/<file>.mp4
  at: number; // seconds into the clip file
  safe: [number, number, number, number]; // x0, y0, x1, y1 in source px
  focus?: [number, number]; // preferred centre, source px
  zoom?: number; // >= 1, extra zoom over the minimum cover-in-safe-area scale
  drift?: [number, number]; // slow pan in source px over the shot
  rate?: number; // playback rate (0.85 = gently slowed)
};

export const Clip: React.FC<{ spec: ClipSpec; w: number; h: number; durationInFrames: number }> = ({ spec, w, h, durationInFrames }) => {
  const frame = useCurrentFrame();
  const [x0, y0, x1, y1] = spec.safe;
  const rate = spec.rate ?? 0.85;
  const p = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sMin = Math.max(w / (x1 - x0), h / (y1 - y0));
  const s = sMin * (spec.zoom ?? 1) * (1 + 0.045 * p); // slow push-in
  const vw = w / s, vh = h / s;
  const [fx, fy] = spec.focus ?? [(x0 + x1) / 2, (y0 + y1) / 2];
  const [dx, dy] = spec.drift ?? [0, 0];
  const cx = Math.min(Math.max(fx + dx * (p - 0.5), x0 + vw / 2), x1 - vw / 2);
  const cy = Math.min(Math.max(fy + dy * (p - 0.5), y0 + vh / 2), y1 - vh / 2);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000' }}>
      <OffthreadVideo
        src={staticFile(`clips/${spec.file}.mp4`)}
        trimBefore={Math.round(spec.at * FPS)}
        playbackRate={rate}
        muted
        style={{
          position: 'absolute',
          width: SRC_W * s,
          height: SRC_H * s,
          left: w / 2 - cx * s,
          top: h / 2 - cy * s,
          maxWidth: 'none',
          filter: 'contrast(1.07) saturate(0.94) sepia(0.07) brightness(1.02)',
        }}
      />
      {/* soft vignette + slight cool lift in the shadows to sit on the ink palette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 95% at 50% 45%, rgba(0,0,0,0) 55%, rgba(7,12,23,0.55) 100%)' }} />
    </div>
  );
};
