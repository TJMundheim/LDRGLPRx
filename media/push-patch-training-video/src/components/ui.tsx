import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, easeOut } from '../theme';
import { Layout, Rect, useLayout } from '../layout';

export const fadeUp = (frame: number, start: number, dur = 18, dist = 26) => {
  const p = interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut });
  return { opacity: p, transform: `translateY(${(1 - p) * dist}px)` };
};

export const Background: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 30% 0%, #16223b 0%, ${C.ink} 62%)` }} />
);

export const Wordmark: React.FC<{ size: number; color?: string; style?: React.CSSProperties }> = ({ size, color = C.onInk, style }) => (
  <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: size, letterSpacing: '-0.01em', color, ...style }}>
    My<b style={{ color: C.accent, fontWeight: 800 }}>4M</b>Life
  </span>
);

/** whole-scene dip: fades content in and out so cuts feel calm */
export const SceneFade: React.FC<{ dur: number; children: React.ReactNode; inF?: number; outF?: number }> = ({ dur, children, inF = 10, outF = 8 }) => {
  const f = useCurrentFrame();
  const o = Math.min(
    interpolate(f, [0, inF], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    interpolate(f, [dur - outF, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const PanelFrame: React.FC<{ r: Rect; children: React.ReactNode; start?: number }> = ({ r, children, start = 0 }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [start, start + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut });
  return (
    <div
      style={{
        position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: 30, overflow: 'hidden',
        background: C.ink2, border: `1px solid ${C.inkLine}`, boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
        opacity: p, transform: `scale(${0.985 + 0.015 * p})`,
      }}
    >
      {children}
    </div>
  );
};

export type Segment = { from: number; render: (w: number, h: number, dur: number) => React.ReactNode };

/** sequential media inside the panel, cross-dissolving between segments */
export const MediaTrack: React.FC<{ segments: Segment[]; total: number; w: number; h: number; xf?: number }> = ({ segments, total, w, h, xf = 9 }) => {
  const segs = [...segments].sort((a, b) => a.from - b.from);
  return (
    <>
      {segs.map((s, i) => {
        const to = i + 1 < segs.length ? segs[i + 1].from : total;
        const dur = Math.max(1, to - s.from + (i + 1 < segs.length ? xf : 0));
        return (
          <Sequence key={i} from={s.from} durationInFrames={dur} layout="none">
            <XFade first={i === 0} xf={xf}>{s.render(w, h, dur)}</XFade>
          </Sequence>
        );
      })}
    </>
  );
};

const XFade: React.FC<{ first: boolean; xf: number; children: React.ReactNode }> = ({ first, xf, children }) => {
  const f = useCurrentFrame();
  const o = first ? 1 : interpolate(f, [0, xf], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <div style={{ position: 'absolute', inset: 0, opacity: o }}>{children}</div>;
};

export const Progress: React.FC<{ step: number; L: Layout; start?: number }> = ({ step, L, start = 6 }) => {
  const f = useCurrentFrame();
  const st = fadeUp(f, start, 18, 12);
  const segW = (L.progress.w - 4 * 12) / 5;
  return (
    <div style={{ position: 'absolute', left: L.progress.x, top: L.progress.y, width: L.progress.w, ...st }}>
      <div style={{ fontFamily: FONT, fontSize: L.portrait ? 24 : 22, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted, marginBottom: 12, textAlign: L.progress.align }}>
        Step {step} of 5
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ width: segW, height: 6, borderRadius: 3, background: i < step ? 'rgba(230,237,247,0.55)' : i === step ? C.accent : C.inkLine }} />
        ))}
      </div>
    </div>
  );
};

export const Bug: React.FC<{ L: Layout }> = ({ L }) => (
  <div style={{ position: 'absolute', top: L.bug.y - 16, left: L.bug.align === 'center' ? 0 : undefined, right: L.bug.align === 'right' ? L.W - L.bug.x : undefined, width: L.bug.align === 'center' ? L.W : undefined, textAlign: L.bug.align, opacity: 0.75 }}>
    <Wordmark size={L.portrait ? 30 : 26} />
  </div>
);

export const TextBlock: React.FC<{
  kicker?: string;
  headline: React.ReactNode;
  sub?: React.ReactNode;
  start?: number;
  extra?: React.ReactNode;
}> = ({ kicker, headline, sub, start = 8, extra }) => {
  const L = useLayout();
  const f = useCurrentFrame();
  const r = L.text;
  return (
    <div
      style={{
        position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, display: 'flex', flexDirection: 'column',
        justifyContent: L.portrait ? 'flex-start' : 'center', alignItems: L.portrait ? 'center' : 'flex-start', textAlign: L.portrait ? 'center' : 'left', fontFamily: FONT,
      }}
    >
      {kicker && (
        <div style={{ fontSize: L.kicker, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.accent, marginBottom: L.portrait ? 18 : 26, ...fadeUp(f, start) }}>{kicker}</div>
      )}
      <div style={{ fontSize: L.headline, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: C.white, textWrap: 'balance', ...fadeUp(f, start + 6) } as React.CSSProperties}>{headline}</div>
      {sub && (
        <div style={{ fontSize: L.sub, fontWeight: 500, lineHeight: 1.35, color: C.muted, marginTop: L.portrait ? 18 : 28, textWrap: 'balance', ...fadeUp(f, start + 14) } as React.CSSProperties}>{sub}</div>
      )}
      {extra}
    </div>
  );
};

export const Hi: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ color: C.accent }}>{children}</span>;
