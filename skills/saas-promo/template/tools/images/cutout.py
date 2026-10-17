# /// script
# dependencies = ["rembg[cpu]", "pillow", "numpy", "scipy", "onnxruntime"]
# ///
"""Cut a subject (a dish, a product, a person, a plant) off its background -> RGBA PNG,
cropped to the subject, edges feathered.

    uv run tools/images/cutout.py in.jpg out.png              # rembg (isnet), any background
    uv run tools/images/cutout.py in.jpg out.png --white 238  # product shot on white: flood the white
    uv run tools/images/cutout.py in.jpg out.png --model u2net   # softer edges

Cut-outs are what make screens look art-directed: a product breaking out of its frame, a
dish over an outlined word, collage pieces. See references/screens.md."""
import argparse
import numpy as np
from PIL import Image
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("out")
ap.add_argument("--white", type=int, help="flood-fill near-white background instead of rembg (threshold 0-255)")
ap.add_argument("--model", default="isnet-general-use", help="rembg model: isnet-general-use (crisp, default), u2net, birefnet-general")
ap.add_argument("--pad", type=int, default=6)
a = ap.parse_args()
im = Image.open(a.src).convert("RGB")
if a.white:
    arr = np.asarray(im).astype(np.float32)
    white = arr.min(axis=2) > a.white
    lab, _ = ndimage.label(white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(border))
    fg = ndimage.binary_opening(fg, iterations=1)
    alpha = np.clip(ndimage.distance_transform_edt(fg) / 1.6, 0, 1)
    al = alpha[..., None]
    rgb = np.where(al > 0.02, (arr - 255 * (1 - al)) / np.maximum(al, 0.02), arr)
    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
else:
    from rembg import new_session, remove
    rgba = np.asarray(remove(im, session=new_session(a.model)).convert("RGBA"))
ys, xs = np.nonzero(rgba[..., 3] > 12)
p = a.pad
crop = rgba[max(ys.min() - p, 0):ys.max() + p, max(xs.min() - p, 0):xs.max() + p]
Image.fromarray(crop, "RGBA").save(a.out)
print(a.out, crop.shape[1], "x", crop.shape[0])
