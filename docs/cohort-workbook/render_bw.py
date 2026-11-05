#!/usr/bin/env python3
"""Black-ink KDP paperback interior for The Logbook.

Takes the already-rendered color draft/_MASTER.html and swaps only the colors in its
stylesheet for black/gray. Layout, trim (7.5 x 9.25in), margins and body are unchanged,
so pagination matches the color PDF exactly.

Run:  python3 render_bw.py   -> draft/_MASTER-bw.html
Then: Chrome --headless=new --no-pdf-header-footer --print-to-pdf=<out.pdf> draft/_MASTER-bw.html
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent
src = (ROOT / 'draft' / '_MASTER.html').read_text(encoding='utf-8')

# brand color -> print gray (case-insensitive)
MAP = {
    '#0a1628': '#000', '#1a3656': '#111', '#1a1a1a': '#000',
    '#d4af5a': '#555',            # gold accents (subtitle, rules) -> mid gray
    '#fbf7ec': '#f0f0f0', '#f3e8c8': '#e6e6e6', '#f5f3ec': '#eee',
    '#888': '#444', '#333': '#111', '#555': '#444', '#aaa': '#888', '#ccc': '#999',
}
m = re.search(r'<style>(.*?)</style>', src, flags=re.DOTALL)
css = m.group(1)
def sw(mo):
    return MAP.get(mo.group(0).lower(), mo.group(0))
css = re.sub(r'#[0-9a-fA-F]{3,6}\b', sw, css)
# gold rule under h2 reads weak in gray; make it solid black
css = css.replace('border-bottom: 2px solid #555', 'border-bottom: 1.5px solid #000')
css = css.replace('border-left: 3px solid #555', 'border-left: 3px solid #000')
css += "\nth { background: #e6e6e6; }\n"
out = src[:m.start()] + '<style>' + css + '</style>' + src[m.end():]
dst = ROOT / 'draft' / '_MASTER-bw.html'
dst.write_text(out, encoding='utf-8')
left = set(re.findall(r'#[0-9a-fA-F]{3,6}\b', css))
print('Wrote', dst, 'colors remaining:', sorted(left))
