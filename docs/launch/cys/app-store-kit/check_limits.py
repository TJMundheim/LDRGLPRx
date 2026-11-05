#!/usr/bin/env python3
"""Checks every App Store text box in listing.md against Apple's limit. Run: python3 check_limits.py"""
import re, sys
from pathlib import Path

LIMITS = {"App name": 30, "Subtitle": 30, "Promotional text": 170, "Keywords": 100,
          "Description": 4000, "What's New": 4000, "Copyright": None,
          "Display name": 30}
text = (Path(__file__).parent / "listing.md").read_text()
bad = False
rows = []
for m in re.finditer(r"^### ([^\n(]+?)\s*(?:\([^\n]*)?\n(?:[^`]*?)```\n(.*?)\n```", text, re.S | re.M):
    name, body = m.group(1).strip(), m.group(2)
    limit = LIMITS.get(name)
    if name == "Notes":
        limit = 4000
    n = len(body)
    ok = limit is None or n <= limit
    bad |= not ok
    rows.append((name, n, limit, ok))
for name, n, limit, ok in rows:
    print(f"{name:18} {n:5} / {limit if limit else '-':>5}  {'ok' if ok else 'OVER'}")
# subscription table limits
for field, limit in (("Display name", 30), ("Description", 45)):
    for m in re.finditer(rf"\| {field}[^|]*\|\s*`([^`]*)`\s*\|\s*`([^`]*)`", text):
        for v in m.groups():
            ok = len(v) <= limit; bad |= not ok
            print(f"sub {field:14} {len(v):5} / {limit:>5}  {'ok' if ok else 'OVER'}  {v}")
if "—" in text or "–" in text:
    print("em or en dash found"); bad = True
kw = [k for k in rows if k[0] == "Keywords"]
kwbody = re.search(r"### Keywords.*?```\n(.*?)\n```", text, re.S).group(1)
name = ("count yourself skinny count calories").split()
dupes = [k for k in kwbody.split(",") if k in name]
print("keyword repeats of name/subtitle words:", dupes or "none")
sys.exit(1 if bad else 0)
