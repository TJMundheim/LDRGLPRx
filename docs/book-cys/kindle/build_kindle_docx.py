#!/usr/bin/env python3
"""Kindle .docx for Count Yourself Skinny, via the flagship generator (docs/book/build_ebook_docx.py).

Works on a temporary copy of ../draft/_MASTER.md (never edits it): swaps the in-book 12-week write-in log for a
short chapter pointing to the free printable log, fixes print-only phrasing, drops the Notes write-in lines,
unwraps/strips HTML the generator cannot render. Also writes kindle-edition-changes.md (before -> after).

Usage: python3 build_kindle_docx.py            # -> count-yourself-skinny-kindle-v6.docx
"""
import argparse, importlib.util, pathlib, re, tempfile, html
import docx

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
GEN = ROOT.parent / 'book' / 'build_ebook_docx.py'
ap = argparse.ArgumentParser()
ap.add_argument('-o', '--out', default=str(HERE / 'count-yourself-skinny-kindle-v6.docx'))
args = ap.parse_args()

t = (ROOT / 'draft' / '_MASTER.md').read_text(encoding='utf-8')
changes = []   # (label, before, after)

def sub(label, before, after, count=1):
    global t
    assert t.count(before) == count, f'{label}: expected {count} match(es), found {t.count(before)}'
    t = t.replace(before, after)
    changes.append((label, before, after))

# --- 1. Front matter: plain markdown title page + "Also by", unwrap copyright, drop print-only lines ---------
head_end = t.index('# Count Yourself Skinny\n')
old_front = t[:head_end]
t = t[head_end:]
changes.append(('Front matter (print title div + "Also by" page)', old_front.strip(), '(removed; title page keeps the markdown title block, "Also by" moved after it as plain text)'))
also = ('**Also by Dr. TJ Mundheim**\n\n*Begin with the End in Mind*\n\n*The Uninsured Decade*\n\n'
        '— and the free 12-week My4MLife program and its member app, at my4mlife.com\n\n')
sub('Title page: non-breaking spaces', '*The&nbsp;Uninsured&nbsp;Decade*', '*The Uninsured Decade*')
t = t.replace('<div style="page-break-before: always;"></div>\n\n', '')
sub('Title page: closing rule before copyright dropped', 'my4mlife.com/assessment](https://my4mlife.com/assessment)\n\n---\n\n',
    'my4mlife.com/assessment](https://my4mlife.com/assessment)\n\n' + also + '<<COPYRIGHT>>')
t = t.replace('<<COPYRIGHT>><div class="copyright" markdown="1">\n\n', '')
t = re.sub(r'<!-- ISBN PLACEHOLDER.*?-->\s*', '', t, flags=re.S)
sub('Copyright page: print-only line dropped', '10 9 8 7 6 5 4 3 2 1\n\n</div>\n\n', '')
changes[-1] = ('Copyright page: print-only lines dropped (ISBN placeholder comment, "10 9 8 7 6 5 4 3 2 1" printer\'s key)',
               '<!-- ISBN PLACEHOLDER ... -->\n10 9 8 7 6 5 4 3 2 1', '(removed)')

# --- 2. Contents-style list inside "What You'll Count" ------------------------------------------------------
sub('"What You\'ll Count" back-of-book list', '- Your 12-Week Count Log\n', '- Your Count Log\n')

# --- 3. One-page summary ----------------------------------------------------------------------------------
sub('The Counts on One Page', 'Tear this out. Photograph it. Stick it on the refrigerator.',
    'Screenshot it. Print it. Stick it on the refrigerator.')

# --- 4. The 12-week log -> short chapter ---------------------------------------------------------------
a = t.index('# Your 12-Week Count Log')
b = t.index('# Questions People Actually Ask')
old_log = t[a:b]
rules = old_log[old_log.index('Three rules before Week 1:'):old_log.index('## Before Week 1')].strip()
new_log = f"""# Your Count Log

You could track this program on a sticky note — it's one yes-or-no question a day. But twelve weeks of sticky notes blow away, and a trend you can *see* is the strongest motivator ever discovered. So keep a log.

In the paperback, the log is printed in the book. In this Kindle edition, you get the same log free, as a printable page at my4mlife.com/go/count-yourself-skinny. Print one for each week. The page works for any week, so use it for Weeks 1 through 12 and for as long after as you like.

{rules}

"""
t = t[:a] + new_log + t[b:]
changes.append(('"Your 12-Week Count Log" chapter (Starting Line, Weeks 1-12 with daily tables and notes, Finish Line)',
                f'(~{len(old_log.split())} words of write-in tables and blank lines; opened with: "You could track this program on a sticky note ... So the rest of this book is your log." then the three rules, then Starting Line / Week 1-12 / Finish Line)',
                new_log.strip()))

