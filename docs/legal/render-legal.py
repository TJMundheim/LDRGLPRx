#!/usr/bin/env python3
"""
Render legal Markdown files to clean PDFs via headless Chrome.

Usage:
    python3 docs/legal/render-legal.py

Outputs:
    docs/legal/My_4M_Life_Notice_of_Privacy_Practices.pdf
    docs/legal/My_4M_Life_Patient_Authorization.pdf
"""
import markdown
import pathlib
import subprocess
import sys

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
LEGAL_DIR = pathlib.Path(__file__).parent.resolve()

DOCUMENTS = [
    "My_4M_Life_Notice_of_Privacy_Practices",
    "My_4M_Life_Patient_Authorization",
]

CSS = """
@page {
  size: letter;
  margin: 1in 1in 1in 1in;
}

* {
  box-sizing: border-box;
}

body {
  font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;
  font-size: 10.5pt;
  line-height: 1.5;
  color: #000000;
  max-width: 100%;
}

/* Document title block at top */
.doc-header {
  text-align: center;
  margin-bottom: 1.4em;
  padding-bottom: 0.8em;
  border-bottom: 2px solid #000;
}

.doc-header h1 {
  font-size: 16pt;
  font-weight: 700;
  margin: 0 0 0.2em 0;
  text-align: center;
  border: none;
  padding: 0;
}

.doc-header .subtitle {
  font-size: 11pt;
  font-weight: 600;
  margin: 0.1em 0;
}

.doc-header .notice-box {
  margin-top: 0.8em;
  border: 1.5px solid #000;
  padding: 0.5em 0.8em;
  font-size: 9.5pt;
  font-weight: 700;
  text-transform: uppercase;
  line-height: 1.4;
}

h1 {
  font-size: 12pt;
  font-weight: 700;
  margin: 1.4em 0 0.4em;
  border-bottom: 1px solid #555;
  padding-bottom: 0.15em;
  page-break-after: avoid;
}

h2 {
  font-size: 11pt;
  font-weight: 700;
  margin: 1.1em 0 0.3em;
  page-break-after: avoid;
}

h3 {
  font-size: 10.5pt;
  font-weight: 700;
  margin: 0.9em 0 0.25em;
  page-break-after: avoid;
}

p {
  margin: 0 0 0.7em;
}

ul, ol {
  margin: 0.4em 0 0.7em 1.6em;
  padding: 0;
}

li {
  margin: 0.2em 0;
}

/* Signature / form lines */
hr {
  border: none;
  border-top: 1px solid #000;
  margin: 0.3em 0 0.1em;
}

/* Tables for signature blocks */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.6em 0;
  page-break-inside: avoid;
}

td {
  padding: 0.2em 0.5em 0.2em 0;
  vertical-align: bottom;
  font-size: 10pt;
  border: none;
}

td.sig-line {
  border-bottom: 1px solid #000;
  width: 46%;
}

td.sig-spacer {
  width: 8%;
}

/* Checkbox list items rendered as preformatted blocks */
p > code, li > code {
  font-family: inherit;
  background: none;
  font-size: inherit;
}

/* Preserve checkbox-style lines */
pre {
  font-family: inherit;
  font-size: 10pt;
  margin: 0.2em 0;
  white-space: pre-wrap;
}

strong {
  font-weight: 700;
  color: #000;
}

em {
  font-style: italic;
  color: #000;
}

a {
  color: #000;
  text-decoration: underline;
}

/* Avoid orphaned headings */
h1, h2, h3 {
  page-break-after: avoid;
}
"""

def render_doc(name: str) -> None:
    md_path = LEGAL_DIR / f"{name}.md"
    html_path = LEGAL_DIR / f"{name}.html"
    pdf_path = LEGAL_DIR / f"{name}.pdf"

    md_text = md_path.read_text(encoding="utf-8")

    # Split off the first two lines as the header block, convert the rest
    lines = md_text.splitlines()

    # Extract the title (line 0) and subtitle lines (lines 1+) that appear
    # before the first numbered section or blank paragraph.
    header_lines = []
    body_start = 0
    for i, line in enumerate(lines):
        # Stop collecting header when we hit a numbered section like "1. " or
        # a line that starts with a keyword-heavy sentence, or a blank line
        # followed by content.
        stripped = line.strip()
        if i > 0 and (
            stripped[:3].rstrip(". ").isdigit()          # "1. Our..."
            or stripped.startswith("This Authorization")  # Patient Auth preamble
        ):
            body_start = i
            break
        header_lines.append(line)
    else:
        body_start = len(header_lines)

    # Build a clean HTML header block
    title = header_lines[0].strip() if header_lines else name.replace("_", " ")
    subtitle_parts = [l.strip() for l in header_lines[1:] if l.strip()]

    # Detect if there is an all-caps notice line (common in NPP)
    notice_line = ""
    subtitle_display = []
    for part in subtitle_parts:
        if part.isupper() or (len(part) > 30 and part == part.upper()):
            notice_line = part
        else:
            subtitle_display.append(part)

    subtitle_html = "".join(
        f'<div class="subtitle">{s}</div>' for s in subtitle_display
    )
    notice_html = (
        f'<div class="notice-box">{notice_line}</div>' if notice_line else ""
    )

    header_html = f"""<div class="doc-header">
<h1>{title}</h1>
{subtitle_html}
{notice_html}
</div>"""

    # Convert remaining markdown body
    body_md = "\n".join(lines[body_start:])
    body_html = markdown.markdown(
        body_md,
        extensions=["extra", "sane_lists"],
        output_format="html5",
    )

    html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{title}</title>
<style>{CSS}</style>
</head>
<body>
{header_html}
{body_html}
</body>
</html>
"""

    html_path.write_text(html_doc, encoding="utf-8")
    print(f"  HTML → {html_path}")

    result = subprocess.run(
        [
            CHROME,
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_path}",
            f"file://{html_path}",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"  ERROR: Chrome exited {result.returncode}")
        print(result.stderr[:800])
        sys.exit(1)

    size = pdf_path.stat().st_size
    print(f"  PDF  → {pdf_path}  ({size:,} bytes)")
    # Clean up intermediate HTML
    html_path.unlink()


def main() -> None:
    print("Rendering legal documents...")
    for doc in DOCUMENTS:
        print(f"\n{doc}")
        render_doc(doc)
    print("\nDone.")


if __name__ == "__main__":
    main()
