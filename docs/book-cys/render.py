#!/usr/bin/env python3
"""Render the assembled master.md to a styled HTML for Chrome PDF conversion."""
import markdown
import sys
import re
import pathlib

ROOT = pathlib.Path('/Users/thomasmundheim/Development/LDRGLPRx/docs/book-cys')
md_path = ROOT / 'draft' / '_MASTER.md'
html_path = ROOT / 'draft' / '_MASTER.html'

md_text = md_path.read_text(encoding='utf-8')

# Convert markdown → HTML
html_body = markdown.markdown(
    md_text,
    extensions=['extra', 'sane_lists', 'smarty', 'toc'],
    output_format='html5',
)

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
body > h1:first-of-type {
  page-break-before: avoid;
  font-size: 42pt;
  margin-top: 1in;
}

/* Title page should not get a chapter drop cap */
body > h1:first-of-type + p::first-letter {
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
  font-size: 22pt;
  margin-top: 0.6em;
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
  padding: 13px 7px;
}
h2[id^="week-"] + p, h2[id^="before-week"] + p, h2[id^="after-week"] + p {
  text-align: center;
  font-style: italic;
  margin: 0.4em auto 1.2em;
  max-width: 4.6in;
}

/* Daily-notes h3 gets its own page (right-hand page of each week's spread) */
h3[id^="this-week-s-daily-notes"] {
  page-break-before: always;
  text-align: center;
  font-size: 16pt;
  margin-top: 0.8em;
}
/* Write-in lines breathe */
h3[id^="this-week-s-daily-notes"] ~ p strong {
  display: inline-block;
  width: 0.55in;
}
h3[id^="this-week-s-daily-notes"] ~ p {
  margin-bottom: 1.5em;
  text-align: left;
}

/* FAQ + science: give each question/count room */
h1[id^="questions-people"] ~ p strong:first-child { display: block; margin-top: 0.6em; }

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

html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Count Yourself Skinny</title>
<style>{CSS}</style>
</head>
<body>
{html_body}
</body>
</html>
"""

html_path.write_text(html_doc, encoding='utf-8')
print(f"Wrote {html_path}")
