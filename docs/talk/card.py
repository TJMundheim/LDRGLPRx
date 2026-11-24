"""Handshake card (US business card, 3.5 x 2 in) for TJ: print-ready PDF with 1/8 in bleed.

Usage: python3 card.py [out.pdf]   (default ~/Downloads/My4MLife_Handshake_Card_v2.pdf)
Also writes <out>_front.png / <out>_back.png previews (needs PyMuPDF).

QR tags: the assessment QR uses src=card, NOT talk-*. A talk-* tag turns on event mode,
whose welcome email says "You're entered in tonight's signed-book drawing" (wrong for a card).
"""
import os, sys
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import qrcode

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Downloads/My4MLife_Handshake_Card_v2.pdf")

ASSESS_URL = "https://my4mlife.com/assessment?src=card"
SPEAK_URL = "https://my4mlife.com/speaking?src=card"
PHONE = "817-995-3103"  # TJ's cell, personal handshake card only (TJ 2026-11-24)
# v2 (TJ 2026-11-24): no disclaimer on the card; identity line on the front, not repeated on the back.

NAVY, GOLD, GOLD_L = HexColor("#0A1430"), HexColor("#D4A94E"), HexColor("#E9C97E")
SOFT, MUTED, CREAM = HexColor("#D7DFEE"), HexColor("#5B6475"), HexColor("#F7F3EA")

FONTS = "/System/Library/Fonts/Supplemental"
pdfmetrics.registerFont(TTFont("Serif", f"{FONTS}/Georgia.ttf"))
pdfmetrics.registerFont(TTFont("Serif-Bold", f"{FONTS}/Georgia Bold.ttf"))
pdfmetrics.registerFont(TTFont("Serif-Italic", f"{FONTS}/Georgia Italic.ttf"))

IN = 72
BLEED = 0.125 * IN
W, H = 3.5 * IN + 2 * BLEED, 2 * IN + 2 * BLEED  # page incl. bleed
SAFE = BLEED + 0.14 * IN                          # keep text this far from the page edge


def spaced(c, text, x, y, font, size, gap):
    c.setFont(font, size)
    for ch in text:
        c.drawString(x, y, ch)
        x += pdfmetrics.stringWidth(ch, font, size) + gap


def qr(c, url, cx, top, size):
    """Vector QR drawn as merged horizontal runs (no hairline seams between modules)."""
    tile, pad = size + 10, 5
    c.setFillColor(white)
    c.roundRect(cx - tile / 2, top - tile, tile, tile, 4, stroke=0, fill=1)
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
    q.add_data(url); q.make(fit=True)
    m = q.get_matrix()
    n = len(m)
    mod = size / n
    x0, y0 = cx - size / 2, top - pad
    c.setFillColor(NAVY)
    for r, row in enumerate(m):
        col = 0
        while col < n:
            if row[col]:
                start = col
                while col < n and row[col]:
                    col += 1
                # overlap by a hair vertically so stacked rows fuse
                c.rect(x0 + start * mod, y0 - (r + 1) * mod - 0.15, (col - start) * mod, mod + 0.3, stroke=0, fill=1)
            else:
                col += 1
    return top - tile


def front(c):
    c.setFillColor(NAVY)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    em = 30
    c.drawImage(os.path.join(HERE, "emblem.png"), SAFE, H - SAFE - em, em, em, mask="auto")
    c.setFillColor(GOLD)
    spaced(c, "MY4MLIFE", SAFE + em + 8, H - SAFE - em / 2 - 3, "Helvetica-Bold", 8, 2.2)

    c.setFillColor(white)
    c.setFont("Serif-Bold", 16)
    c.drawString(SAFE, 92, "Dr. TJ Mundheim")
    c.setFillColor(SOFT)
    c.setFont("Helvetica", 7.4)
    c.drawString(SAFE, 80.5, "Health-span educator  ·  Speaker  ·  Author")
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 8.4)
    c.drawString(SAFE, 68.5, PHONE)

    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.line(SAFE, 60, SAFE + 40, 60)
    c.setFillColor(GOLD_L)
    c.setFont("Serif-Italic", 9.6)
    c.drawString(SAFE, 47, "Don't lose your identity and your dignity")
    c.drawString(SAFE, 35.5, "while you still have a choice.")

    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 7.6)
    c.drawString(SAFE, SAFE + 1, "my4mlife.com/speaking")


def back(c):
    c.setFillColor(CREAM)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    # v2 (TJ 2026-11-24): venue list under "Book a free talk", in priority order.
    cols = [
        (W * 0.29, ASSESS_URL, "Your free MindSpan", "assessment", ["5 minutes, on your phone"]),
        (W * 0.71, SPEAK_URL, "Book a free talk", "for your group",
         ["Financial advisors, estate attorneys,", "employers, civic clubs, churches,", "health clubs, libraries"]),
    ]
    size, lead = 64, 7.6
    most = max(len(sub) for *_, sub in cols)
    top = (H + size + 10 + 10 + 17.4 + lead * (most - 1) + 6) / 2  # tallest column centred
    for cx, url, l1, l2, sub in cols:
        y = qr(c, url, cx, top, size) - 10
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 7.4)
        c.drawCentredString(cx, y, l1)
        c.drawCentredString(cx, y - 8.6, l2)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.2)
        for i, line in enumerate(sub):
            c.drawCentredString(cx, y - 17.4 - lead * i, line)


def main():
    c = canvas.Canvas(OUT, pagesize=(W, H))
    c.setTitle("My4MLife handshake card")
    front(c); c.showPage()
    back(c); c.showPage()
    c.save()
    print("PDF", OUT, f"({W/IN:.3f} x {H/IN:.3f} in incl. 1/8 in bleed)")
    try:
        import fitz
        doc = fitz.open(OUT)
        for i, side in enumerate(["front", "back"]):
            png = OUT[:-4] + f"_{side}.png"
            doc[i].get_pixmap(dpi=600).save(png)
            print("PNG", png)
    except ImportError:
        print("PyMuPDF not installed: skipped PNG previews")


if __name__ == "__main__":
    main()
