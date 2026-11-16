import React from 'react';
import { C } from '../theme';
import { Label, STROKE, Svg, ramp, rampIO, useSceneFrame } from './common';
import { PatchShape, VialIcon } from './Kit';

const big = 1e9;

/* ---------- Mix: capped vial rocking gently, "Don't shake" ---------- */
export const VialRock: React.FC<{ w: number; h: number; base: number; capAt: number; rockAt: number; dontAt: number }> = ({ w, h, base, capAt, rockAt, dontAt }) => {
  const f = useSceneFrame(base);
  const cap = rampIO(f, capAt, capAt + 22);
  const rockAmp = ramp(f, rockAt, rockAt + 20);
  const angle = rockAmp * 20 * Math.sin(((f - rockAt) / 48) * Math.PI * 2);
  const dissolve = ramp(f, rockAt, rockAt + 150);
  const dont = ramp(f, dontAt, dontAt + 18);
  return (
    <Svg w={w} h={h}>
      <g transform={`translate(400, 400) rotate(${angle}, 0, 100)`}>
        <g transform="scale(1.7)">
          <VialIcon capped={false} fill={0.6} />
          {/* undissolved powder settling at the bottom */}
          {Array.from({ length: 14 }).map((_, i) => (
            <circle key={i} cx={-30 + ((i * 37) % 60)} cy={78 - ((i * 13) % 14)} r={2.6} fill={C.ivory} opacity={0.85 * (1 - dissolve)} />
          ))}
          <g transform={`translate(0, ${(1 - cap) * -90})`} opacity={cap > 0 ? 1 : 0}>
            <rect x={-36} y={-112} width={72} height={40} rx={8} fill="#141a24" {...STROKE} strokeWidth={2} />
          </g>
        </g>
      </g>
      {/* rocking arrows */}
      <g opacity={rockAmp * 0.9} fill="none" stroke={C.accent} strokeWidth={5} strokeLinecap="round">
        <path d="M 230 175 A 220 220 0 0 1 570 175" />
        <path d="M 553 152 L 572 177 L 543 184" />
        <path d="M 247 152 L 228 177 L 257 184" />
      </g>
      <Label x={400} y={60} lines={['Back and forth']} o={rockAmp} size={30} color={C.accent} />
      {/* Don't shake badge */}
      <g opacity={dont} transform={`translate(400, ${690 + (1 - dont) * 20})`}>
        <rect x={-210} y={-50} width={420} height={100} rx={50} fill={C.ink} stroke={C.warn} strokeWidth={3} />
        <g transform="translate(-140, 0)">
          <path d="M -22 -24 L -8 -8 M -22 -8 L -8 -24 M 8 8 L 22 24 M 8 24 L 22 8" stroke={C.warn} strokeWidth={4} strokeLinecap="round" />
          <circle r={30} fill="none" stroke={C.warn} strokeWidth={4} />
          <line x1={-21} y1={21} x2={21} y2={-21} stroke={C.warn} strokeWidth={4} />
        </g>
        <Label x={30} y={14} lines={["Don't shake"]} size={40} color={C.warn} weight={700} />
      </g>
    </Svg>
  );
};

/* ---------- Load: pad top view, "stay in the center" ring, drip ---------- */
export const PadTop: React.FC<{ w: number; h: number; base: number; upAt: number; dripFrom: number; dripTo: number; ringAt: number; blueAt?: number }> = ({ w, h, base, upAt, dripFrom, dripTo, ringAt, blueAt = big }) => {
  const f = useSceneFrame(base);
  const up = ramp(f, upAt, upAt + 18);
  const stain = rampIO(f, dripFrom, dripTo);
  const ring = ramp(f, ringAt, ringAt + 20);
  const blue = ramp(f, blueAt, blueAt + 30);
  const dripping = f >= dripFrom && f < dripTo;
  const age = (f - dripFrom) % 14;
  const padC = '#ffffff';
  const stainColor = interpolateColor(blue);
  return (
    <Svg w={w} h={h}>
      <g transform="translate(370, 400)">
        <PatchShape s={2.4} padColor={padC} />
        {/* pad centre is at (-18*2.4, 14*2.4) */}
        <g transform="translate(-43, 34)">
          <circle r={95 * stain} fill={stainColor} opacity={0.75} />
          <circle r={130} fill="none" stroke={C.accent} strokeWidth={5} strokeDasharray="14 12" opacity={ring} transform={`rotate(${f * 0.4})`} />
          {dripping && <ellipse cx={0} cy={-260 + (age / 14) ** 1.7 * 255} rx={9} ry={13} fill={C.amberLight} opacity={1 - age / 16} />}
          {/* bottle tip above the pad */}
          <g opacity={ramp(f, dripFrom - 15, dripFrom) * (1 - ramp(f, dripTo, dripTo + 15))} transform="translate(0, -300)">
            <rect x={-26} y={-60} width={52} height={50} rx={6} fill={C.amber} {...STROKE} />
            <rect x={-14} y={-12} width={28} height={16} rx={3} fill="#5a3a1e" {...STROKE} />
          </g>
        </g>
      </g>
      <g opacity={up * (1 - ring)}>
        <Label x={400} y={720} lines={['White pad facing up']} size={34} />
      </g>
      <g opacity={ring}>
        <Label x={400} y={720} lines={['Stay in the center']} size={36} color={C.accent} weight={700} />
      </g>
    </Svg>
  );
};

