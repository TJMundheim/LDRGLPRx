import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C, FONT } from '../theme';
import { useLayout } from '../layout';

export type Cue = { from: number; to: number; text: string };
export type Band = { from: number; to: number };

/** Burned-in captions in a dark band at the TOP of the frame (never over the hands). */
export const Captions: React.FC<{ cues: Cue[]; bands: Band[] }> = ({ cues, bands }) => {
  const L = useLayout();
  const f = useCurrentFrame();
  const band = bands.find((b) => f >= b.from && f < b.to);
  if (!band) return null;
  const bo = Math.min(
    interpolate(f, [band.from, band.from + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    interpolate(f, [band.to - 8, band.to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );
  const cue = cues.find((c) => f >= c.from && f < c.to);
  const co = cue
    ? Math.min(
        interpolate(f, [cue.from, cue.from + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        interpolate(f, [cue.to - 4, cue.to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      )
    : 0;
  const r = L.captionBand;
  return (
    <div style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, opacity: bo }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,9,18,0.96) 0%, rgba(7,12,23,0.9) 100%)', borderBottom: `1px solid ${C.inkLine}` }} />
      <div
        style={{
          position: 'absolute', left: (r.w - (L.portrait ? 960 : 1640)) / 2, width: L.portrait ? 960 : 1640,
          top: L.portrait ? 70 : 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {cue && (
          <div
            style={{
              fontFamily: FONT, fontSize: L.captionSize, fontWeight: 500, lineHeight: 1.26, color: C.ivory, textAlign: 'center',
              textWrap: 'balance', opacity: co,
            } as React.CSSProperties}
          >
            {cue.text.split(' ').map((w, i) => (
              <React.Fragment key={i}>
                {i ? ' ' : ''}
                <span style={{ whiteSpace: 'nowrap' }}>{w}</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
