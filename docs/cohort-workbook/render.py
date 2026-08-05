#!/usr/bin/env python3
"""Render the assembled master.md to a styled HTML for Chrome PDF conversion."""
import markdown
import pathlib

ROOT = pathlib.Path('/Users/thomasmundheim/Development/LDRGLPRx/docs/cohort-workbook')
md_path = ROOT / 'draft' / '_MASTER.md'
html_path = ROOT / 'draft' / '_MASTER.html'

md_text = md_path.read_text(encoding='utf-8')

html_body = markdown.markdown(
    md_text,
    extensions=['extra', 'sane_lists', 'smarty', 'toc'],
    output_format='html5',
)

# Render empty markdown checkboxes ☐ ☑ as styled boxes
# Most ☐ characters render fine in the embedded font; ensure they're visible

CSS = """
@page {
  size: 7.5in 9.25in;
  margin: 0.7in 0.65in 0.85in 0.65in;
  @bottom-center {
    content: counter(page);
    font-family: 'Inter', sans-serif;
    font-size: 9pt;
    color: #888;
  }
}

@page :first {
  margin: 0;
}

body {
  font-family: 'Georgia', 'Source Serif Pro', 'Times New Roman', serif;
  font-size: 11pt;
  line-height: 1.55;
  color: #1a1a1a;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4 {
  font-family: 'Georgia', 'Playfair Display', serif;
  color: #0a1628;
  line-height: 1.15;
  page-break-after: avoid;
}

h1 {
  font-size: 30pt;
  font-weight: 700;
  margin: 2em 0 0.6em;
  page-break-before: always;
  letter-spacing: -0.01em;
}

body > h1:first-of-type {
  page-break-before: avoid;
  font-size: 46pt;
  margin-top: 2.5in;
  text-align: center;
  letter-spacing: -0.015em;
}

body > h1:first-of-type + h2 {
  font-size: 18pt;
  font-weight: 500;
  text-align: center;
  border: none;
  color: #d4af5a;
  font-style: italic;
  margin: 0 0 2em;
}

h2 {
  font-size: 17pt;
  font-weight: 700;
  margin: 1.6em 0 0.5em;
  border-bottom: 2px solid #d4af5a;
  padding-bottom: 0.2em;
}

h3 {
  font-size: 13.5pt;
  font-weight: 600;
  margin: 1.4em 0 0.4em;
  color: #1a3656;
}

h4 {
  font-size: 11.5pt;
  font-weight: 700;
  margin: 1em 0 0.3em;
  color: #1a3656;
}

p {
  margin: 0 0 0.85em;
  text-align: left;
}

blockquote {
  margin: 1.2em 1em;
  padding: 0.6em 1em;
  border-left: 3px solid #d4af5a;
  font-style: italic;
  color: #333;
  background: #fbf7ec;
  page-break-inside: avoid;
  border-radius: 0 4px 4px 0;
}

blockquote em, blockquote i { font-style: normal; }

ul, ol {
  margin: 0.6em 0 1em 1.4em;
  padding: 0;
}

li {
  margin: 0.3em 0;
}

hr {
  border: none;
  border-top: 1px solid #ccc;
  margin: 2em 0;
}

/* Workbook tables — trackers, scorecards */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  page-break-inside: avoid;
  font-size: 10pt;
}

th, td {
  border: 1px solid #aaa;
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}

th {
  background: #f3e8c8;
  font-family: 'Georgia', serif;
  font-weight: 700;
  color: #0a1628;
}

/* Centered short cells (day labels, M T W) */
table th:nth-child(n+2),
table td:nth-child(n+2) {
  text-align: center;
}

/* Checkbox styling — render the empty-box unicode large + bold so it pops
   on print, and the filled-box for completed items */
strong { color: #0a1628; }

/* Fill-in blank lines — emphasize underscores */
p:has(+ p) { /* keep adjacent paragraphs tight when one is a blank-line answer */ }

a {
  color: #1a3656;
  text-decoration: none;
}

code {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 10pt;
  background: #f5f3ec;
  padding: 0 0.2em;
}

/* Pull-quote / locked-phrase emphasis */
blockquote p {
  margin: 0.2em 0;
  font-size: 12pt;
}

/* The chapter / part dividers stand out */
h1 + p em { color: #d4af5a; }

/* Section subtitle (italic Playfair) */
h2 + p em:only-child { color: #555; font-style: italic; }
"""

html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>The My4MLife Logbook — Month 1</title>
<style>{CSS}</style>
</head>
<body>
{html_body}
</body>
</html>
"""

html_path.write_text(html_doc, encoding='utf-8')
print(f"Wrote {html_path}")
