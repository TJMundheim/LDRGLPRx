#!/usr/bin/env python3
"""Kindle .docx for The Uninsured Decade, using the flagship's generator (docs/book/build_ebook_docx.py).

That generator cannot read this manuscript raw: it would print {.part} tags, <br>, "### The Premium"
inside quotes, and stray asterisks. This cleans a temporary copy of _MASTER.md, then calls it.
Never edits _MASTER.md.

Usage: python3 build_kindle_docx.py -o kit/test-builds/OUT.docx
"""
import argparse, importlib.util, pathlib, re, tempfile

KIT = pathlib.Path(__file__).resolve().parent
ROOT = KIT.parent
GEN = ROOT.parent / 'book' / 'build_ebook_docx.py'

ap = argparse.ArgumentParser()
ap.add_argument('-o', '--out', required=True)
args = ap.parse_args()

t = (ROOT / 'draft' / '_MASTER.md').read_text(encoding='utf-8')
# The printed Contents page has no place in a reflowable ebook (Kindle builds its own navigation).
t = re.sub(r'<!-- toc:start -->.*?<!-- toc:end -->\s*', '', t, flags=re.S)
t = re.sub(r'\s*\{\.[a-z-]+\}\s*$', '', t, flags=re.M)         # attribute tags on headings
t = re.sub(r'^>\s*###\s+(.*)$', r'> **\1**', t, flags=re.M)     # heading inside a callout
t = re.sub(r'^>\s*$', '', t, flags=re.M)                        # empty quote lines
t = t.replace('<br>', ' ')                                      # table cell breaks
t = re.sub(r'\*\*\*(.+?)\*\*\*', r'**\1**', t)                  # bold-italic the generator cannot parse
def strip_inner(mo):                                            # *italic* nested inside **bold**
    return '**' + mo.group(1).replace('*', '') + '**'
t = re.sub(r'\*\*(\[[^\]]*\*[^\]]*\])\*\*', strip_inner, t)

spec = importlib.util.spec_from_file_location('gen', GEN)
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)
with tempfile.TemporaryDirectory() as d:
    src = pathlib.Path(d) / 'clean.md'
    src.write_text(t, encoding='utf-8')
    gen.build(str(src), args.out)
print('Wrote', args.out)
