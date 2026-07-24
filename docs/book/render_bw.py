#!/usr/bin/env python3
"""Produce a black-ink-optimized HTML from the already-rendered color _MASTER.html.

Content, structure, and chapter emblems are left byte-for-byte identical — only the
embedded stylesheet is swapped: all brand colors become black/gray, and the emblem
SVGs get a deliberate grayscale+contrast treatment so they print cleanly on a
black-ink KDP paperback interior (author print cost ~$4 vs ~$18 color).

Run:  python3 render_bw.py   →  writes draft/_MASTER-bw.html
Then print that HTML to PDF via headless Chrome (see commit / kit).
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
src = (ROOT / 'draft' / '_MASTER.html').read_text(encoding='utf-8')

# Black-ink stylesheet — mirrors the color layout exactly, colors flattened to grayscale.
BW_CSS = """
@page {
  size: 6in 9in;
  margin: 0.75in 0.7in 0.85in 0.7in;
  @bottom-center {
    content: counter(page);
    font-family: 'Inter', sans-serif;
    font-size: 9pt;
    color: #444;
  }
}

body {
  font-family: 'Georgia', 'Source Serif Pro', 'Times New Roman', serif;
  font-size: 11pt;
  line-height: 1.55;
  color: #000;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  hyphens: auto;
}

h1, h2, h3, h4 {
  font-family: 'Georgia', 'Playfair Display', serif;
  color: #000;
  line-height: 1.15;
  page-break-after: avoid;
}

h1 {
  font-size: 28pt;
  font-weight: 700;
  margin: 2em 0 0.5em;
  text-align: center;
  page-break-before: always;
  color: #000;
  letter-spacing: 0.01em;
}

/* Ornamental rule beneath every chapter title — mid-gray for black ink */
h1::after {
  content: "";
  display: block;
  width: 64px;
  height: 3px;
  background: #000;
  margin: 0.5em auto 0;
  border-radius: 2px;
}

/* Drop cap opening each chapter */
h1 + p::first-letter {
  float: left;
  font-family: 'Georgia', 'Playfair Display', serif;
  font-size: 3.4em;
  line-height: 0.78;
  font-weight: 700;
  color: #000;
  padding: 0.02em 0.1em 0 0;
}

body > h1:first-of-type {
  page-break-before: avoid;
  font-size: 42pt;
  margin-top: 1in;
}

body > h1:first-of-type + p::first-letter {
  float: none;
  font-size: inherit;
  line-height: inherit;
  font-weight: inherit;
  color: inherit;
  padding: 0;
}

/* Chapter emblem — deliberate grayscale so colored line-art prints as clean ink. */
.chap-emblem {
  page-break-before: always;
  page-break-after: avoid;
  text-align: center;
  margin: 0.3em 0 0;
}
.chap-emblem svg {
  width: 1.5in;
  height: 1.5in;
  filter: grayscale(100%) contrast(115%) brightness(96%);
}
.chap-emblem + h1 {
  page-break-before: avoid;
  margin-top: 0.15em;
}

h2 {
  font-size: 18pt;
  font-weight: 700;
  margin: 1.8em 0 0.5em;
  border-bottom: 1px solid #666;
  padding-bottom: 0.2em;
}

h2 + h3, h1 + h2 {
  page-break-before: avoid;
}

h3 {
  font-size: 14pt;
  font-weight: 600;
  margin: 1.4em 0 0.4em;
  color: #000;
}

h4 {
  font-size: 12pt;
  font-weight: 700;
  margin: 1em 0 0.3em;
  color: #000;
}

p {
  margin: 0 0 0.85em;
  text-align: justify;
}

blockquote {
  margin: 1.2em 1.5em;
  padding: 0.4em 1em;
  border-left: 3px solid #000;
  font-style: italic;
  color: #111;
  background: #f0f0f0;
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
  border-top: 2px solid #000;
  width: 38%;
  margin: 2.2em auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  page-break-inside: avoid;
  font-size: 9.5pt;
}

th, td {
  border: 1px solid #999;
  padding: 5px 7px;
  text-align: center;
}

th {
  background: #e6e6e6;
  font-family: 'Georgia', serif;
  font-weight: 700;
  color: #000;
}

td:first-child, th:first-child {
  text-align: left;
}

.title-page {
  page-break-after: always;
  text-align: center;
  padding-top: 2in;
}

/* Bold text — black (weight carries emphasis in a black-ink interior) */
strong {
  color: #000;
}

em { color: inherit; }

a {
  color: #000;
  text-decoration: none;
}

code {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 9.5pt;
  background: #eee;
  padding: 0 0.2em;
}
"""

# Swap only the stylesheet; leave all body content (and emblems) untouched.
out, n = re.subn(r'<style>.*?</style>', '<style>' + BW_CSS + '</style>', src,
                 count=1, flags=re.DOTALL)
assert n == 1, f"expected exactly one <style> block, replaced {n}"

dst = ROOT / 'draft' / '_MASTER-bw.html'
dst.write_text(out, encoding='utf-8')
print(f"Wrote {dst}")
