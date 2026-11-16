import { CAPTION_TOP, ClipSpec } from './components/Clip';

// Shot list from TJ's phone video. `at` = seconds into public/clips/<file>.mp4 (see scripts/clips.sh
// for each file's source offset). `safe` keeps the crop above the burned-in captions and below
// anything that is not hands/arm/kit (TJ's face appears at the top of several table shots).
const full: [number, number, number, number] = [0, 0, 540, CAPTION_TOP];

export const SHOT = {
  kitOpen: { file: 'kit', at: 0.6, safe: [0, 230, 540, CAPTION_TOP], focus: [290, 480] }, // src 4.6s
  vialFull: { file: 'vialfull', at: 1.2, safe: [0, 200, 540, CAPTION_TOP], focus: [300, 470] }, // src 19.2s
  markedDropper: { file: 'dropper', at: 1.3, safe: full, focus: [270, 420], zoom: 1.05 }, // src 57.3s
  markedDropper2: { file: 'dropper', at: 8.2, safe: full, focus: [270, 420], zoom: 1.05 }, // src 64.2s
  mix: { file: 'mix', at: 1.1, safe: [0, 300, 540, CAPTION_TOP], focus: [200, 480], rate: 0.8 }, // src 79.1s (tipping the vial)
  drip1: { file: 'drip', at: 1.0, safe: [0, 170, 540, CAPTION_TOP], focus: [260, 560] }, // src 92s
  drip2: { file: 'drip', at: 8.0, safe: [0, 170, 540, CAPTION_TOP], focus: [260, 560] }, // src 99s
  drip3: { file: 'drip', at: 15.3, safe: [0, 170, 540, CAPTION_TOP], focus: [250, 580] }, // src 106.3s
  alcohol: { file: 'alcohol', at: 0.8, safe: full, focus: [300, 420] }, // src 111.8s
  roller1: { file: 'roller', at: 1.0, safe: full, focus: [300, 440] }, // src 117.5s
  roller2: { file: 'roller', at: 4.3, safe: full, focus: [300, 440] }, // src 120.8s
  redness: { file: 'redness', at: 0.7, safe: [0, 140, 540, CAPTION_TOP], focus: [330, 430] }, // src 127.2s
  prep: { file: 'prep', at: 0.6, safe: [0, 270, 540, CAPTION_TOP], focus: [330, 520] }, // src 136.6s
  peel: { file: 'peel', at: 0.6, safe: full, focus: [300, 420] }, // src 144.6s
  peelReveal: { file: 'peel', at: 6.5, safe: full, focus: [330, 380] }, // src 150.5s
  place: { file: 'apply', at: 1.4, safe: full, focus: [300, 380] }, // src 161.4s
  press: { file: 'apply', at: 7.0, safe: full, focus: [280, 380] }, // src 167s
  pullTab: { file: 'apply', at: 24.4, safe: full, focus: [260, 380] }, // src 184.4s
  sealed: { file: 'apply', at: 28.8, safe: full, focus: [270, 360] }, // src 188.8s
} satisfies Record<string, ClipSpec>;