const interpolateColor = (p: number) => {
  // clear wet -> soft blue
  const a = [220, 228, 236], b = [111, 134, 232];
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * p));
  return `rgb(${c.join(',')})`;
};

/* ---------- Skin: arm outline, zone, joints to avoid ---------- */
export const Arm: React.FC<{ w: number; h: number; base: number; jointsAt: number; zoneAt: number; skipAt?: number }> = ({ w, h, base, jointsAt, zoneAt, skipAt = big }) => {
  const f = useSceneFrame(base);
  const j = ramp(f, jointsAt, jointsAt + 20);
  const z = ramp(f, zoneAt, zoneAt + 24);
  const skip = ramp(f, skipAt, skipAt + 20);
  const draw = ramp(f, 0, 40);
  // back view of a right arm hanging down; shoulder at top, elbow mid, forearm below
  const armPath = 'M 300 70 C 360 40 470 50 500 120 C 520 170 515 250 505 330 C 498 390 492 430 490 470 C 488 520 480 600 470 760 M 300 70 C 320 140 338 230 342 330 C 345 400 348 440 350 470 C 352 540 362 640 372 760';
  return (
    <Svg w={w} h={h}>
      {/* torso edge */}
      <path d="M 300 70 C 250 90 225 140 220 220 L 210 520" fill="none" stroke={C.onInk} strokeOpacity={0.35} strokeWidth={3} strokeDasharray="10 10" />
      <path d={armPath} fill="none" {...STROKE} strokeWidth={4} strokeDasharray={1800} strokeDashoffset={1800 * (1 - draw)} />
      {/* target zone on the back of the upper arm */}
      <g opacity={z}>
        <ellipse cx={428} cy={270} rx={64} ry={92} fill={C.accent} fillOpacity={0.22} stroke={C.accent} strokeWidth={4} />
        <Label x={560} y={250} lines={['Back of', 'upper arm']} size={32} anchor="start" color={C.accent} weight={700} />
        <path d="M 552 262 L 498 268" stroke={C.accent} strokeWidth={3} />
      </g>
      {/* joints */}
      <g opacity={j}>
        {[[410, 92, 'Shoulder'], [420, 470, 'Elbow']].map(([x, y, name]) => (
          <g key={name as string}>
            <circle cx={x as number} cy={y as number} r={34} fill="none" stroke={C.warn} strokeWidth={4} strokeDasharray="8 7" />
            <Label x={(x as number) - 130} y={(y as number) + 2} lines={[name as string]} size={28} anchor="end" color={C.onInk} />
            <Label x={(x as number) - 130} y={(y as number) + 34} lines={['avoid']} size={26} anchor="end" color={C.warn} weight={700} />
            <path d={`M ${(x as number) - 120} ${(y as number) + 10} L ${(x as number) - 40} ${(y as number) + 4}`} stroke={C.warn} strokeWidth={2.5} opacity={0.8} />
          </g>
        ))}
      </g>
      {/* skip moles, cuts, irritated skin */}
      <g opacity={skip}>
        {[[410, 230], [450, 300], [400, 320]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={7} fill="#7a4a3a" />
            <circle cx={x} cy={y} r={18} fill="none" stroke={C.warn} strokeWidth={3} />
          </g>
        ))}
        <rect x={150} y={640} width={500} height={92} rx={46} fill={C.ink} stroke={C.warn} strokeWidth={3} />
        <Label x={400} y={680} lines={['Skip moles, cuts and']} size={28} color={C.onInk} weight={600} />
        <Label x={400} y={714} lines={['irritated skin']} size={28} color={C.onInk} weight={600} />
      </g>
    </Svg>
  );
};

