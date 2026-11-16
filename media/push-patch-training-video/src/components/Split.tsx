import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, FONT } from '../theme';
import { useLayout } from '../layout';
import { Bug, MediaTrack, PanelFrame, Progress, Segment, TextBlock, fadeUp } from './ui';

/** Standard narrated scene: text column + media panel + step progress. Re-lays out for 9:16. */
export const Split: React.FC<{
  dur: number;
  step?: number;
  kicker?: string;
  headline: React.ReactNode;
  sub?: React.ReactNode;
  segments: Segment[];
  extra?: React.ReactNode;
}> = ({ dur, step, kicker, headline, sub, segments, extra }) => {
  const L = useLayout();
  return (
    <>
      <TextBlock kicker={kicker} headline={headline} sub={sub} extra={extra} />
      <PanelFrame r={L.panel}>
        <MediaTrack segments={segments} total={dur} w={L.panel.w} h={L.panel.h} />
      </PanelFrame>
      {step ? <Progress step={step} L={L} /> : null}
      <Bug L={L} />
    </>
  );
};

/** small row of pills that light up in sequence (e.g. alcohol pad -> roller -> skin-prep wipe) */
export const Pills: React.FC<{ items: string[]; at: number[] }> = ({ items, at }) => {
  const L = useLayout();
  const f = useCurrentFrame();
  const active = at.reduce((acc, a, i) => (f >= a ? i : acc), -1);
  return (
    <div style={{ display: 'flex', gap: 14, marginTop: L.portrait ? 26 : 40, flexWrap: 'wrap', justifyContent: L.portrait ? 'center' : 'flex-start', ...fadeUp(f, 20) }}>
      {items.map((it, i) => (
        <div
          key={it}
          style={{
            fontFamily: FONT, fontSize: L.portrait ? 30 : 28, fontWeight: 600, padding: '10px 22px', borderRadius: 40,
            border: `2px solid ${i === active ? C.accent : C.inkLine}`, color: i === active ? C.ink : i < active ? C.onInk : C.muted,
            background: i === active ? C.accent : 'transparent',
          }}
        >
          {i + 1}. {it}
        </div>
      ))}
    </div>
  );
};
