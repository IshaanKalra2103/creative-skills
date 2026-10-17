# /// script
# dependencies = ["pillow"]
# ///
"""One labelled frame per time from a video, in a grid (the example's reference image, or
the same times from your render for a side-by-side).

    uv run tools/refsheet.py original.mp4 reference.png 1.0 3.2 4.8 ...  [--cols 4] [--w 400]"""
import argparse, os, subprocess, tempfile
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("out"); ap.add_argument("times", nargs="+", type=float)
ap.add_argument("--cols", type=int, default=4); ap.add_argument("--w", type=int, default=400)
ap.add_argument("--label", default="")
a = ap.parse_args()
tiles = []
with tempfile.TemporaryDirectory() as d:
    for i, t in enumerate(a.times):
        p = f"{d}/{i}.png"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", a.video, "-frames:v", "1", "-vf", f"scale={a.w}:-1", p], check=True)
        im = Image.open(p).convert("RGB")
        dr = ImageDraw.Draw(im); dr.rectangle([0, 0, 62, 16], fill=(0, 0, 0)); dr.text((4, 2), f"{t:.2f}s", fill=(255, 255, 0))
        tiles.append(im)
tw, th = tiles[0].size
rows = (len(tiles) + a.cols - 1) // a.cols
top = 22 if a.label else 0
S = Image.new("RGB", (a.cols * (tw + 4) + 4, rows * (th + 4) + 4 + top), (18, 18, 22))
if a.label:
    ImageDraw.Draw(S).text((6, 5), a.label, fill=(220, 220, 230))
for i, im in enumerate(tiles):
    r, c = divmod(i, a.cols)
    S.paste(im, (4 + c * (tw + 4), top + 4 + r * (th + 4)))
S.save(a.out, quality=88) if a.out.endswith(".jpg") else S.save(a.out)
print(a.out, S.size)