/* ---------- Wear: 12-hour clock ---------- */
export const Clock: React.FC<{ w: number; h: number; base: number; fillFrom: number; fillTo: number }> = ({ w, h, base, fillFrom, fillTo }) => {
  const f = useSceneFrame(base);
  const p = rampIO(f, fillFrom, fillTo);
  const R = 230, cx = 400, cy = 380;
  const a = p * Math.PI * 2;
  const x = cx + R * Math.sin(a), y = cy - R * Math.cos(a);
  const arc = p >= 0.999 ? `M ${cx} ${cy - R} A ${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R} Z` : `M ${cx} ${cy} L ${cx} ${cy - R} A ${R} ${R} 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y} Z`;
  const hours = Math.round(p * 12);
  return (
    <Svg w={w} h={h}>
      <circle cx={cx} cy={cy} r={R + 16} fill={C.ink} stroke={C.inkLine} strokeWidth={3} />
      {p > 0 && <path d={arc} fill={C.accent} opacity={0.22} />}
      {Array.from({ length: 12 }).map((_, i) => {
        const t = (i / 12) * Math.PI * 2;
        const on = i < hours || hours === 12;
        return <line key={i} x1={cx + (R - 6) * Math.sin(t)} y1={cy - (R - 6) * Math.cos(t)} x2={cx + (R - 34) * Math.sin(t)} y2={cy - (R - 34) * Math.cos(t)} stroke={on ? C.accent : C.onInk} strokeWidth={6} strokeLinecap="round" opacity={on ? 1 : 0.5} />;
      })}
      <line x1={cx} y1={cy} x2={cx + (R - 50) * Math.sin(a)} y2={cy - (R - 50) * Math.cos(a)} stroke={C.white} strokeWidth={6} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={10} fill={C.white} />
      <Label x={cx} y={cy + 100} lines={[`${Math.max(0, hours)} h`]} size={64} color={C.white} weight={800} />
      <Label x={cx} y={720} lines={['Wear for 12 hours']} size={38} color={C.accent} weight={700} o={ramp(f, fillTo - 10, fillTo + 10)} />
    </Svg>
  );
};

