import { useVideoConfig } from 'remotion';

export type Rect = { x: number; y: number; w: number; h: number };
export type Layout = {
  portrait: boolean;
  W: number;
  H: number;
  captionBand: Rect; // dark band at the top; captions live here, never over the hands
  captionSize: number;
  captionMaxChars: number; // per caption chunk (two lines max)
  panel: Rect; // media panel (clip or illustration)
  text: Rect; // kicker + headline + sub
  headline: number;
  sub: number;
  kicker: number;
  progress: { x: number; y: number; w: number; align: 'left' | 'center' };
  bug: { x: number; y: number; align: 'right' | 'center' };
};

export const LANDSCAPE: Layout = {
  portrait: false,
  W: 1920,
  H: 1080,
  captionBand: { x: 0, y: 0, w: 1920, h: 168 },
  captionSize: 46,
  captionMaxChars: 92,
  panel: { x: 960, y: 214, w: 840, h: 800 },
  text: { x: 120, y: 214, w: 760, h: 700 },
  headline: 68,
  sub: 36,
  kicker: 26,
  progress: { x: 120, y: 952, w: 520, align: 'left' },
  bug: { x: 1800, y: 1032, align: 'right' },
};

export const PORTRAIT: Layout = {
  portrait: true,
  W: 1080,
  H: 1920,
  captionBand: { x: 0, y: 0, w: 1080, h: 318 },
  captionSize: 50,
  captionMaxChars: 66,
  panel: { x: 60, y: 350, w: 960, h: 1060 },
  text: { x: 70, y: 1446, w: 940, h: 320 },
  headline: 64,
  sub: 36,
  kicker: 28,
  progress: { x: 240, y: 1800, w: 600, align: 'center' },
  bug: { x: 540, y: 1872, align: 'center' },
};

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return height > width ? PORTRAIT : LANDSCAPE;
};
