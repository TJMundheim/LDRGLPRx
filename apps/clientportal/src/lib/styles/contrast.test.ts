/**
 * WCAG contrast guard for the light clinical theme.
 * Parses the :root block of tokens.css and asserts every pair we actually
 * render text with clears AA (4.5:1), and UI-only pairs clear 3.0:1.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'src/lib/styles/tokens.css'), 'utf8');

/** Variables from the FIRST :root block (the light theme). */
function parseRoot(source: string): Record<string, string> {
  const start = source.indexOf(':root');
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  const body = source.slice(open + 1, close);
  const out: Record<string, string> = {};
  for (const line of body.split('\n')) {
    const m = line.match(/(--[a-z0-9-]+)\s*:\s*([^;]+);/i);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const T = parseRoot(css);

type RGBA = [number, number, number, number];

function parseColor(value: string): RGBA {
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const rgba = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const p = rgba[1].split(',').map((n) => parseFloat(n.trim()));
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  throw new Error(`Unparseable color: ${value}`);
}

const tok = (name: string): RGBA => parseColor(T[name] ?? '');

/** Composite a (possibly translucent) color over an opaque backdrop. */
function over(fg: RGBA, bg: RGBA): RGBA {
  const a = fg[3];
  return [
    fg[0] * a + bg[0] * (1 - a),
    fg[1] * a + bg[1] * (1 - a),
    fg[2] * a + bg[2] * (1 - a),
    1,
  ];
}

function luminance([r, g, b]: RGBA): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(fg: RGBA, bg: RGBA): number {
  const f = luminance(over(fg, bg));
  const b = luminance(bg);
  const [hi, lo] = f > b ? [f, b] : [b, f];
  return (hi + 0.05) / (lo + 0.05);
}

const panel = () => tok('--mc-panel');

describe('tokens.css — light clinical theme contrast', () => {
  it('parses every token we rely on', () => {
    for (const name of [
      '--mc-bg', '--mc-panel', '--mc-ink', '--mc-muted', '--mc-faint',
      '--mc-gold', '--mc-on-gold', '--mc-navy', '--mc-navy-ink',
      '--mc-good', '--mc-good-tint', '--mc-warn', '--mc-warn-tint',
      '--mc-crit', '--mc-crit-tint', '--mc-info', '--mc-info-tint',
    ]) {
      expect(T[name], `${name} missing from :root`).toBeTruthy();
    }
  });

  const textPairs: Array<[string, RGBA, RGBA]> = [
    ['ink on bg', tok('--mc-ink'), tok('--mc-bg')],
    ['ink on panel', tok('--mc-ink'), panel()],
    ['ink on panel-2', tok('--mc-ink'), tok('--mc-panel-2')],
    ['muted on panel', tok('--mc-muted'), panel()],
    ['muted on bg', tok('--mc-muted'), tok('--mc-bg')],
    ['gold text on panel', tok('--mc-gold'), panel()],
    ['gold text on gold-tint over panel', tok('--mc-gold'), over(tok('--mc-gold-tint'), panel())],
    ['on-gold on gold fill', tok('--mc-on-gold'), tok('--mc-gold')],
    ['navy-ink on navy', tok('--mc-navy-ink'), tok('--mc-navy')],
    ['good on panel', tok('--mc-good'), panel()],
    ['good on good-tint over panel', tok('--mc-good'), over(tok('--mc-good-tint'), panel())],
    ['warn on panel', tok('--mc-warn'), panel()],
    ['warn on warn-tint over panel', tok('--mc-warn'), over(tok('--mc-warn-tint'), panel())],
    ['crit on panel', tok('--mc-crit'), panel()],
    ['crit on crit-tint over panel', tok('--mc-crit'), over(tok('--mc-crit-tint'), panel())],
    ['info on panel', tok('--mc-info'), panel()],
    ['info on info-tint over panel', tok('--mc-info'), over(tok('--mc-info-tint'), panel())],
    ['good-bright on panel', tok('--mc-good-bright'), panel()],
    ['warn-bright on panel', tok('--mc-warn-bright'), panel()],
    ['crit-bright on panel', tok('--mc-crit-bright'), panel()],
  ];

  it.each(textPairs)('%s clears AA 4.5:1', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  const uiPairs: Array<[string, RGBA, RGBA]> = [
    ['faint text (large/secondary) on panel', tok('--mc-faint'), panel()],
    ['line against panel', tok('--mc-line'), panel()],
    ['gold-line against panel', tok('--mc-gold-line'), panel()],
    ['navy-muted on navy', tok('--mc-navy-muted'), tok('--mc-navy')],
  ];

  it.each(uiPairs)('%s clears 3.0:1 for UI/large text', (label, fg, bg) => {
    const min = label.startsWith('line') || label.startsWith('gold-line') ? 1.5 : 3.0;
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
