import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, easeOut, easeInOut } from '../theme';

/** frame relative to the SCENE (segments pass the scene frame they start at as `base`). */
export const useSceneFrame = (base: number) => useCurrentFrame() + base;

export const ramp = (f: number, a: number, b: number, ease = easeOut) =>
  b <= a ? (f >= a ? 1 : 0) : interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
export const rampIO = (f: number, a: number, b: number) => ramp(f, a, b, easeInOut);

export const Svg: React.FC<{ w: number; h: number; children: React.ReactNode; vb?: string }> = ({ w, h, children, vb = '0 0 800 800' }) => (
  <svg width={w} height={h} viewBox={vb} preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M40 0H0V40" fill="none" stroke={C.inkLine} strokeWidth="1" opacity="0.35" />
      </pattern>
      <radialGradient id="glow" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stopColor="#1b2a47" />
        <stop offset="100%" stopColor={C.ink2} />
      </radialGradient>
    </defs>
    <rect x="-400" y="-400" width="1600" height="1600" fill="url(#glow)" />
    <rect x="-400" y="-400" width="1600" height="1600" fill="url(#grid)" />
    {children}
  </svg>
);

export const Label: React.FC<{ x: number; y: number; lines: string[]; o?: number; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; weight?: number }> = ({ x, y, lines, o = 1, size = 30, color = C.onInk, anchor = 'middle', weight = 600 }) => (
  <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={color} opacity={o} style={{ letterSpacing: '-0.01em' }}>
    {lines.map((l, i) => (
      <tspan key={i} x={x} dy={i === 0 ? 0 : size * 1.18}>
        {l}
      </tspan>
    ))}
  </text>
);

export const STROKE = { stroke: C.onInk, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
