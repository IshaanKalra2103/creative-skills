# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow"]
# ///
"""Tile renders into one contact sheet on the effect's paper colour.

    uv run sheet.py <out.png> <img> [<img> ...] [--cols N] [--height 900]

Images are scaled to a common height. Use it to compare palettes, or tuning variants of one
photo side by side (and next to the source photo) before picking one.
"""
import argparse

from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("out")
ap.add_argument("images", nargs="+")
ap.add_argument("--cols", type=int, default=0, help="default: all in one row up to 4, then 2 per row")
ap.add_argument("--height", type=int, default=900, help="height of each tile")
a = ap.parse_args()

ims = [Image.open(p).convert("RGB") for p in a.images]
ims = [im.resize((round(im.width * a.height / im.height), a.height), Image.LANCZOS) for im in ims]
cols = a.cols or (len(ims) if len(ims) <= 4 else 2)
rows = (len(ims) + cols - 1) // cols
g = round(a.height * 0.03)
colw = max(im.width for im in ims)
sheet = Image.new("RGB", (cols * colw + (cols + 1) * g, rows * a.height + (rows + 1) * g), (249, 249, 249))
for k, im in enumerate(ims):
    r, c = divmod(k, cols)
    sheet.paste(im, (g + c * (colw + g) + (colw - im.width) // 2, g + r * (a.height + g)))
sheet.save(a.out, quality=88) if a.out.lower().endswith((".jpg", ".jpeg")) else sheet.save(a.out)
print(a.out, sheet.size)
