import React from 'react';
import { interpolate } from 'remotion';
import { C } from '../theme';
import { Label, STROKE, Svg, ramp, rampIO, useSceneFrame } from './common';

// Water dropper held tip-down over the amber vial. 100 px == 1 mL inside the body.
// Full mark (~3.5 mL) at y=150, 2 mL mark at y=300, body bottom at y=500.
const X = 330, BW = 92, TOP = 90, BOT = 500, FULL = 150, TWO = 300;

export type DropperEvents = {
  capacityAt?: number; // "holds about 3.5 mL" tag
  needAt?: number; // "you only need 1.5" tag
  linesAt?: number; // draw the full line (and labels)
  line2At?: number; // draw the 2 mL line
  tipOffAt?: number;
  drainFrom?: number;
  drainTo?: number;
  bracketAt?: number;
  restAt?: number;
};

export const Dropper: React.FC<{ w: number; h: number; base: number; ev: DropperEvents }> = ({ w, h, base, ev }) => {
  const f = useSceneFrame(base);
  const big = 1e9;
  const capP = ramp(f, ev.capacityAt ?? big, (ev.capacityAt ?? big) + 18);
  const needP = ramp(f, ev.needAt ?? big, (ev.needAt ?? big) + 18);
  const l1 = ramp(f, ev.linesAt ?? big, (ev.linesAt ?? big) + 16);
  const l2 = ramp(f, ev.line2At ?? big, (ev.line2At ?? big) + 16);
  const tip = rampIO(f, ev.tipOffAt ?? big, (ev.tipOffAt ?? big) + 20);
  const drain = rampIO(f, ev.drainFrom ?? big, ev.drainTo ?? big);
  const br = ramp(f, ev.bracketAt ?? big, (ev.bracketAt ?? big) + 20);
  const rest = ramp(f, ev.restAt ?? big, (ev.restAt ?? big) + 20);
  const level = interpolate(drain, [0, 1], [FULL, TWO]);
  const dripping = f >= (ev.drainFrom ?? big) && f < (ev.drainTo ?? big) + 8;
  const vialFill = 0.08 + 0.28 * drain;

  // falling drops: one every 9 frames while draining
  const drops: React.ReactNode[] = [];
  if (dripping) {
    for (let k = 0; k < 3; k++) {
      const age = ((f - (ev.drainFrom ?? 0)) % 9) + k * 9;
      if (age > 26) continue;
      const y = 596 + (age / 26) ** 1.6 * 74;
      drops.push(<ellipse key={k} cx={X} cy={y} rx={7} ry={10} fill={C.water} opacity={0.9 * (1 - age / 30)} />);
    }
  }

  const markerLine = (y: number, p: number) => (
    <line x1={X - BW / 2 - 6} y1={y} x2={X - BW / 2 - 6 + (BW + 12) * p} y2={y} stroke="#1b1f2a" strokeWidth={11} strokeLinecap="round" opacity={p > 0 ? 1 : 0} />
  );

  return (
    <Svg w={w} h={h}>
      {/* amber vial under the tip, cap off */}
      <g transform={`translate(${X}, 712)`}>
        <rect x={-55} y={-40} width={110} height={110} rx={14} fill={C.amber} {...STROKE} />
        <rect x={-55} y={70 - 110 * vialFill} width={110} height={110 * vialFill} rx={10} fill={C.amberLight} opacity={0.55} />
        <rect x={-32} y={-62} width={64} height={24} rx={5} fill="#5a3a1e" {...STROKE} />
      </g>
      {drops}
      {/* dropper body */}
      <g>
        <rect x={X - BW / 2} y={TOP} width={BW} height={BOT - TOP} rx={40} fill={C.water} fillOpacity={0.08} {...STROKE} />
        {/* liquid (tip-down: water sits at the bottom, surface at `level`) */}
        <clipPath id="body">
          <rect x={X - BW / 2 + 2} y={TOP + 2} width={BW - 4} height={BOT - TOP - 4} rx={38} />
        </clipPath>
        <g clipPath="url(#body)">
          <rect x={X - BW / 2} y={level} width={BW} height={BOT - level + 40} fill={C.water} opacity={0.42 - 0.18 * rest} />
          <line x1={X - BW / 2} y1={level} x2={X + BW / 2} y2={level} stroke={C.white} strokeWidth={3} opacity={0.8} />
        </g>
        {/* faint factory gradations */}
        {[130, 180, 230, 280, 330, 380, 430].map((y) => (
          <line key={y} x1={X - 12} y1={y} x2={X + 12} y2={y} stroke={C.onInk} strokeWidth={2} opacity={0.18} />
        ))}
        {/* neck + tip */}
        <rect x={X - 13} y={BOT} width={26} height={48} fill={C.water} fillOpacity={0.22} {...STROKE} />
        <g transform={`translate(${tip * 70}, ${tip * 60}) rotate(${tip * 25}, ${X}, 570)`} opacity={1 - tip}>
          <rect x={X - 26} y={548} width={52} height={36} rx={6} fill={C.water} fillOpacity={0.25} {...STROKE} />
        </g>
        {markerLine(FULL, l1)}
        {markerLine(TWO, l2)}
      </g>

      {/* labels left of the body */}
      <Label x={X - 90} y={FULL + 10} lines={['Full line']} o={l1} size={32} anchor="end" />
      <Label x={X - 90} y={FULL + 46} lines={['about 3.5 mL']} o={l1} size={24} anchor="end" color={C.muted} weight={500} />
      <Label x={X - 90} y={TWO + 10} lines={['2 mL line']} o={l2} size={32} anchor="end" />

      {/* capacity tags (before the lines are drawn) */}
      <g opacity={capP * (1 - l1)}>
        <Label x={X + 90} y={FULL + 10} lines={['Holds about 3.5 mL']} size={32} anchor="start" />
      </g>
      <g opacity={needP * (1 - l1)}>
        <Label x={X + 90} y={FULL + 64} lines={['You need 1.5 mL']} size={32} anchor="start" color={C.accent} />
      </g>

      {/* bracket: full -> 2 mL = 1.5 mL */}
      <g opacity={br}>
        <path d={`M ${X + 70} ${FULL} h 22 V ${TWO} h -22`} fill="none" stroke={C.accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Label x={X + 118} y={(FULL + TWO) / 2 + 16} lines={['= 1.5 mL']} size={46} anchor="start" color={C.accent} weight={800} />
        <Label x={X + 118} y={(FULL + TWO) / 2 + 58} lines={['into the vial']} size={26} anchor="start" color={C.muted} weight={500} />
      </g>
      <g opacity={rest}>
        <Label x={X + 90} y={(TWO + BOT) / 2 + 12} lines={["Rest isn't used"]} size={30} anchor="start" color={C.muted} />
      </g>
    </Svg>
  );
};
