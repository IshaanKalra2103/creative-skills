# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow", "numpy", "typesafe-sdk"]
# ///
"""A storyboard sheet of ad.json for approval before any credits are spent: per shot, the
graded frame from the edit engine (first and last frame, so the move shows), its time and
length in beats, the shot type, the note, the speed curve, and the transition out.
usage: uv run tools/board.py AD_DIR [--out board.jpg] [--cols 4]
"""
import argparse, os, sys, textwrap
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cut
from adlib import FONTS, keyframes

ap = argparse.ArgumentParser()
ap.add_argument("ad")
ap.add_argument("--out")
ap.add_argument("--cols", type=int, default=4)
a = ap.parse_args()
cut.setup(a.ad, 0.3)
AD = cut.AD
TW, TH = cut.W, cut.H
CW, CH = TW * 2 + 30, TH + 210
f_id = ImageFont.truetype(os.path.join(FONTS, "Anton-Regular.ttf"), 34)
f_b = ImageFont.truetype(os.path.join(FONTS, "BarlowCondensed-ExtraBold.ttf"), 24)
f_m = ImageFont.truetype(os.path.join(FONTS, "IBMPlexMono-Medium.ttf"), 15)


def frame(g):
    return Image.frombytes("RGB", (TW, TH), cut.render(g))


def tc(g):
    return f"{int(g / AD.fps // 60)}:{g / AD.fps % 60:05.2f}"


rows = -(-len(AD.shots) // a.cols)
sheet = Image.new("RGB", (a.cols * CW + 40, rows * CH + 130), (16, 16, 16))
d = ImageDraw.Draw(sheet)
beat = AD.fps * 60 / AD.bpm if AD.bpm else None
d.text((24, 20), AD.data.get("title", os.path.basename(AD.dir)), font=f_id, fill="white")
d.text((24, 70), f"{AD.data.get('sport', '')}  |  {AD.data.get('product', '')}  |  {AD.W}x{AD.H} {AD.fps} fps"
       f"{f'  |  {AD.bpm} bpm' if AD.bpm else ''}  |  {AD.N / AD.fps:.2f} s, {len(AD.shots)} shots",
       font=f_m, fill=(170, 170, 170))
for i, s in enumerate(AD.shots):
    x, y = 20 + (i % a.cols) * CW, 110 + (i // a.cols) * CH
    g0, n = s["_start"], s["_len"]
    sheet.paste(frame(g0 + min(2, n - 1)), (x, y))
    sheet.paste(frame(g0 + n - 1), (x + TW + 10, y))
    ty = y + TH + 8
    d.text((x, ty), s["id"], font=f_id, fill=(255, 122, 26))
    span = f"{tc(g0)}-{tc(g0 + n)}  {n}f" + (f" / {n / beat:g} beats" if beat else "")
    d.text((x + 70, ty + 4), span, font=f_m, fill=(200, 200, 200))
    d.text((x + 70, ty + 24), s.get("shot", ""), font=f_b, fill="white")
    note = textwrap.wrap(s.get("note", ""), 62)[:4]
    for j, line in enumerate(note):
        d.text((x, ty + 58 + j * 19), line, font=f_m, fill=(185, 185, 185))
    # speed curve, 0..2x
    sp = s.get("speed", 1)
    if isinstance(sp, list):
        bx, by, bw, bh = x, ty + 140, TW * 2 + 10, 30
        d.rectangle((bx, by, bx + bw, by + bh), outline=(60, 60, 60))
        d.line((bx, by + bh / 2, bx + bw, by + bh / 2), fill=(50, 50, 50))
        pts = [(bx + bw * k / max(1, n - 1), by + bh - bh * min(2, keyframes(sp, k)) / 2) for k in range(n)]
        d.line(pts, fill=(255, 122, 26), width=2)
        d.text((bx + 4, by + 2), "speed", font=f_m, fill=(120, 120, 120))
    mv = s.get("move", {})
    bits = []
    if isinstance(mv.get("zoom"), list):
        bits.append(f"zoom {mv['zoom'][0]}-{mv['zoom'][1]}")
    if mv.get("shake"):
        bits.append(f"shake {mv['shake']}")
    if s.get("hits"):
        bits.append("hits " + ", ".join(f"{h['fx']} @{h['at']}" for h in s["hits"]))
    if s is not AD.shots[-1]:
        o = s.get("out", {"type": "cut"})
        bits.append(f"out: {o.get('type', 'cut')}" + (f" {o['dir']}" if "dir" in o else "") +
                    (f" on {o['subject']}" if "subject" in o else ""))
    d.text((x, ty + 176), "  |  ".join(bits)[:110], font=f_m, fill=(140, 140, 140))
out = a.out or AD.path("out", "board.jpg")
os.makedirs(os.path.dirname(out), exist_ok=True)
sheet.save(out, quality=88)
print(f"wrote {out}")
