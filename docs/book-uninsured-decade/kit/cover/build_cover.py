#!/usr/bin/env python3
"""Full-wrap 6x9 paperback cover draft for The Uninsured Decade.

Usage: python3 build_cover.py --pages 86
Writes, next to this script:
  full-wrap-paperback-6x9-draft.html / .pdf   the KDP-shaped wrap (back + spine + front, with bleed)
  front-draft.png                             front panel at trim, for review
  full-wrap-draft.png                         whole wrap, for review
  ebook-cover-draft.jpg                       front panel, 1600 x 2400, for the Kindle listing

Spine = pages x 0.002252 in (KDP, black ink on white paper).
Fonts are macOS system fonts only (Baskerville, Optima). No web fonts.
To change the subtitle or drop the foreword line, edit SUBTITLE or FOREWORD below and rerun.
"""
import argparse, pathlib, subprocess
import fitz
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

SUBTITLE = "The one catastrophic risk no policy can lower, and the premium you can still pay"
FOREWORD = "Foreword by Marla Mundheim, Attorney at Law"  # needs Marla's written OK
AUTHOR = "Dr. TJ Mundheim"

ap = argparse.ArgumentParser()
ap.add_argument("--pages", type=int, default=86)
ap.add_argument("--nudge", type=float, default=-0.0036, help="move spine type left/right (in) if the printed margins below are uneven")
args = ap.parse_args()

BLEED, TRIM_W, TRIM_H = 0.125, 6.0, 9.0
spine = round(args.pages * 0.002252, 4)
W, H = round(2 * BLEED + 2 * TRIM_W + spine, 4), TRIM_H + 2 * BLEED
FRONT_X = BLEED + TRIM_W + spine
# Spine type sized so the ink keeps KDP's 0.0625 in clear on each side.
SPINE_PT = min(9.0, round((spine - 0.127) / 0.0775 * 6.7, 1))

html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>The Uninsured Decade: full-wrap cover draft ({args.pages} pages)</title>
<style>
/* Geometry: {args.pages} pages x 0.002252 = {spine} in spine. Page {W} x {H} in.
   Back {BLEED} to {BLEED + TRIM_W}; spine {BLEED + TRIM_W} to {FRONT_X}; front {FRONT_X} to {FRONT_X + TRIM_W}.
   Barcode: KDP places it at the lower right of the back panel. That zone stays empty. */
