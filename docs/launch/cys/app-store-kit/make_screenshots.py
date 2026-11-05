#!/usr/bin/env python3
"""Frames the raw simulator captures in screenshots/raw/ into App Store screenshots.

Output: 1320 x 2868 PNG (iPhone 6.9-inch, accepted by App Store Connect), RGB, no alpha.
Run:  python3 make_screenshots.py     (needs Pillow)
Raw captures come from the Debug app on an iPhone 17 Pro Max simulator, clock 9:41.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
RAW, OUT = HERE / "screenshots/raw", HERE / "screenshots"
FONT = HERE / "../../../design/cys/fonts/Anton-Regular.ttf"
RED, WHITE, YELLOW, INK = (0xE8, 0x35, 0x2B), (255, 255, 255), (0xFF, 0xD4, 0x00), (20, 20, 20)
W, H = 1320, 2868
PHONE_W, PHONE_TOP, RADIUS = 1020, 660, 120

SHOTS = [  # output name, raw file, caption lines, index of the line shown in yellow (or None)
    ("01-no-calories", "home.png", ["YOU'LL NEVER COUNT", "A CALORIE."], 1),
    ("02-count-to-32", "pacer.png", ["COUNT TO 32."], 0),
    ("03-airpods", "meal.png", ["YOUR AIRPODS COUNT", "YOUR CHEWS."], 1),
    ("04-chew-number", "chew-number.png", ["WHAT'S YOUR", "CHEW NUMBER?"], 1),
    ("05-weekly", "trends.png", ["SEE YOUR WEEK", "AT A GLANCE."], 1),
    ("06-first-meal-free", "paywall.png", ["YOUR FIRST COUNTED", "MEAL IS FREE."], 1),
]

def fit(lines, maxw):
    size = 190
    while size > 60:
        f = ImageFont.truetype(str(FONT), size)
        if max(f.getlength(l) for l in lines) <= maxw:
            return f
        size -= 4
    return f

def build(name, raw, lines, hi):
    img = Image.new("RGB", (W, H), RED)
    d = ImageDraw.Draw(img)
    font = fit(lines, W - 140)
    lh = int(font.size * 1.12)
    y = 70 + (500 - lh * len(lines)) // 2
    for i, line in enumerate(lines):
        x = (W - font.getlength(line)) / 2
        d.text((x + 6, y + 6), line, font=font, fill=INK)          # hard shadow, tabloid style
        d.text((x, y), line, font=font, fill=YELLOW if i == hi else WHITE)
        y += lh
    shot = Image.open(RAW / raw).convert("RGB")
    ph = round(shot.height * PHONE_W / shot.width)
    shot = shot.resize((PHONE_W, ph), Image.LANCZOS)
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, PHONE_W, ph * 2), RADIUS, fill=255)
    x0 = (W - PHONE_W) // 2
    d.rounded_rectangle((x0 + 16, PHONE_TOP + 16, x0 + PHONE_W + 16, PHONE_TOP + ph * 2), RADIUS, fill=YELLOW)
    d.rounded_rectangle((x0 - 14, PHONE_TOP - 14, x0 + PHONE_W + 14, PHONE_TOP + ph * 2), RADIUS + 14, fill=INK)
    img.paste(shot, (x0, PHONE_TOP), mask)
    img.save(OUT / f"{name}.png")

if __name__ == "__main__":
    for s in SHOTS:
        build(*s)
    print("wrote", len(SHOTS), "screenshots to", OUT)