# --- 5. Back matter ----------------------------------------------------------------------------------------
sub('Week 13 and Forever',
    "There is no Week 13 log printed in this book, on purpose. By now the counts may live in you. If you'd still like the pen, the next page has a free log. Two counts are all you need to keep.",
    "By now the counts may live in you. If you'd still like the pen, the next chapter has a free log. Two counts are all you need to keep.")
sub('Your Free Count Log',
    "It's a printable page in the same format as the weekly log in this book, plus the counts on one page. Print as many as you need, one for each week, from Week 13 on.",
    "It's the same printable page described in Your Count Log, earlier in this book. Print as many as you need, one for each week, for as long as you want to keep writing it down.")
sub('Give the Count Away: hand the copy', "- **Hand this copy to someone.** You have the counts memorized now; you don't need the paper.",
    "- **Tell someone about this book.** You have the counts memorized now; you don't need to keep it.")
sub('Give the Count Away: photograph', 'is free to photograph and share.', 'is free to screenshot, print, and share.')
# Notes: blank write-in lines only
n0 = t.index('# Notes\n'); n1 = t.index('# About the Author')
changes.append(('"Notes" page (blank write-in lines only)', t[n0:n1].strip()[:60] + ' ... (14 blank ruled lines)', '(removed)'))
t = t[:n0] + t[n1:]

# --- 6. Generator clean-up (formatting only, no wording) ----------------------------------------------------
t = re.sub(r'<div markdown="1"[^>]*>\n\n', '', t)               # chapter 13 callout wrapper
t = t.replace('</div>\n\n', '')
t = t.replace('{: style="text-align: left;" }\n', '')
def li(m):
    s = m.group(1)
    s = re.sub(r'</?strong>', '**', s); s = re.sub(r'</?em>', '*', s)
    return '1. ' + html.unescape(s)
t = re.sub(r'<ol class="sources">\s*', '', t)
t = re.sub(r'<li>(.*?)</li>\n?', lambda m: li(m) + '\n', t)
t = t.replace('</ol>\n', '')
t = re.sub(r'\[((?:my4mlife\.com)[^\]]*)\]\(https?://[^)]+\)', r'\1', t)   # domain-labelled links -> plain text
t = t.replace('&nbsp;', ' ')
t = re.sub(r'\*\*\*(.+?)\*\*\*', r'**\1**', t)
t = re.sub(r'\n{3,}', '\n\n', t)
assert not re.search(r'</?(div|p|ol|li|strong|em)\b|<!--|\{\.|\{:', t), re.search(r'</?(div|p|ol|li|strong|em)\b|<!--|\{\.|\{:', t)

spec = importlib.util.spec_from_file_location('gen', GEN)
gen = importlib.util.module_from_spec(spec); spec.loader.exec_module(gen)
with tempfile.TemporaryDirectory() as d:
    src = pathlib.Path(d) / 'clean.md'
    src.write_text(t, encoding='utf-8')
    gen.build(str(src), args.out)

# page breaks before the "Also by" block and the copyright page (generator only breaks on Heading 1)
D = docx.Document(args.out)
for p in D.paragraphs:
    if p.text.startswith('Also by Dr. TJ Mundheim') or p.text.startswith("Count Yourself Skinny: You'll Never"):
        p.paragraph_format.page_break_before = True
D.save(args.out)

with open(HERE / 'kindle-edition-changes.md', 'w', encoding='utf-8') as f:
    f.write('# Count Yourself Skinny, Kindle edition: changes from the print manuscript (v6)\n\n'
            'Everything else is word-for-word identical to `docs/book-cys/draft/_MASTER.md`. '
            'Generated by `build_kindle_docx.py`.\n\n')
    for i, (lab, b4, af) in enumerate(changes, 1):
        f.write(f'## {i}. {lab}\n\n**Before**\n\n```\n{b4}\n```\n\n**After**\n\n```\n{af}\n```\n\n')
    f.write('## Formatting only (no wording change)\n\n- Domain links such as [my4mlife.com](https://my4mlife.com) become plain text (the generator would print the URL twice).\n'
            '- Sources list converted from HTML `<ol>` to a numbered list.\n- Chapter 13 callout wrapper and attribute line removed.\n')
print('Wrote', args.out)
