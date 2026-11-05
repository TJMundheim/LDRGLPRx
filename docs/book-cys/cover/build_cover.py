#!/usr/bin/env python3
"""Build the Count Yourself Skinny paperback full wrap (HTML, PDF, front PNG).
Fonts: Anton (SIL OFL, docs/design/cys/fonts) + Arial (macOS). Needs Chrome, PyMuPDF."""
import pathlib, subprocess, fitz
D = pathlib.Path(__file__).resolve().parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PAGES_BILLED = 82                      # 81 interior + 1 blank KDP adds
SPINE = round(PAGES_BILLED * 0.002252, 3)   # white paper, KDP formula
BLEED, TRIM_W, TRIM_H = 0.125, 6.0, 9.0
W = round(BLEED + TRIM_W + SPINE + TRIM_W + BLEED, 3)
H = TRIM_H + 2 * BLEED
FX = BLEED + TRIM_W + SPINE            # front trim-left edge
IX = FX + 0.4                          # inner text left (0.4in inside trim)
TW = 5.2                               # headline width
imp = fitz.Font(fontfile='/Users/thomasmundheim/Development/LDRGLPRx/docs/design/cys/fonts/Anton-Regular.ttf')
def size_for(txt, width): return width / imp.text_length(txt, fontsize=1)
CAP = 0.86                             # Anton capital height per em, measured by rendering 'H'
def line(txt, base, height, fill, width=TW):
    """One justified line: fits the width, then scales vertically to an exact cap height (inches)."""
    s = size_for(txt, width)
    sy = height / (s * CAP)
    return (f'<text transform="translate({IX:.3f},{base:.3f}) scale(1,{sy:.4f})" font-size="{s:.4f}" fill="{fill}">{txt}</text>', height)
TOP, GAP, H1, H2, H3 = 2.72, 0.2, 1.05, 0.80, 2.80
parts = []
b1 = TOP + H1; b2 = b1 + GAP + H2; b3 = b2 + GAP + H3
t, h1 = line('COUNT', b1, H1, '#fff');          parts.append(t)
t, h2 = line('YOURSELF', b2, H2, '#fff');       parts.append(t)
t, h3 = line('SKINNY', b3, H3, '#FFD400');      parts.append(t)
s32 = 2.3
parts.append(f'<text x="{IX-0.04:.3f}" y="2.35" font-size="{s32}" fill="#111">32</text>')
for i, tx in enumerate(['CHEWS PER BITE.', 'NO CALORIE MATH.', 'NO FOOD SCALE.']):
    s = size_for(tx, 2.4)
    parts.append(f'<text x="{IX+2.8:.3f}" y="{0.95+i*0.46:.3f}" font-size="{s:.4f}" fill="#fff">{tx}</text>')
parts.append(f'<rect x="{IX+2.8:.3f}" y="2.12" width="2.4" height="0.06" fill="#FFD400"/>')
by = size_for('DR. TJ MUNDHEIM', 3.4)
parts.append(f'<text x="{IX:.3f}" y="8.45" font-size="{by:.4f}" fill="#fff" letter-spacing="0.03">DR. TJ MUNDHEIM</text>')
svg = f'<svg class="art" viewBox="0 0 {W} {H}" width="{W}in" height="{H}in" xmlns="http://www.w3.org/2000/svg" font-family="Anton">{"".join(parts)}</svg>'
BX = BLEED + 0.4
html = f'''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Count Yourself Skinny - Full Wrap Paperback 6x9</title>
<style>
/* GEOMETRY: 6x9 trim, 0.125in bleed, {PAGES_BILLED} billed pages (81 + KDP blank), white paper.
   Spine = {PAGES_BILLED} x 0.002252 = {SPINE}in (blank, no spine text).
   Wrap = {BLEED} + {TRIM_W} + {SPINE} + {TRIM_W} + {BLEED} = {W}in x {H}in.
   Back trim: {BLEED}-{BLEED+TRIM_W}; spine: {BLEED+TRIM_W}-{FX:.3f}; front: {FX:.3f}-{FX+TRIM_W:.3f}. */
@page {{ size:{W}in {H}in; margin:0 }}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}in;height:{H}in;background:#E8352B;overflow:hidden}}
.art{{position:absolute;left:0;top:0}}
@font-face{{font-family:Anton;src:url("file:///Users/thomasmundheim/Development/LDRGLPRx/docs/design/cys/fonts/Anton-Regular.ttf")}}
.back{{position:absolute;left:{BX}in;top:0.6in;width:5.0in;font-family:Arial,sans-serif;color:#fff}}
.quote{{font-family:Anton;color:#FFD400;font-size:0.5in;line-height:1.05;white-space:nowrap;text-transform:uppercase}}
.rule{{width:1.2in;height:0.06in;background:#fff;margin:0.32in 0}}
.hook{{font-weight:700;font-size:17pt;line-height:1.25;margin-bottom:0.16in}}
.blurb{{font-size:13pt;line-height:1.45;margin-bottom:0.18in;width:4.9in}}
.url{{position:absolute;left:{BX}in;top:8.55in;font-family:Arial;font-weight:700;font-size:9pt;letter-spacing:.04em;color:#fff}}
</style></head><body>
{svg}
<div class="back">
<div class="quote">The diet industry got fat.<br>This book got skinny.</div>
<div class="rule"></div>
<p class="hook">You'll never count a calorie. You'll count to 32 instead.</p>
<p class="blurb">Six easy numbers replace the diet: chews, hours, steps, minutes of morning light, glasses of water, and nights of sleep.</p>
<p class="blurb">A 12-week Count Log is built right into the book, so every page you fill is proof you showed up.</p>
<p class="blurb">No food scale. No forbidden foods. Nothing to buy. If you can count to 32, you can do this.</p>
</div>
<div class="url">my4mlife.com</div>
</body></html>'''
(D/'full-cover-paperback-6x9.html').write_text(html)
subprocess.run([CHROME,'--headless','--disable-gpu','--no-pdf-header-footer','--allow-file-access-from-files',
  f'--print-to-pdf={D/"full-cover-paperback-6x9.pdf"}', (D/'full-cover-paperback-6x9.html').as_uri()],check=True,capture_output=True)
doc = fitz.open(D/'full-cover-paperback-6x9.pdf'); p = doc[0]
print('pages', len(doc), 'size in', p.rect.width/72, p.rect.height/72, 'expected', W, H)
clip = fitz.Rect(FX*72, 0, (FX+TRIM_W+BLEED)*72, H*72)
p.get_pixmap(dpi=150, clip=clip).save(D/'front-thumbnail.png')
print('fonts', doc.get_page_fonts(0))
