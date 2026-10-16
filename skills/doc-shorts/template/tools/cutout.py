# /// script
# dependencies = ["rembg", "onnxruntime", "pillow", "numpy"]
# ///
"""Cut a subject off its background into a transparent PNG (for `hypno` heads, `faces`
cards, collage plates). Runs rembg locally; models download to ~/.u2net on first use.

  uv run tools/cutout.py IN.jpg OUT.png                      # whole subject
  uv run tools/cutout.py IN.jpg OUT.png --crop 600,80,700,820 # crop first (x,y,w,h, image px)
  uv run tools/cutout.py IN.jpg OUT.png --model u2net_human_seg --trim --height 459

--model   isnet-general-use (default, objects and people), u2net_human_seg (people only),
          u2net (older general model)
--trim    crop the result to the subject's bounding box (plus --pad px)
--height  resize the result to this height (hypno draws its head at face_h = 459 ref px)
--feather soften the alpha edge by N px (the reel's cut-outs have slightly soft edges)
"""
import argparse

import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session, remove

ap = argparse.ArgumentParser()
ap.add_argument("src")
ap.add_argument("out")
ap.add_argument("--crop", help="x,y,w,h in source pixels, applied before the cut")
ap.add_argument("--model", default="isnet-general-use")
ap.add_argument("--trim", action="store_true")
ap.add_argument("--pad", type=int, default=6)
ap.add_argument("--height", type=int)
ap.add_argument("--feather", type=float, default=0.8)
a = ap.parse_args()

im = Image.open(a.src).convert("RGB")
if a.crop:
    x, y, w, h = (int(v) for v in a.crop.split(","))
    im = im.crop((x, y, x + w, y + h))
out = remove(im, session=new_session(a.model)).convert("RGBA")
if a.feather > 0:
    r, g, b, al = out.split()
    out = Image.merge("RGBA", (r, g, b, al.filter(ImageFilter.GaussianBlur(a.feather))))
if a.trim:
    al = np.asarray(out)[:, :, 3]
    ys, xs = np.where(al > 16)
    if len(xs):
        p = a.pad
        out = out.crop((max(0, xs.min() - p), max(0, ys.min() - p), min(out.width, xs.max() + p + 1), min(out.height, ys.max() + p + 1)))
if a.height:
    out = out.resize((round(out.width * a.height / out.height), a.height), Image.LANCZOS)
out.save(a.out)
print(f"{a.out}: {out.width}x{out.height}")
