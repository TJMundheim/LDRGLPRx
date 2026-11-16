import React from 'react';
import { C } from '../theme';
import { Label, STROKE, Svg, ramp, useSceneFrame } from './common';

// line drawings of the six kit items, each centred on (0,0) in a ~220x220 box
export const VialIcon: React.FC<{ capped?: boolean; scale?: number; fill?: number }> = ({ capped = true, scale = 1, fill = 0.55 }) => (
  <g transform={`scale(${scale})`}>
    <rect x={-42} y={-62} width={84} height={150} rx={12} fill={C.amber} {...STROKE} />
    <rect x={-42} y={88 - 150 * fill} width={84} height={150 * fill} rx={12} fill={C.amberLight} opacity={0.35} />
    <rect x={-42} y={-8} width={84} height={52} fill={C.ivory} opacity={0.92} />
    <line x1={-26} y1={8} x2={26} y2={8} stroke={C.ink} strokeWidth={4} opacity={0.5} />
    <line x1={-26} y1={24} x2={12} y2={24} stroke={C.ink} strokeWidth={4} opacity={0.35} />
    <rect x={-24} y={-80} width={48} height={20} rx={4} fill="#5a3a1e" {...STROKE} />
    {capped && <rect x={-36} y={-112} width={72} height={40} rx={8} fill="#141a24" {...STROKE} />}
  </g>
);

const DropperIcon: React.FC = () => (
  <g>
    <rect x={-26} y={-110} width={52} height={170} rx={24} fill={C.water} fillOpacity={0.22} {...STROKE} />
    <rect x={-26} y={-60} width={52} height={120} rx={20} fill={C.water} fillOpacity={0.35} />
    {[-80, -50, -20, 10, 40].map((y) => (
      <line key={y} x1={-10} y1={y} x2={10} y2={y} stroke={C.onInk} strokeWidth={2} opacity={0.4} />
    ))}
    <rect x={-9} y={60} width={18} height={34} fill={C.water} fillOpacity={0.3} {...STROKE} />
    <rect x={-22} y={94} width={44} height={26} rx={5} fill={C.water} fillOpacity={0.3} {...STROKE} />
  </g>
);

export const PatchShape: React.FC<{ padColor?: string; s?: number }> = ({ padColor = C.white, s = 1 }) => (
  <g transform={`scale(${s})`}>
    {/* union of two circles: stroked first, then filled again on top to hide the inner seam */}
    <circle cx={-18} cy={14} r={84} fill={C.ivory} {...STROKE} />
    <circle cx={68} cy={-62} r={40} fill={C.ivory} {...STROKE} />
    <circle cx={-18} cy={14} r={82.5} fill={C.ivory} />
    <circle cx={68} cy={-62} r={38.5} fill={C.ivory} />
    <circle cx={-18} cy={14} r={46} fill={padColor} stroke="#c9ced8" strokeWidth={3} />
  </g>
);

const Packet: React.FC<{ tint: string; icon: 'drop' | 'shield' }> = ({ tint, icon }) => (
  <g>
    <rect x={-80} y={-80} width={160} height={160} rx={10} fill={tint} {...STROKE} />
    <rect x={-66} y={-66} width={132} height={132} rx={6} fill="none" stroke={C.ink} strokeOpacity={0.25} strokeWidth={2} strokeDasharray="6 6" />
    {icon === 'drop' ? (
      <path d="M 0 -38 C 18 -12 30 4 30 18 A 30 30 0 0 1 -30 18 C -30 4 -18 -12 0 -38 Z" fill={C.accent} fillOpacity={0.85} />
    ) : (
      <g>
        <path d="M 0 -40 L 34 -26 L 34 6 C 34 26 18 40 0 48 C -18 40 -34 26 -34 6 L -34 -26 Z" fill={C.accentDeep} />
        <path d="M -14 4 L -3 16 L 17 -8" fill="none" stroke={C.white} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    )}
  </g>
);

const RollerIcon: React.FC = () => (
  <g transform="rotate(-35)">
    <rect x={-14} y={-20} width={28} height={140} rx={12} fill="#1d2738" {...STROKE} />
    <rect x={-6} y={-52} width={12} height={34} fill="#1d2738" {...STROKE} />
    <rect x={-48} y={-92} width={96} height={44} rx={20} fill="#2b3954" {...STROKE} />
    {Array.from({ length: 7 }).map((_, i) => (
      <g key={i}>
        <circle cx={-36 + i * 12} cy={-80} r={2.4} fill={C.accent} />
        <circle cx={-36 + i * 12} cy={-61} r={2.4} fill={C.accent} />
      </g>
    ))}
  </g>
);

export const KIT_ITEMS = [
  { key: 'vial', label: ['Blend vial'], word: 'amber' },
  { key: 'dropper', label: ['Sterile water', 'dropper'], word: 'sterile' },
  { key: 'patch', label: ['Patch'], word: 'patch' },
  { key: 'alcohol', label: ['Alcohol pad'], word: 'alcohol' },
  { key: 'prep', label: ['Skin-prep wipe'], word: 'skin-prep' },
  { key: 'roller', label: ['Roller'], word: 'microneedling' },
] as const;

export const Kit: React.FC<{ w: number; h: number; base: number; at: number[] }> = ({ w, h, base, at }) => {
  const f = useSceneFrame(base);
  const pos = [
    [150, 250], [400, 250], [650, 250],
    [150, 575], [400, 575], [650, 575],
  ];
  const icon = (k: string) => {
    switch (k) {
      case 'vial': return <VialIcon scale={0.95} />;
      case 'dropper': return <DropperIcon />;
      case 'patch': return <PatchShape s={0.9} />;
      case 'alcohol': return <Packet tint={C.ivory} icon="drop" />;
      case 'prep': return <Packet tint="#dbeef3" icon="shield" />;
      default: return <RollerIcon />;
    }
  };
  return (
    <Svg w={w} h={h}>
      {KIT_ITEMS.map((it, i) => {
        const p = ramp(f, at[i], at[i] + 20);
        const lp = ramp(f, at[i] + 6, at[i] + 24);
        const [x, y] = pos[i];
        const active = f >= at[i] && (i + 1 >= at.length || f < at[i + 1]);
        return (
          <g key={it.key}>
            <g transform={`translate(${x}, ${y + (1 - p) * 40})`} opacity={p}>
              <circle r={118} fill={active ? C.accent : C.onInk} opacity={active ? 0.09 : 0.03} />
              {icon(it.key)}
            </g>
            <Label x={x} y={y + 160} lines={[...it.label]} o={lp} size={30} color={active ? C.accent : C.onInk} />
          </g>
        );
      })}
    </Svg>
  );
};
