#!/usr/bin/env python3
"""Render the assembled master.md to a styled HTML for Chrome PDF conversion."""
import markdown
import sys
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
  margin-top: 2.5in;
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
