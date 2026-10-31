#!/usr/bin/env python3
"""Render docs/book-cys/draft/_MASTER.md to a print-ready 6x9 PDF.

  python3 render.py                     # HTML only  -> draft/_MASTER.html
  python3 render.py --pdf OUT.pdf       # HTML + headless-Chrome PDF
  python3 render.py --pdf OUT.pdf --bw  # grayscale palette for a black-and-white KDP interior

With --pdf, if PyMuPDF (`fitz`) is importable, a second pass reads the PDF outline
and writes real page numbers into the table of contents. Needs: `markdown`; Chrome.
"""
import argparse
import markdown
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent
md_path = ROOT / 'draft' / '_MASTER.md'
html_path = ROOT / 'draft' / '_MASTER.html'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

ap = argparse.ArgumentParser()
ap.add_argument('--pdf', help='write a PDF here via headless Chrome')
ap.add_argument('--bw', action='store_true', help='grayscale palette (B&W interior)')
args = ap.parse_args()

md_text = md_path.read_text(encoding='utf-8')


def preprocess(text):
    """Turn typed underscore blanks into real write-in rules.

    Raw underscore runs collide with Markdown emphasis (they rendered as tiny
    bold fragments in v2), and a line of underscores alone becomes an <hr>.
    """
    out = []
    for line in text.split('\n'):
        stripped = line.strip()
        if stripped == '&nbsp;':
            continue  # spacing now comes from .writeline
        if re.fullmatch(r'_{10,}', stripped):
            out.append('<div class="writeline"></div>')
            continue
        runs = re.findall(r'_{4,}', line)
        pairs = re.findall(r'(\*\*[^*]+\*\*)\s*_{4,}', line)
        if len(pairs) >= 2 and re.fullmatch(r'(\s*\*\*[^*]+\*\*\s*_{4,}\s*)+', line):
            # "**Weekly weigh-in:** ___ **Streak at week's end:** ___" -> one row each
            for label in pairs:
                out += [label + ' <span class="fill grow"></span>', '{: .writein .row }', '']
            continue
        if stripped.startswith('**') and len(runs) == 1 and re.search(r'_{4,}\s*$', line):
            cls = '.writein'
            if re.match(r'\*\*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\*\*', stripped):
                cls += ' .daily'
            out.append(re.sub(r'\s*_{4,}\s*$', ' <span class="fill grow"></span>', line))
            out.append('{: ' + cls + ' }')
            continue
        out.append(re.sub(r'_{4,}', '<span class="fill"></span>', line))
    return '\n'.join(out)


def build_body(toc_pages=None):
    body = markdown.markdown(
        preprocess(md_text),
        extensions=['extra', 'sane_lists', 'smarty', 'toc'],
        output_format='html5',
    )
    # Wrap each h1 and what follows in <section class="sec-ID"> so CSS can be scoped
    # per chapter (the flat body made sibling selectors leak across the book).
    parts = re.split(r'(?=<h1 id=")', body)
    wrapped = ['<section class="sec-prelude front">' + parts[0] + '</section>']
    for part in parts[1:]:
        sid = re.match(r'<h1 id="([^"]+)"', part).group(1)
        extra = ' front' if sid == 'count-yourself-skinny' else ''
        wrapped.append(f'<section class="sec-{sid}{extra}">' + part + '</section>')
        if sid == 'what-youll-count':
            # Blank, unnumbered verso so Chapter 1 opens on a right-hand page
            wrapped.append('<section class="front blank-page"><p>&nbsp;</p></section>')
    body = '\n'.join(wrapped)
    if toc_pages:
        body = add_toc_numbers(body, toc_pages)
    return body


def add_toc_numbers(body, pages):
    start = body.index('<section class="sec-what-youll-count">')
    end = body.index('</section>', start)
    toc = body[start:end]
    chap = iter(range(1, 100))

    def li(m):
        inner = m.group(1)
        text = re.sub(r'<[^>]+>', '', inner)
        if '—' in text:  # numbered chapter entry
            n = next(chap)
            pg = next((v for k, v in pages.items() if k.startswith(f'{n}.')), None)
        else:
            pg = pages.get(re.sub(r'\s+', '', text))
        if pg is None:
            return m.group(0)
        return f'<li><span class="toc-t">{inner}</span><span class="toc-p">{pg}</span></li>'

    toc = re.sub(r'<li>(.*?)</li>', li, toc, flags=re.S)
    return body[:start] + toc + body[end:]


