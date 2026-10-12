# /// script
# dependencies = ["pillow"]
# ///
"""Labelled contact sheets of any video (a reference, or your render) for reading beats and easing.

uv run refsheet.py video.mp4 out_prefix [fps=1] [start=0] [dur=all] [cols=6] [rows=8] [width=400]
  1 fps over the whole thing -> the beat map; 10-15 fps over 3-6 s windows -> how each move eases.
Writes out_prefix_00.png, _01.png ... with the timestamp burned into each tile.
"""
import glob, pathlib, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

a = sys.argv[1:]
if len(a) < 2: sys.exit(__doc__)
v, out = a[0], a[1]
fps = float(a[2]) if len(a) > 2 else 1.0
start = float(a[3]) if len(a) > 3 else 0.0
dur = a[4] if len(a) > 4 else None
cols, rows, w = (int(a[5]) if len(a) > 5 else 6), (int(a[6]) if len(a) > 6 else 8), (int(a[7]) if len(a) > 7 else 400)
d = tempfile.mkdtemp()
cmd = ["ffmpeg", "-v", "error", "-y", "-ss", str(start)] + (["-t", dur] if dur else []) + ["-i", v, "-vf", f"fps={fps},scale={w}:-2", f"{d}/f%05d.png"]
subprocess.run(cmd, check=True)
fs = sorted(glob.glob(f"{d}/f*.png"))
try: font = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 18)
except OSError: font = ImageFont.load_default()
n = cols * rows
for si in range(0, len(fs), n):
    chunk = fs[si:si + n]
    fw, fh = Image.open(chunk[0]).size
    S = Image.new("RGB", (cols * fw + (cols - 1) * 4, ((len(chunk) + cols - 1) // cols) * (fh + 4) - 4), (255, 0, 255))
    for i, f in enumerate(chunk):
        im = Image.open(f).convert("RGB"); dr = ImageDraw.Draw(im)
        dr.rectangle([0, 0, 90, 24], fill=(255, 255, 255)); dr.text((4, 2), f"{start + (si + i) / fps:6.2f}", fill=(255, 0, 0), font=font)
        S.paste(im, ((i % cols) * (fw + 4), (i // cols) * (fh + 4)))
    p = f"{out}_{si // n:02d}.png"; S.save(p); print(p)
