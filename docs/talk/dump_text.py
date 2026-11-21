"""Dump all slide text + speaker notes of a PPTX (for diffing versions). Usage: python3 dump_text.py deck.pptx"""
import sys
from pptx import Presentation
p = Presentation(sys.argv[1])
for i, s in enumerate(p.slides, 1):
    print(f"=== SLIDE {i}")
    for sh in s.shapes:
        if sh.has_text_frame and sh.text_frame.text.strip():
            print("T:", sh.text_frame.text.replace("\n", " / "))
        if getattr(sh, "has_table", False) and sh.has_table:
            for r in sh.table.rows: print("R:", " | ".join(c.text for c in r.cells))
    if s.has_notes_slide:
        for l in s.notes_slide.notes_text_frame.text.split("\n"):
            if l.strip(): print("N:", l)