* {{ margin:0; padding:0; box-sizing:border-box; }}
@page {{ size:{W}in {H}in; margin:0; }}
:root {{ --paper:#F2EDE1; --ink:#16202E; --soft:#4F5864; --ox:#7A1F1F; --rule:#16202E; }}
html,body {{ width:{W}in; height:{H}in; overflow:hidden; background:var(--paper); -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
.panel {{ position:absolute; top:{BLEED}in; width:{TRIM_W}in; height:{TRIM_H}in; color:var(--ink); }}
.serif {{ font-family:'Baskerville','Times New Roman',serif; }}
.sans {{ font-family:'Optima','Helvetica Neue',sans-serif; }}

/* FRONT */
#front {{ left:{FRONT_X}in; }}
.kicker {{ position:absolute; top:.56in; left:.62in; right:.62in; font-size:8.6pt; letter-spacing:.24em; text-transform:uppercase; color:var(--soft); }}
.ledger {{ position:absolute; top:.92in; left:.62in; right:.62in; }}
.ledger .head, .ledger .row {{ display:flex; justify-content:space-between; align-items:baseline; }}
.ledger .head {{ border-top:1.6pt solid var(--rule); border-bottom:.5pt solid var(--rule); padding:.055in 0 .05in; font-size:7.6pt; letter-spacing:.17em; text-transform:uppercase; color:var(--soft); }}
.ledger .row {{ border-bottom:.35pt solid #8d9096; padding:.062in 0 .056in; font-size:11.2pt; }}
.ledger .row span:last-child {{ font-size:10pt; color:var(--soft); font-style:italic; }}
.ledger .last {{ border-bottom:1.6pt solid var(--rule); color:var(--ox); font-weight:600; padding-top:.075in; }}
.blank {{ display:inline-block; width:1.34in; border-bottom:1.1pt solid var(--ox); height:.1in; }}
.title {{ position:absolute; top:3.42in; left:.585in; right:.3in; }}
.title .the {{ font-style:italic; font-size:31pt; line-height:1; margin-left:.05in; }}
.title .big {{ font-size:71.5pt; line-height:.99; font-weight:600; letter-spacing:-.012em; }}
.oxrule {{ position:absolute; top:6.06in; left:.62in; width:.8in; border-top:2pt solid var(--ox); }}
.sub {{ position:absolute; top:6.22in; left:.62in; right:.62in; font-style:italic; font-size:16pt; line-height:1.27; }}
.by {{ position:absolute; bottom:.56in; left:.62in; right:.62in; }}
.by .a {{ font-size:19pt; font-weight:600; letter-spacing:.01em; }}
.by .f {{ font-size:9.4pt; letter-spacing:.035em; color:var(--soft); margin-top:.05in; }}

/* SPINE */
#spine {{ position:absolute; top:{BLEED}in; left:{BLEED + TRIM_W}in; width:{spine}in; height:{TRIM_H}in; }}
#spine .t {{ position:absolute; left:{args.nudge}in; width:{spine}in; line-height:{spine}in; writing-mode:vertical-rl; font-size:{SPINE_PT}pt; font-weight:600; letter-spacing:.13em; text-transform:uppercase; color:var(--ink); white-space:nowrap; }}

/* BACK */
#back {{ left:{BLEED}in; }}
.bk {{ position:absolute; top:.56in; left:.56in; right:.56in; }}
.bk h2 {{ font-weight:600; font-size:21pt; line-height:1.14; margin-bottom:.15in; }}
.bk p {{ font-size:11pt; line-height:1.4; margin-bottom:.1in; }}
.bk .topline {{ border-top:1.6pt solid var(--rule); margin-bottom:.15in; }}
.bk .lab {{ font-size:7.8pt; letter-spacing:.2em; text-transform:uppercase; color:var(--soft); margin:.14in 0 .05in; border-top:.5pt solid var(--rule); padding-top:.08in; }}
.bk ul {{ list-style:none; }}
.bk li {{ font-size:10.8pt; line-height:1.34; padding:.022in 0 .022in .14in; text-indent:-.14in; }}
.bk li::before {{ content:"\\2013\\00a0"; color:var(--ox); }}
.bk p.tag {{ font-style:italic; font-size:14pt; line-height:1.28; color:var(--ox); margin:.14in 0 0; }}
.foot {{ position:absolute; bottom:.42in; left:.56in; width:3.0in; font-size:7.7pt; line-height:1.34; color:var(--soft); }}
.foot b {{ color:var(--ink); font-weight:600; letter-spacing:.02em; }}
</style></head><body>

<section class="panel" id="back">
  <div class="bk">
    <div class="topline"></div>
    <h2 class="serif">Which policy in your folder pays for memory care?</h2>
    <p class="serif">You spent thirty years building coverage so that nothing could land on your family as a bill. Then read the fine print on this line. Medicare doesn't cover custodial care if it's the only care you need. Where a policy or hybrid rider fits your plan, it funds part of the risk. No contract lowers the odds.</p>
    <p class="serif">This is a book about money before it is a book about health, and it is written to whoever holds the pen.</p>
    <div class="lab sans">Inside</div>
    <ul class="serif">
      <li>A ten-year ledger for one household, priced line by line, with sources and dates</li>
      <li>What Medicare, Medicaid, and a thinned-out insurance market leave on the table, and why your advisor's review matters more now</li>
      <li>The odds stated as odds, including the math that does not break even</li>
      <li>A 30-day plan that ends with an hour across the table from your advisor, attorney, or CPA</li>
    </ul>
    <p class="serif" style="margin-top:.13in">Nothing here prevents, treats, cures, or reverses dementia. The work may lower the odds. Your professionals fund and structure the risk. You need both.</p>
    <p class="tag serif">Don't lose your identity and your dignity while you still have a choice.</p>
  </div>
  <div class="foot sans">
    <b>Dr. TJ</b> is a health-span educator with more than thirty years in clinical practice. He does not provide medical care through this book.<br><br>
    Foreword by an estate planning attorney who discloses, in her first lines, that she is the author's sister-in-law.<br><br>
    Educational only. Not medical, legal, tax, insurance, or financial advice.<br>
    <b>My4MLife Press</b> &middot; my4mlife.com
  </div>
</section>

<section id="spine" class="sans">
  <div class="t" style="top:.62in">The Uninsured Decade</div>
  <div class="t" style="bottom:.62in">{AUTHOR}</div>
</section>

<section class="panel" id="front">
  <div class="kicker sans">A My4MLife Field Guide</div>
  <div class="ledger serif">
    <div class="head sans"><span>The risk</span><span>Who writes the check</span></div>
    <div class="row"><span>The house burns</span><span>Carrier</span></div>
    <div class="row"><span>A wreck, at fault</span><span>Carrier</span></div>
    <div class="row"><span>You die early</span><span>Carrier</span></div>
    <div class="row"><span>You can't work</span><span>Carrier</span></div>
    <div class="row"><span>A stay in the hospital</span><span>Carrier</span></div>
    <div class="row last"><span>Ten years of dementia care</span><span class="blank"></span></div>
  </div>
  <div class="title serif">
    <div class="the">The</div>
    <div class="big">Uninsured</div>
    <div class="big">Decade</div>
  </div>
  <div class="oxrule"></div>
  <div class="sub serif">{SUBTITLE}</div>
  <div class="by">
    <div class="a serif">{AUTHOR}</div>
    <div class="f sans">{FOREWORD}</div>
  </div>
</section>
</body></html>
"""

out_html = HERE / "full-wrap-paperback-6x9-draft.html"
out_pdf = HERE / "full-wrap-paperback-6x9-draft.pdf"
out_html.write_text(html, encoding="utf-8")
subprocess.run([CHROME, "--headless=new", "--no-pdf-header-footer", f"--print-to-pdf={out_pdf}", out_html.as_uri()],
               check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

doc = fitz.open(out_pdf)
page = doc[0]
pt = 72.0
print(f"pages={args.pages} spine={spine}in wrap={W}x{H}in pdf_pages={len(doc)} pdf_size={page.rect.width/pt:.4f}x{page.rect.height/pt:.4f}in")
print("fonts:", sorted({f[3].split('+')[-1] for f in page.get_fonts()}))
# Measure spine ink so a re-spin shows whether it keeps KDP's 0.0625 in on each side.
s0 = BLEED + TRIM_W
pix = page.get_pixmap(dpi=500, colorspace=fitz.csGRAY, clip=fitz.Rect((s0 - .02) * pt, .2 * pt, (s0 + spine + .02) * pt, 9.05 * pt))
xs = [x for y in range(pix.height) for x, v in enumerate(pix.samples[y * pix.stride:y * pix.stride + pix.width]) if v < 150]
if xs:
    left = s0 - .02 + min(xs) / 500 - s0
    right = s0 + spine - (s0 - .02 + max(xs) / 500)
    print(f"spine type {SPINE_PT}pt, clear space left={left:.4f}in right={right:.4f}in (KDP asks 0.0625)")
front = fitz.Rect(FRONT_X * pt, BLEED * pt, (FRONT_X + TRIM_W) * pt, (BLEED + TRIM_H) * pt)
page.get_pixmap(dpi=170, clip=front).save(HERE / "front-draft.png")
page.get_pixmap(dpi=120).save(HERE / "full-wrap-draft.png")
tmp = HERE / "_e.png"
page.get_pixmap(dpi=267, clip=front).save(tmp)
Image.open(tmp).convert("RGB").resize((1600, 2400)).save(HERE / "ebook-cover-draft.jpg", quality=92)
tmp.unlink()
