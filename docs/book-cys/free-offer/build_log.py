#!/usr/bin/env python3
"""Build count-log-week-13-on.pdf (free printable weekly Count Log, US Letter, B&W).

  python3 build_log.py
Rows mirror "Week 12" in ../draft/_MASTER.md; styling mirrors ../render.py. Needs Chrome.
"""
import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
OUT = HERE / 'count-log-week-13-on.pdf'
HTML = HERE / 'count-log-week-13-on.html'

FOOTER = ("Educational only, not medical advice. Talk with your clinician before changing "
          "when you eat, especially if you take medication, have diabetes, are pregnant, "
          "or have a history of disordered eating.")

ROWS = ["Morning walk", "32 chews, fork down", "Overnight hours: 14–16", "3 hours before bed",
        "Steps: 8,000+", "10 min morning light", "2 glasses before noon", "7+ hours last night"]
DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

box = '<td><span class="box"></span></td>' * 7
rows = ''.join(f'<tr><td>{r}</td>{box}</tr>' for r in ROWS)
rows += f'<tr class="hit"><td><strong>Hit my counts today</strong></td>{box}</tr>'
head = ''.join(f'<th>{d}</th>' for d in DAYS)
notes = ''.join(f'<div class="note"><strong>{d}</strong><span class="line"></span></div>' for d in DAYS)

COUNTS = [
    ("Chews", "32 per bite, fork down between bites", "Every meal"),
    ("Hours between meals", "Overnight space of 12, then 14, then 16; last bite 3 hours before bed", "Overnight and evening"),
    ("Steps", "Keep your floor, build toward 8,000 and beyond", "All day"),
    ("Morning light", "10 minutes outside", "First hour awake"),
    ("Water", "2 glasses before noon, the first before coffee", "Morning"),
    ("Nights", "7 hours, 7 nights a week", "Weekly"),
]
crows = ''.join(f'<tr><td><strong>{a}</strong></td><td>{b}</td><td>{c}</td></tr>' for a, b, c in COUNTS)

CSS = """
@page { size: 8.5in 11in; margin: 0.5in 0.6in; }
* { box-sizing: border-box; }
body { font-family: Georgia, 'Times New Roman', serif; color: #000; font-size: 11pt; margin: 0; }
.page { height: 9.95in; position: relative; page-break-after: always; display: flex; flex-direction: column; }
.page:last-child { page-break-after: auto; }
h1 { font-size: 20pt; text-align: center; margin: 0 0 4px; }
.rule { width: 64px; height: 3px; background: #000; margin: 6px auto 8px; border-radius: 2px; }
.tip { text-align: center; font-style: italic; margin: 0 0 8px; font-size: 10.5pt; }
.weekline { display: flex; align-items: baseline; justify-content: center; gap: 8px; font-size: 14pt; font-weight: 700; margin: 4px 0 8px; }
.weekline .fill { display: inline-block; width: 1in; border-bottom: 1.2px solid #000; height: 1em; }
table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
th, td { border: 1px solid #000; padding: 0 7px; text-align: center; height: 0.37in; }
th { font-weight: 700; background: #fff; border-bottom: 2px solid #000; }
td:first-child, th:first-child { text-align: left; white-space: nowrap; }
tr.hit td { border-top: 2px solid #000; }
.box { display: inline-block; width: 0.2in; height: 0.2in; border: 1.3px solid #000; vertical-align: middle; }
.row { display: flex; align-items: flex-end; gap: 8px; margin-top: 11px; }
.row .line, .note .line { flex: 1; border-bottom: 1px solid #000; height: 0.3in; }
.row.big .line { height: 0.34in; }
.two { display: flex; gap: 24px; margin-top: 4px; }
.two .row { flex: 1; }
h2 { font-size: 12.5pt; margin: 14px 0 0; }
.sub { font-style: italic; font-size: 9.5pt; margin: 1px 0 0; }
.note { display: flex; align-items: flex-end; gap: 10px; margin-top: 3px; }
.note strong { width: 0.45in; }
.note .line { height: 0.31in; }
.foot { margin-top: auto; border-top: 1px solid #000; padding-top: 5px; font-size: 8.5pt; text-align: center; }
.rem table td { text-align: left; height: 0.55in; font-size: 11.5pt; padding: 4px 9px; white-space: normal; }
.rem th { text-align: left; }
.rem .lead { text-align: center; margin: 4px 0 14px; }
.rem .small { margin-top: 16px; font-size: 11pt; }
"""

HTML_DOC = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Count Log, Week 13 and Beyond</title>
<style>{CSS}</style></head><body>
<div class="page">
  <h1>Weekly Count Log</h1><div class="rule"></div>
  <p class="tip">Print as many as you need.</p>
  <div class="weekline">Week <span class="fill"></span> &nbsp; Starting <span class="fill" style="width:1.6in"></span></div>
  <table><tr><th>Count</th>{head}</tr>{rows}</table>
  <div class="two">
    <div class="row"><strong>Weekly weigh-in:</strong><span class="line"></span></div>
    <div class="row"><strong>Streak at week's end:</strong><span class="line"></span></div>
  </div>
  <div class="row big"><strong>The win this week:</strong><span class="line"></span></div>
  <div class="row big"><strong>The hardest moment, and what I'll do differently:</strong></div>
  <div class="row big"><span class="line"></span></div>
  <h2>This week's daily notes</h2>
  <p class="sub">One honest line a day: what you ate slowest, where the day fought back, what you noticed.</p>
  {notes}
  <div class="foot">{FOOTER}</div>
</div>
<div class="page rem">
  <h1>The Six Counts</h1><div class="rule"></div>
  <p class="lead"><em>Keep this page where you can see it. Photograph it. Stick it on the refrigerator.</em></p>
  <table><tr><th>The Count</th><th>The Number</th><th>When</th></tr>{crows}</table>
  <p class="small"><strong>The stack:</strong> one morning walk before breakfast checks several boxes at once: steps, light, your overnight space, last night's sleep, and your water.</p>
  <p class="small"><strong>Weigh-in:</strong> once a week, same scale, same morning. It is a plain note, not a target.</p>
  <p class="small"><strong>The streak:</strong> days in a row. Never miss twice.</p>
  <p class="small"><strong>The promise:</strong> you do not count calories, macros, points, grams, money, reps, or forbidden foods.</p>
  <p class="small">More at my4mlife.com</p>
  <div class="foot">{FOOTER}</div>
</div>
</body></html>"""

HTML.write_text(HTML_DOC, encoding='utf-8')
subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
                f'--print-to-pdf={OUT}', HTML.as_uri()], check=True, capture_output=True)
HTML.unlink()
import fitz
d = fitz.open(OUT)
print(OUT, 'pages:', len(d))
for i, p in enumerate(d):
    p.get_pixmap(dpi=80).save(f'/private/tmp/claude-501/-Users-thomasmundheim-Development-LDRGLPRx/4c489dfa-5556-4a5c-8e6e-bca91a2ccd45/scratchpad/p{i+1}.png')