html_body = build_body()

# ── Chapter emblems ──────────────────────────────────────────────────────────
# Small, colorful hand-drawn SVG illustrations injected above each chapter title.
# Keyed by the toc-generated h1 id prefix (chapter-1- … chapter-18-).
EMBLEMS = {}
for _slug, _svg in EMBLEMS.items():
    _needle = '<h1 id="' + _slug
    _idx = html_body.find(_needle)
    if _idx != -1:
        html_body = html_body[:_idx] + '<div class="chap-emblem">' + _svg + '</div>' + html_body[_idx:]

CSS = """
@page {
  size: 6in 9in;
  margin: 0.75in 0.7in 0.85in 0.7in;
  @bottom-center {
    content: counter(page);
    font-family: 'Inter', sans-serif;
    font-size: 9pt;
    color: #888;
  }
}

/* NOTE: a previous `@page :first { margin: 0 }` made the first printed page full-bleed,
   so the title + front matter ran edge-to-edge while every later page used normal
   margins — an inconsistent, wider-then-narrower text block. Removed so all pages share
   the same margins. */

body {
  font-family: 'Georgia', 'Source Serif Pro', 'Times New Roman', serif;
  font-size: 11.5pt;
  line-height: 1.62;
  color: #1a1a1a;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  hyphens: auto;
}

h1, h2, h3, h4 {
  font-family: 'Georgia', 'Playfair Display', serif;
  color: #2B50C8;
  line-height: 1.15;
  page-break-after: avoid;
}

h1 {
  font-size: 28pt;
  font-weight: 700;
  margin: 2em 0 0.5em;
  text-align: center;
  page-break-before: always;
  color: #A6841C;
  letter-spacing: 0.01em;
}

/* Gold ornamental rule beneath every chapter title */
h1::after {
  content: "";
  display: block;
  width: 64px;
  height: 3px;
  background: #d4af5a;
  margin: 0.5em auto 0;
  border-radius: 2px;
}

/* Contain the drop cap so a one-line opening paragraph doesn't indent the next one */
h1 + p { display: flow-root; }

/* Gold drop cap opening each chapter */
h1 + p::first-letter {
  float: left;
  font-family: 'Georgia', 'Playfair Display', serif;
  font-size: 3.4em;
  line-height: 0.78;
  font-weight: 700;
  color: #A6841C;
  padding: 0.02em 0.1em 0 0;
}

/* The first h1 (title page) shouldn't force a page break before */
.sec-count-yourself-skinny > h1 {
  page-break-before: avoid;
  font-size: 42pt;
  margin-top: 1in;
}

/* Title page should not get a chapter drop cap */
.sec-count-yourself-skinny > h1 + p::first-letter {
  float: none;
  font-size: inherit;
  line-height: inherit;
  font-weight: inherit;
  color: inherit;
  padding: 0;
}

/* Chapter emblem — the colorful SVG illustration above each chapter title.
   Carries the page break so the chapter starts on a fresh page with the emblem
   on top, and keeps the title attached right below it. */
.chap-emblem {
  page-break-before: always;
  page-break-after: avoid;
  text-align: center;
  margin: 0.3em 0 0;
}
.chap-emblem svg {
  width: 1.5in;
  height: 1.5in;
}
.chap-emblem + h1 {
  page-break-before: avoid;
  margin-top: 0.15em;
}

h2 {
  font-size: 18pt;
  font-weight: 700;
  margin: 1.8em 0 0.5em;
  border-bottom: 1px solid #d4af5a;
  padding-bottom: 0.2em;
}

/* Chapter h1s break before; section h2s don't */
h2 + h3, h1 + h2 {
  page-break-before: avoid;
}

h3 {
  font-size: 14pt;
  font-weight: 600;
  margin: 1.4em 0 0.4em;
  color: #2B50C8;
}

h4 {
  font-size: 12pt;
  font-weight: 700;
  margin: 1em 0 0.3em;
  color: #2B50C8;
}

p {
  margin: 0 0 0.85em;
  text-align: justify;
}

blockquote {
  margin: 1.2em 1.5em;
  padding: 0.4em 1em;
  border-left: 3px solid #d4af5a;
  font-style: italic;
  color: #333;
  background: #fbf7ec;
  page-break-inside: avoid;
}

ul, ol {
  margin: 0.6em 0 1em 1.4em;
  padding: 0;
}

li {
  margin: 0.25em 0;
}

hr {
  border: none;
  border-top: 2px solid #d4af5a;
  width: 38%;
  margin: 2.2em auto;
}

/* Tables (for the scorecard) */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  page-break-inside: avoid;
  font-size: 9.5pt;
}

th, td {
  border: 1px solid #ccc;
  padding: 5px 7px;
  text-align: center;
}

th {
  background: #f3e8c8;
  font-family: 'Georgia', serif;
  font-weight: 700;
  color: #0a1628;
}

td:first-child, th:first-child {
  text-align: left;
}

/* Title page */
.title-page {
  page-break-after: always;
  text-align: center;
  padding-top: 2in;
}

/* Strong / emphasis — royal blue everywhere text is bolded (chapter titles + drop caps stay gold) */
strong {
  color: #2B50C8;
}

em {
  color: inherit;
}

a {
  color: #1a3656;
  text-decoration: none;
}

/* Count Log: each week opens on its own page with a roomy, writable layout */
h2[id^="week-"], h2[id^="before-week"], h2[id^="after-week"] {
  page-break-before: always;
  border-bottom: none;
  text-align: center;
  font-size: 21pt;
  margin-top: 0;
}
h2[id^="week-"]::after, h2[id^="before-week"]::after, h2[id^="after-week"]::after {
  content: "";
  display: block;
  width: 64px;
  height: 3px;
  background: #d4af5a;
  margin: 0.4em auto 0;
  border-radius: 2px;
}
h2[id^="week-"] ~ table td, h2[id^="before-week"] ~ table td {
  padding: 6px 7px;
}
h2[id^="week-"] + p, h2[id^="before-week"] + p, h2[id^="after-week"] + p {
  text-align: center;
  font-style: italic;
  margin: 0.4em auto 0.8em;
  max-width: 4.6in;
}

/* Daily-notes h3 gets its own page (second page of each week's spread) */
h3[id^="this-weeks-daily-notes"] {
  page-break-before: always;
  text-align: center;
  font-size: 16pt;
  margin-top: 0.8em;
}
/* Write-in blanks (made from typed underscores by preprocess()) */
.fill {
  display: inline-block;
  width: 1.15in;
  border-bottom: 1px solid #777;
  height: 1.1em;
  vertical-align: baseline;
  margin-left: 0.2em;
}
p .fill { width: 0.7in; }
td .fill { width: 1.1in; }
td:not(:first-child) .fill { width: 0.75in; }
h2[id^="after-week"] + table td:first-child { min-width: 1.3in; }
h2[id^="week-"] ~ table td:first-child { white-space: nowrap; }
/* A prompt line ("The win this week:") gets a full-width writing line beneath it */
p.writein { text-align: left; margin: 0.7em 0 0.5em; }
p.writein .fill.grow { display: block; width: 100%; height: 1.5em; margin: 0; }
/* Daily notes: label and line share the row, spaced to fill the page */
p.writein.daily, p.writein.row { display: flex; align-items: baseline; gap: 0.4em; }
p.writein.daily { margin: 0 0 0.6in; }
p.writein.row { margin: 0.35em 0; }
p.writein.daily strong { flex: 0 0 0.5in; }
p.writein.daily .fill.grow, p.writein.row .fill.grow { flex: 1; width: auto; height: 1.1em; }
.writeline {
  border-bottom: 1px solid #777;
  height: 0.34in;
}
.sec-notes .writeline { height: 0.38in; }
.writeline + p { margin-top: 1.2em; }
/* Never hyphenate or split a web address */
a { hyphens: none; white-space: nowrap; }

/* FAQ: each question on its own line */
.sec-questions-people-actually-ask p > strong:first-child { display: block; margin-top: 0.6em; }

/* Front matter (half-title, also-by, title, copyright): no folios */
@page front {
  @bottom-center { content: none; }
}
section.front { page: front; }

.copyright p { font-size: 8.6pt; line-height: 1.45; margin-bottom: 0.7em; text-align: left; }

/* Table of contents with page numbers */
.sec-what-youll-count li { display: flex; align-items: baseline; gap: 0.5em; }
.sec-what-youll-count .toc-t { flex: 1; }
.sec-what-youll-count .toc-p { min-width: 1.6em; text-align: right; font-variant-numeric: tabular-nums; }
.sec-what-youll-count ul, .sec-what-youll-count ol { list-style: none; margin-left: 0; }
.sec-what-youll-count ol { counter-reset: ch; }
.sec-what-youll-count ol li { counter-increment: ch; }
.sec-what-youll-count ol li::before { content: counter(ch) "."; flex: 0 0 1.4em; color: #A6841C; font-weight: 700; }
.sec-what-youll-count li { font-size: 10.5pt; line-height: 1.38; margin: 0.22em 0; }
.sec-what-youll-count > h1 { margin-top: 0.4em; }
.sec-what-youll-count p { margin: 0.6em 0 0.2em; }
.blank-page { page-break-before: always; }

/* Title page: centered, no rule under the subtitle */
.sec-count-yourself-skinny > h2 { border-bottom: none; text-align: center; font-size: 15pt; font-style: italic; font-weight: 400; }
.sec-count-yourself-skinny > p { text-align: center; }

/* No drop cap on an all-italic intro line (Science, Sources) */
h1 + p:has(> em:only-child)::first-letter {
  float: none; font-size: inherit; line-height: inherit; font-weight: inherit; color: inherit; padding: 0;
}

/* Sources */
ol.sources { font-size: 9pt; line-height: 1.45; margin-left: 1.2em; }
ol.sources li { margin: 0 0 0.45em; text-align: left; }

/* Science appendix: one count per page */
h3[id^="the-chew-chapter"], h3[id^="the-space-chapter"], h3[id^="the-steps-chapter"],
h3[id^="the-light-chapter"], h3[id^="the-nights-chapter"], h3[id^="the-water-chapter"],
h3[id^="the-streak-chapter"] {
  page-break-before: always;
  font-size: 17pt;
  text-align: center;
  margin-top: 1em;
}

code {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 9.5pt;
  background: #f5f3ec;
  padding: 0 0.2em;
}
"""

