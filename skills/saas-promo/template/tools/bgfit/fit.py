# /// script
# dependencies = ["numpy", "pillow", "scipy"]
# ///
"""Fit a backdrop framing (a `kit::PRESETS` entry) to a frame of any reference video, so a
new film can borrow another promo's gradient layouts. The colours stay the spec's palette;
only the geometry is fitted (fit the colours too with --colours).

    uv run tools/bgfit/fit.py ref.mp4 --at 4.2 --mask 220,190,1060,500 --name mylook
    uv run tools/bgfit/fit.py ref.mp4 --at 4.2 --at 9.1 --colours

Masks are rectangles (in 1280x720 px of the reference) to ignore: text, windows, cards.
Prints a line to paste into PRESETS in src/kit.rs, and writes review/bgfit_<name>.png
(reference | fit). Model: tools/bgfit/model.py (a NumPy twin of src/shaders/Bg.sksl)."""
import argparse, io, os, subprocess, sys
import numpy as np
from PIL import Image
from scipy.optimize import least_squares
sys.path.insert(0, os.path.dirname(__file__))
import model as M

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("--at", type=float, action="append", required=True)
ap.add_argument("--mask", action="append", default=[], help="x0,y0,x1,y1 (applies to every --at)")
ap.add_argument("--name", default="custom")
ap.add_argument("--colours", action="store_true", help="also fit the six palette colours (prints a [palette] block)")
a = ap.parse_args()
S = 8; W, H = 1280 // S, 720 // S

def frame(t):
    png = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", a.video, "-frames:v", "1", "-vf", "scale=1280:720", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True, check=True).stdout
    return Image.open(io.BytesIO(png)).convert("RGB")

data = []
for t in a.at:
    im = frame(t)
    arr = np.asarray(im.resize((W, H), Image.BOX)).astype(float) / 255
    m = np.ones((H, W), bool)
    for r in a.mask:
        x0, y0, x1, y1 = (int(v) for v in r.split(","))
        m[y0 // S:(y1 + S - 1) // S, x0 // S:(x1 + S - 1) // S] = False
    data.append((t, im, arr, m))

blue = {"white": [204.3, 227.3, 242.7], "cyan": [16.6, 169.7, 234.6], "peri": [32.9, 107.0, 244.5], "deep": [5.5, 6.1, 229.4], "navy": [0.8, 0.0, 86.4], "glow": [182.9, 207.3, 255.0]}
cols = {k: np.array(v) / 255 for k, v in blue.items()}
lo = np.array([M.GLO[k] for k in M.GEOM]); hi = np.array([M.GHI[k] for k in M.GEOM])
starts = [M.G0, dict(M.G0, b0=0.15, b1=0.6), dict(M.G0, b0=0.4, b1=0.1, b2=0.1, lx=0.2, ly=1.3), dict(M.G0, b0=0.12, b1=1.6, b2=-1.2, b3=0.3, lx=-0.2, ly=0.9, lr=1.3)]

def fit_geom(arr, m, g0s):
    def r(v):
        return ((M.render(cols, dict(zip(M.GEOM, v)), W, H) - arr) * m[..., None]).ravel()
    best = None
    for g0 in g0s:
        v0 = np.clip(np.array([g0[k] for k in M.GEOM]), lo + 1e-6, hi - 1e-6)
        res = least_squares(r, v0, bounds=(lo, hi), x_scale="jac", max_nfev=150)
        if best is None or res.cost < best.cost: best = res
    return dict(zip(M.GEOM, best.x))

geoms = [fit_geom(arr, m, starts) for _, _, arr, m in data]
if a.colours:
    for _ in range(2):
        def rc(v):
            c = {k: v[i * 3:i * 3 + 3] for i, k in enumerate(M.COLS)}
            return np.concatenate([((M.render(c, g, W, H) - arr) * m[..., None]).ravel() for g, (_, _, arr, m) in zip(geoms, data)])
        res = least_squares(rc, np.clip(np.concatenate([cols[k] for k in M.COLS]), 1e-6, 1 - 1e-6), bounds=(0, 1), max_nfev=40)
        cols = {k: res.x[i * 3:i * 3 + 3] for i, k in enumerate(M.COLS)}
        geoms = [fit_geom(arr, m, [g]) for g, (_, _, arr, m) in zip(geoms, data)]
os.makedirs("review", exist_ok=True)
for (t, im, arr, m), g in zip(data, geoms):
    err = np.abs(M.render(cols, g, W, H) - arr)[m].mean() * 255
    vals = ", ".join(f"{g[k]:.4f}" for k in M.GEOM)
    print(f'    ("{a.name}", [{vals}]), // {os.path.basename(a.video)} @ {t:.2f}s, mean err {err:.1f}/255')
    r = (M.render(cols, g, 320, 180) * 255).astype(np.uint8)
    Image.fromarray(np.concatenate([np.asarray(im.resize((320, 180))), r], axis=1)).save(f"review/bgfit_{a.name}_{t:.2f}.png")
if a.colours:
    print("[palette]")
    for k, key in zip(M.COLS, ["bg_white", "bg_cyan", "bg_peri", "bg_deep", "bg_navy", "bg_glow"]):
        c = np.clip(np.round(cols[k] * 255), 0, 255).astype(int)
        print(f'{key} = "#{c[0]:02x}{c[1]:02x}{c[2]:02x}"')
