import { loadFont } from '@remotion/google-fonts/Inter';
import { Easing } from 'remotion';

// Push Patch page palette (website/src/components/push-patch/PushPatchLanding.astro)
export const C = {
  ink: '#0b1220',
  ink2: '#131d31',
  inkDeep: '#070c17',
  inkLine: '#26344d',
  onInk: '#e6edf7',
  muted: '#9fb0c8',
  ivory: '#faf6ec',
  white: '#ffffff',
  accent: '#22d3ee',
  accentDeep: '#0e7490',
  amber: '#b8641c',
  amberLight: '#d98a3d',
  water: '#bfeaf5',
  blue: '#6f86e8',
  warn: '#f0a868',
};

const normal = loadFont('normal', { weights: ['400', '500', '600', '700', '800'], subsets: ['latin'] });
loadFont('italic', { weights: ['400', '500'], subsets: ['latin'] });
export const FONT = `${normal.fontFamily}, system-ui, -apple-system, 'Segoe UI', sans-serif`;

export const FPS = 30;
// calm, premium motion: ease-out cubic for entrances, in-out for moves
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