if args.bw:
    for a, b in [('#2B50C8', '#111111'), ('#A6841C', '#111111'), ('#d4af5a', '#8a8a8a'),
                 ('#f3e8c8', '#e4e4e4'), ('#fbf7ec', '#f1f1f1'), ('#1a3656', '#111111'),
                 ('#0a1628', '#111111'), ('#1a1a1a', '#000000'), ('#888', '#555')]:
        CSS = CSS.replace(a, b)


def write_html(body):
    html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Count Yourself Skinny</title>
<style>{CSS}</style>
</head>
<body>
{body}
</body>
</html>
"""
    html_path.write_text(html_doc, encoding='utf-8')
    print(f"Wrote {html_path}")


def chrome_pdf(out):
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
                    '--generate-pdf-document-outline', f'--print-to-pdf={out}',
                    html_path.as_uri()], check=True, capture_output=True)
    print(f"Wrote {out}")


write_html(html_body)
if args.pdf:
    chrome_pdf(args.pdf)
    try:
        import fitz  # PyMuPDF
    except ImportError:
        fitz = None
        print('PyMuPDF not available: table of contents left without page numbers')
    if fitz:
        doc = fitz.open(args.pdf)
        pages = {}
        for _lvl, title, pg in doc.get_toc():
            # Chrome drops the space where a heading wrapped, so compare without whitespace
            pages.setdefault(re.sub(r'\s+', '', title), pg)
        doc.close()
        write_html(build_body(pages))
        chrome_pdf(args.pdf)