/* ---------- Wear: removal notes ---------- */
export const Removal: React.FC<{ w: number; h: number; base: number; at: number[] }> = ({ w, h, base, at }) => {
  const f = useSceneFrame(base);
  const rows: { icon: React.ReactNode; text: string; color?: string }[] = [
    {
      icon: (
        <g>
          <path d="M 0 -26 C 12 -8 20 4 20 14 A 20 20 0 0 1 -20 14 C -20 4 -12 -8 0 -26 Z" fill={C.accent} />
          <circle cx={26} cy={-14} r={8} fill="none" stroke={C.onInk} strokeWidth={3} />
          <circle cx={34} cy={10} r={5} fill="none" stroke={C.onInk} strokeWidth={3} />
        </g>
      ),
      text: 'Wet it with warm, soapy water',
    },
    { icon: <path d="M -22 18 C -10 -20 10 -20 22 -8 M 12 -18 L 22 -8 L 10 2" fill="none" stroke={C.accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />, text: 'Peel slowly' },
    {
      icon: (
        <g>
          <circle r={24} fill="none" stroke={C.warn} strokeWidth={4} />
          <line x1={-17} y1={17} x2={17} y2={-17} stroke={C.warn} strokeWidth={4} />
        </g>
      ),
      text: 'Never pull it off dry',
      color: C.warn,
    },
    {
      icon: (
        <g>
          <rect x={-24} y={-22} width={48} height={44} rx={6} fill="none" stroke={C.accent} strokeWidth={4} />
          <line x1={-24} y1={-8} x2={24} y2={-8} stroke={C.accent} strokeWidth={4} />
        </g>
      ),
      text: 'Same spot? Wait at least a day',
    },
  ];
  return (
    <Svg w={w} h={h}>
      <Label x={90} y={150} lines={['Taking it off']} size={44} anchor="start" color={C.white} weight={800} o={ramp(f, 0, 14)} />
      {rows.map((r, i) => {
        const p = ramp(f, at[i], at[i] + 18);
        const y = 270 + i * 128;
        return (
          <g key={i} opacity={p} transform={`translate(${(1 - p) * 24}, 0)`}>
            <rect x={70} y={y - 52} width={660} height={104} rx={22} fill={C.ink} stroke={C.inkLine} strokeWidth={2} />
            <g transform={`translate(130, ${y})`}>{r.icon}</g>
            <Label x={190} y={y + 11} lines={[r.text]} size={32} anchor="start" color={r.color ?? C.onInk} />
          </g>
        );
      })}
    </Svg>
  );
};

/* ---------- Wear: 6-week calendar ---------- */
export const Calendar: React.FC<{ w: number; h: number; base: number; from: number }> = ({ w, h, base, from }) => {
  const f = useSceneFrame(base);
  return (
    <Svg w={w} h={h}>
      <Label x={400} y={150} lines={['One patch a week']} size={44} color={C.white} weight={800} o={ramp(f, from - 10, from + 8)} />
      {Array.from({ length: 6 }).map((_, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = 145 + col * 255, y = 300 + row * 250;
        const p = ramp(f, from + 6 + i * 9, from + 24 + i * 9);
        return (
          <g key={i} opacity={ramp(f, from - 10 + i * 3, from + 8 + i * 3)}>
            <rect x={x - 100} y={y - 90} width={200} height={200} rx={22} fill={C.ink} stroke={p > 0.5 ? C.accent : C.inkLine} strokeWidth={3} />
            <Label x={x} y={y - 46} lines={[`Week ${i + 1}`]} size={28} color={C.muted} weight={600} />
            <g transform={`translate(${x}, ${y + 34}) scale(${0.5 * p})`} opacity={p}>
              <PatchShape s={0.85} padColor="#9aaaf0" />
            </g>
          </g>
        );
      })}
      <Label x={400} y={790} lines={['× 6 weeks']} size={40} color={C.accent} weight={800} o={ramp(f, from + 60, from + 78)} />
    </Svg>
  );
};

/* ---------- Good to know ---------- */
export const GoodToKnow: React.FC<{ w: number; h: number; base: number; at: number[] }> = ({ w, h, base, at }) => {
  const f = useSceneFrame(base);
  const items = [
    {
      title: 'Store below 77°F',
      sub: 'Somewhere cool and dry',
      icon: (
        <g>
          <rect x={-10} y={-40} width={20} height={58} rx={10} fill="none" stroke={C.accent} strokeWidth={4} />
          <circle cy={30} r={18} fill={C.accent} />
          <rect x={-4} y={-10} width={8} height={36} fill={C.accent} />
        </g>
      ),
    },
    {
      title: 'Skin stays irritated?',
      sub: 'Take the patch off and contact us',
      icon: (
        <g>
          <path d="M 0 -38 L 38 30 L -38 30 Z" fill="none" stroke={C.warn} strokeWidth={4} strokeLinejoin="round" />
          <line x1={0} y1={-12} x2={0} y2={8} stroke={C.warn} strokeWidth={5} strokeLinecap="round" />
          <circle cx={0} cy={20} r={3.5} fill={C.warn} />
        </g>
      ),
    },
  ];
  return (
    <Svg w={w} h={h}>
      <Label x={90} y={190} lines={['Good to know']} size={50} anchor="start" color={C.white} weight={800} o={ramp(f, 0, 16)} />
      {items.map((it, i) => {
        const p = ramp(f, at[i], at[i] + 18);
        const y = 340 + i * 200;
        return (
          <g key={i} opacity={p} transform={`translate(${(1 - p) * 24}, 0)`}>
            <rect x={70} y={y - 76} width={660} height={160} rx={26} fill={C.ink} stroke={C.inkLine} strokeWidth={2} />
            <g transform={`translate(150, ${y + 4})`}>{it.icon}</g>
            <Label x={225} y={y - 4} lines={[it.title]} size={36} anchor="start" color={C.white} weight={700} />
            <Label x={225} y={y + 40} lines={[it.sub]} size={28} anchor="start" color={C.muted} weight={500} />
          </g>
        );
      })}
    </Svg>
  );
};

