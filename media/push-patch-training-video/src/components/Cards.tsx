import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, easeOut } from '../theme';
import { useLayout } from '../layout';
import { Wordmark, fadeUp } from './ui';

const STEPS = ['Mix your blend', 'Load the patch', 'Prepare your skin', 'Apply and seal', 'Wear for 12 hours'];
export const TAGLINE = "Don't lose your identity and your dignity while you still have a choice.";

export const TitleCard: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => {
  const L = useLayout();
  const f = useCurrentFrame();
  const wm = interpolate(f, [4, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT, textAlign: 'center', padding: L.portrait ? '0 80px' : '0 200px' }}>
      <div style={{ opacity: wm, filter: `blur(${(1 - wm) * 10}px)`, letterSpacing: `${(1 - wm) * 0.2}em`, marginBottom: L.portrait ? 70 : 56 }}>
        <Wordmark size={L.portrait ? 64 : 56} />
      </div>
      <div style={{ width: 120, height: 3, background: C.accent, borderRadius: 2, marginBottom: L.portrait ? 64 : 52, transform: `scaleX(${interpolate(f, [16, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut })})` }} />
      <div style={{ fontSize: L.portrait ? 96 : 104, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.025em', color: C.white, textWrap: 'balance', maxWidth: L.portrait ? 900 : 1400, ...fadeUp(f, 22, 24, 30) } as React.CSSProperties}>{title}</div>
      {sub && <div style={{ marginTop: L.portrait ? 48 : 40, fontSize: L.portrait ? 44 : 42, fontWeight: 500, color: C.accent, ...fadeUp(f, 36, 24, 20) }}>{sub}</div>}
    </AbsoluteFill>
  );
};

export const StepCard: React.FC<{ step: number }> = ({ step }) => {
  const L = useLayout();
  const f = useCurrentFrame();
  const segW = L.portrait ? 150 : 120;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT, textAlign: 'center' }}>
      <div style={{ fontSize: L.portrait ? 40 : 36, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent, ...fadeUp(f, 2, 18, 14) }}>Step {step} of 5</div>
      <div style={{ marginTop: 30, fontSize: L.portrait ? 104 : 116, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.04, color: C.white, maxWidth: L.portrait ? 940 : 1500, textWrap: 'balance', ...fadeUp(f, 8, 22, 26) } as React.CSSProperties}>{STEPS[step - 1]}</div>
      <div style={{ display: 'flex', gap: 14, marginTop: L.portrait ? 80 : 64 }}>
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = i < step ? 1 : i === step ? interpolate(f, [14, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut }) : 0;
          return (
            <div key={i} style={{ width: segW, height: 8, borderRadius: 4, background: C.inkLine, overflow: 'hidden' }}>
              <div style={{ width: `${fill * 100}%`, height: '100%', background: i === step ? C.accent : 'rgba(230,237,247,0.55)' }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const EndCard: React.FC<{ reorder?: boolean; start?: number }> = ({ reorder = true, start = 0 }) => {
  const L = useLayout();
  const f = useCurrentFrame() - start;
  const P = L.portrait;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT, textAlign: 'center', padding: P ? '0 70px' : '0 160px' }}>
      <div style={fadeUp(f, 0, 22, 16)}><Wordmark size={P ? 88 : 84} /></div>
      <div style={{ marginTop: P ? 70 : 54, fontSize: P ? 52 : 50, fontWeight: 700, color: C.white, ...fadeUp(f, 10) }}>Questions? We&apos;re here.</div>
      <div style={{ marginTop: P ? 30 : 22, fontSize: P ? 60 : 58, fontWeight: 800, color: C.accent, letterSpacing: '-0.01em', ...fadeUp(f, 18) }}>support@my4mlife.com</div>
      <div style={{ marginTop: P ? 22 : 16, fontSize: P ? 40 : 38, fontWeight: 500, color: C.onInk, ...fadeUp(f, 24) }}>my4mlife.com</div>
      {reorder && (
        <div style={{ marginTop: P ? 34 : 26, fontSize: P ? 32 : 30, fontWeight: 500, color: C.muted, ...fadeUp(f, 30) }}>Reorder in one click from the link in your email.</div>
      )}
      <div style={{ width: 120, height: 2, background: C.inkLine, margin: P ? '70px 0 56px' : '54px 0 44px', opacity: fadeUp(f, 34).opacity }} />
      <div style={{ fontSize: P ? 38 : 36, fontStyle: 'italic', fontWeight: 400, color: C.ivory, maxWidth: P ? 880 : 1200, lineHeight: 1.35, textWrap: 'balance', ...fadeUp(f, 42) } as React.CSSProperties}>{TAGLINE}</div>
    </AbsoluteFill>
  );
};
