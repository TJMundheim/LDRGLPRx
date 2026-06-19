#!/usr/bin/env python3
"""Render the assembled master.md to a styled HTML for Chrome PDF conversion."""
import markdown
import sys
import re
import pathlib

ROOT = pathlib.Path('/Users/thomasmundheim/Desktop/Development/LDRGLPRx/docs/book')
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
EMBLEMS = {
  "chapter-1-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="10" width="36" height="4" rx="2" fill="#2B50C8"/><rect x="18" y="58" width="36" height="4" rx="2" fill="#2B50C8"/><path d="M23 14Q23 30 36 36Q49 30 49 14Z" fill="#cdd9ff" stroke="#2B50C8" stroke-width="2"/><path d="M23 58Q23 42 36 36Q49 42 49 58Z" fill="#cdd9ff" stroke="#2B50C8" stroke-width="2"/><path d="M27 52Q36 47 45 52L45 56L27 56Z" fill="#d4af5a"/><path d="M34 37h4l-2 7z" fill="#d4af5a"/></svg>',
  "chapter-2-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><path d="M6 56L26 24L38 42L46 30L66 56Z" fill="#2B50C8"/><path d="M26 24L33 36L19 36Z" fill="#ffffff" opacity=".6"/><line x1="26" y1="24" x2="26" y2="12" stroke="#7a5c12" stroke-width="2"/><path d="M26 12L38 15L26 18Z" fill="#d4af5a"/></svg>',
  "chapter-3-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><circle cx="36" cy="40" r="20" fill="#dbe4ff" stroke="#2B50C8" stroke-width="2.5"/><line x1="22" y1="22" x2="16" y2="15" stroke="#2B50C8" stroke-width="3" stroke-linecap="round"/><line x1="50" y1="22" x2="56" y2="15" stroke="#2B50C8" stroke-width="3" stroke-linecap="round"/><line x1="36" y1="40" x2="36" y2="29" stroke="#d4af5a" stroke-width="2.5" stroke-linecap="round"/><line x1="36" y1="40" x2="45" y2="44" stroke="#d4af5a" stroke-width="2.5" stroke-linecap="round"/><circle cx="36" cy="40" r="2" fill="#2B50C8"/></svg>',
  "chapter-4-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><circle cx="36" cy="15" r="9" fill="#3d63d6"/><path d="M30 15q6-4 12 0" stroke="#d4af5a" stroke-width="1.4" fill="none"/><line x1="36" y1="24" x2="36" y2="30" stroke="#caa84e" stroke-width="2"/><path d="M26 32q-8 0-8 9 0 9 9 9 7 0 7-6 0-6 7-6 8 0 8 8 0 8-8 8" fill="none" stroke="#E06A8A" stroke-width="5" stroke-linecap="round"/></svg>',
  "chapter-5-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><path d="M46 12a22 22 0 1 0 14 38A18 18 0 0 1 46 12z" fill="#2B50C8"/><circle cx="24" cy="20" r="1.8" fill="#d4af5a"/><circle cx="18" cy="34" r="1.4" fill="#d4af5a"/><circle cx="30" cy="44" r="1.6" fill="#d4af5a"/></svg>',
  "chapter-6-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><g stroke="#f0a500" stroke-width="3" stroke-linecap="round"><line x1="36" y1="6" x2="36" y2="14"/><line x1="36" y1="58" x2="36" y2="66"/><line x1="6" y1="36" x2="14" y2="36"/><line x1="58" y1="36" x2="66" y2="36"/><line x1="15" y1="15" x2="20" y2="20"/><line x1="52" y1="52" x2="57" y2="57"/><line x1="57" y1="15" x2="52" y2="20"/><line x1="20" y1="52" x2="15" y2="57"/></g><circle cx="36" cy="36" r="15" fill="#ffd21f" stroke="#f0a500" stroke-width="2"/></svg>',
  "chapter-7-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><path d="M36 6v5" stroke="#7a5c12" stroke-width="2" fill="none"/><circle cx="36" cy="5" r="2.6" fill="none" stroke="#7a5c12" stroke-width="2"/><path d="M13 27Q36 7 59 27" fill="#fffdf5" stroke="#7a5c12" stroke-width="2"/><rect x="13" y="27" width="46" height="32" rx="3" fill="#fffdf5" stroke="#7a5c12" stroke-width="2"/><g stroke="#caa84e" stroke-width="1.4"><line x1="22" y1="27" x2="22" y2="59"/><line x1="30" y1="27" x2="30" y2="59"/><line x1="42" y1="27" x2="42" y2="59"/><line x1="50" y1="27" x2="50" y2="59"/><line x1="36" y1="13" x2="36" y2="27"/></g><line x1="20" y1="50" x2="52" y2="50" stroke="#9b7d2e" stroke-width="2"/><ellipse cx="35" cy="43" rx="10" ry="8.5" fill="#ffd21f"/><circle cx="43" cy="38" r="5.6" fill="#ffd21f"/><path d="M28 42q7 5 13 1" fill="#f2b705" opacity=".85"/><path d="M48.5 38l5.5 1.6-5.5 1.6z" fill="#f08a00"/><circle cx="44.6" cy="37" r="1.2" fill="#222"/><path d="M25 43l-7 2 4-5z" fill="#f2b705"/><g stroke="#f08a00" stroke-width="1.3"><line x1="33" y1="50.5" x2="33" y2="54"/><line x1="39" y1="50.5" x2="39" y2="54"/></g><rect x="10" y="58" width="52" height="6" rx="2" fill="#7a5c12"/></svg>',
  "chapter-8-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><path d="M24 12h24l-3 16a9 9 0 0 1-18 0z" fill="#dbe4ff" stroke="#2B50C8" stroke-width="2"/><path d="M27 17h18l-1.6 8a7.4 7.4 0 0 1-14.8 0z" fill="#b3243b"/><line x1="36" y1="40" x2="36" y2="56" stroke="#2B50C8" stroke-width="2.5"/><rect x="26" y="56" width="20" height="4" rx="2" fill="#2B50C8"/></svg>',
  "chapter-9-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><path d="M36 58V34" stroke="#3a7d2c" stroke-width="3" stroke-linecap="round"/><path d="M36 40q-14-2-18-14 14 0 18 12z" fill="#5bbf4a"/><path d="M36 34q14-2 18-16-16 0-18 14z" fill="#7fd96a"/><path d="M26 58h20" stroke="#8a6d3b" stroke-width="3" stroke-linecap="round"/></svg>',
  "chapter-10-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><path d="M36 16q18-4 20 14 4 18-12 22-20 6-26-10-6-22 18-26z" fill="#fffdf3" stroke="#ece2c4" stroke-width="1.5"/><circle cx="38" cy="36" r="9" fill="#ffc21f"/></svg>',
  "chapter-11-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="20" width="44" height="36" rx="5" fill="#dbe4ff" stroke="#2B50C8" stroke-width="2.5"/><path d="M28 46a8 8 0 0 1 16 0z" fill="#ffffff" stroke="#2B50C8" stroke-width="1.5"/><line x1="36" y1="46" x2="42" y2="39" stroke="#d4af5a" stroke-width="2.5" stroke-linecap="round"/><circle cx="36" cy="46" r="2" fill="#2B50C8"/></svg>',
  "chapter-12-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="30" width="12" height="12" rx="2" fill="#E05C2A"/><rect x="14" y="24" width="8" height="24" rx="2" fill="#b34418"/><rect x="50" y="24" width="8" height="24" rx="2" fill="#b34418"/><rect x="8" y="28" width="7" height="16" rx="2" fill="#E05C2A"/><rect x="57" y="28" width="7" height="16" rx="2" fill="#E05C2A"/><rect x="20" y="34" width="12" height="4" fill="#b34418"/><rect x="40" y="34" width="12" height="4" fill="#b34418"/></svg>',
  "chapter-13-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><circle cx="36" cy="36" r="24" fill="#2B50C8"/><circle cx="36" cy="36" r="17" fill="#ffffff"/><circle cx="36" cy="36" r="11" fill="#2B50C8"/><circle cx="36" cy="36" r="5" fill="#E05C2A"/></svg>',
  "chapter-14-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><path d="M36 20q-10-6-22-4v34q12-2 22 4z" fill="#2B50C8"/><path d="M36 20q10-6 22-4v34q-12-2-22 4z" fill="#3d63d6"/><g stroke="#d4af5a" stroke-width="1.2" opacity=".85"><line x1="18" y1="26" x2="31" y2="28"/><line x1="18" y1="32" x2="31" y2="34"/><line x1="41" y1="28" x2="54" y2="26"/><line x1="41" y1="34" x2="54" y2="32"/></g></svg>',
  "chapter-15-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><path d="M28 14c-8 0-13 6-12 13-5 2-7 8-3 13-3 5 0 12 7 12 2 4 8 5 11 2V16c-2-2-7-2-3-2z" fill="#2B50C8" opacity=".9"/><path d="M44 14c8 0 13 6 12 13 5 2 7 8 3 13 3 5 0 12-7 12-2 4-8 5-11 2V16c2-2 4-2 3-2z" fill="#3d63d6"/><g stroke="#d4af5a" stroke-width="1.6" fill="none" opacity=".9"><path d="M36 20v34"/><path d="M30 28q6 3 12 0"/><path d="M30 40q6 3 12 0"/></g></svg>',
  "chapter-16-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(-35 36 30)"><rect x="17" y="22" width="38" height="16" rx="8" fill="#3d63d6"/><rect x="17" y="22" width="19" height="16" rx="8" fill="#d4af5a"/></g><g transform="rotate(22 38 52)"><rect x="22" y="45" width="34" height="14" rx="7" fill="#E05C2A"/><rect x="22" y="45" width="17" height="14" rx="7" fill="#ffd21f"/></g></svg>',
  "chapter-17-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><path d="M54 26a22 22 0 1 0 3 16" fill="none" stroke="#2B50C8" stroke-width="5" stroke-linecap="round"/><path d="M54 14l3 13-13-3z" fill="#d4af5a"/></svg>',
  "chapter-18-": '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="34" cy="44" rx="11" ry="15" fill="#2B50C8"/><circle cx="25" cy="24" r="3.4" fill="#d4af5a"/><circle cx="32" cy="20" r="3.6" fill="#d4af5a"/><circle cx="40" cy="20" r="3.2" fill="#d4af5a"/><circle cx="46" cy="24" r="2.8" fill="#d4af5a"/></svg>',
}
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
  font-size: 11pt;
  line-height: 1.55;
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
<title>Begin with the End in Mind</title>
<style>{CSS}</style>
</head>
<body>
{html_body}
</body>
</html>
"""

html_path.write_text(html_doc, encoding='utf-8')
print(f"Wrote {html_path}")
