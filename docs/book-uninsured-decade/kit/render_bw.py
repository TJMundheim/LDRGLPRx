#!/usr/bin/env python3
"""Black-ink KDP interior HTML for The Uninsured Decade (no render_bw existed for this book).

Reads draft/_MASTER.html (made by ../render.py). Never touches draft/ or any existing PDF.
Writes kit/_MASTER-bw.html. Then print it with headless Chrome (see kit/publish-checklist.md).

Besides flattening color, it applies print-only fixes the color render lacks:
  correct PDF title (render.py still says Count Yourself Skinny),
  no <hr> stranded onto its own blank page before a chapter or page break,
  web addresses never hyphenate or break, no folio on the title page.
"""
import argparse, html, pathlib, re

ap = argparse.ArgumentParser()
ap.add_argument('--pdf', help='an already printed PDF of this book; its outline fills the page numbers on the Contents page')
args = ap.parse_args()

KIT = pathlib.Path(__file__).resolve().parent
src = (KIT.parent / 'draft' / '_MASTER.html').read_text(encoding='utf-8')

MAP = {
    '#0a1628': '#000', '#1a3656': '#000', '#1a1a1a': '#000', '#2b50c8': '#000',
    '#a6841c': '#000', '#8a6d1f': '#333', '#d4af5a': '#555', '#fbf7ec': '#f0f0f0',
    '#f3e8c8': '#e6e6e6', '#f5f3ec': '#eee', '#888': '#444', '#333': '#111', '#ccc': '#999',
}
m = re.search(r'<style>(.*?)</style>', src, flags=re.DOTALL)
css = re.sub(r'#[0-9a-fA-F]{3,6}\b', lambda mo: MAP.get(mo.group(0).lower(), mo.group(0)), m.group(1))
css += """
.nb { white-space: nowrap; hyphens: none; }
@page :first { @bottom-center { content: none; } }
/* Print tuning, chosen by trying settings against the final text so no page is left holding a few stray lines. */
body { font-size: 11.3pt; line-height: 1.5; }
@page { margin: 0.7in 0.7in 0.8in 0.7in; }
"""
body = src[m.end():]

# Drop an <hr> that sits directly before a forced page break; it can spill to its own page.
body = re.sub(r'<hr\s*/?>\s*(?=<h1\b)', '', body)
body = re.sub(r'<hr\s*/?>\s*(?=<div style="page-break-before)', '', body)

# Keep web addresses whole, in text nodes only.
parts = re.split(r'(<[^>]+>)', body)
url = re.compile(r'my4mlife\.com(?:/[A-Za-z0-9/_-]*)?')
for i in range(0, len(parts), 2):
    parts[i] = url.sub(lambda mo: f'<span class="nb">{mo.group(0)}</span>', parts[i])
body = ''.join(parts)

if args.pdf:
    import fitz
    d = fitz.open(args.pdf)
    pages = {}
    for _lvl, title, pg in d.get_toc():
        key = re.sub(r'\s+', '', title.replace('\u2019', "'").replace('\u2018', "'").replace('\u201c', '"').replace('\u201d', '"'))
        h = len(key) // 2
        if len(key) % 2 == 0 and key[:h] == key[h:]:   # Chrome repeats the text of upper-cased Part headings
            key = key[:h]
        pages.setdefault(key.upper(), pg)
    d.close()
    missing = []
    def fill(mo):
        key = html.unescape(mo.group(1))
        pg = pages.get(key.upper())
        if pg is None:
            missing.append(key)
            return mo.group(0)
        return mo.group(0).replace('<span class="toc-p"></span>', f'<span class="toc-p">{pg}</span>')
    body = re.sub(r'<li class="toc-[a-z]+" data-t="([^"]*)">.*?</li>', fill, body, flags=re.S)
    print('Contents page numbers filled; entries with no match:', missing)

head = src[:m.start()].replace('<title>Count Yourself Skinny</title>', '<title>The Uninsured Decade</title>')
out = head + '<style>' + css + '</style>' + body
dst = KIT / '_MASTER-bw.html'
dst.write_text(out, encoding='utf-8')
left = sorted(set(re.findall(r'#[0-9a-fA-F]{3,6}\b', css)))
print('Wrote', dst, 'colors remaining:', left)
