"""Compare ink boxes and texture stats of reference vs ours.
usage: uv run --with pillow --with numpy python tools/measure.py OURS.png REF.png [dark|light] [y0 y1 x0 x1] [thr]"""
import sys
import numpy as np
from PIL import Image

def load(p):
    im = Image.open(p).convert("RGB")
    if im.size != (720, 1280):
        im = im.resize((720, 1280), Image.LANCZOS)
    return np.asarray(im).astype(float)

def bbox(a, dark, region, thr):
    y0, y1, x0, x1 = region
    L = a[y0:y1, x0:x1].mean(2)
    m = L < thr if dark else L > thr
    ys, xs = np.where(m)
    if len(xs) == 0:
        return None
    return (xs.min() + x0, ys.min() + y0, xs.max() + x0, ys.max() + y0)

def texture(a, y0=100, x0=100):
    r = a[y0:y0 + 256, x0:x0 + 256].mean(2)
    col = r.mean(1)
    c = col - np.convolve(col, np.ones(15) / 15, "same")
    return dict(mean=round(r.mean(), 1), line_std=round(c[10:-10].std(), 2), px_std=round((r - r.mean(1, keepdims=True)).std(), 2))

ours, ref = load(sys.argv[1]), load(sys.argv[2])
dark = len(sys.argv) > 3 and sys.argv[3] == "dark"
region = tuple(int(v) for v in sys.argv[4:8]) if len(sys.argv) >= 8 else (0, 1280, 0, 720)
thr = float(sys.argv[8]) if len(sys.argv) > 8 else (110 if dark else 120)
print("ref ", bbox(ref, dark, region, thr), texture(ref), ref.reshape(-1, 3).mean(0).round(1))
print("ours", bbox(ours, dark, region, thr), texture(ours), ours.reshape(-1, 3).mean(0).round(1))
