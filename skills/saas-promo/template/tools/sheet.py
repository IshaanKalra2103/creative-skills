# /// script
# dependencies = ["pillow"]
# ///
"""Contact sheet of a render (and optionally the reference above it, same timestamps).

    uv run tools/sheet.py out.mp4 sheet.png                    # 4 fps, 8 columns
    uv run tools/sheet.py out.mp4 sheet.png --ref original.mp4 --fps 6 --from 4 --to 10"""
import argparse, os, subprocess, tempfile
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("out")
ap.add_argument("--ref"); ap.add_argument("--fps", type=float, default=4)
ap.add_argument("--from", dest="t0", type=float, default=0); ap.add_argument("--to", dest="t1", type=float, default=1e9)
ap.add_argument("--cols", type=int, default=8); ap.add_argument("--w", type=int, default=240)
a = ap.parse_args()

def grab(path, d):
    subprocess.run(["ffmpeg", "-v", "error", "-ss", str(a.t0), "-to", str(a.t1), "-i", path, "-vf", f"fps={a.fps},scale={a.w}:-1", f"{d}/%04d.png"], check=True)
    return sorted(os.path.join(d, f) for f in os.listdir(d))

with tempfile.TemporaryDirectory() as tmp:
    os.makedirs(f"{tmp}/o"); ours = grab(a.video, f"{tmp}/o")
    refs = []
    if a.ref:
        os.makedirs(f"{tmp}/r"); refs = grab(a.ref, f"{tmp}/r")
    n = len(ours)
    tile = Image.open(ours[0]); tw, th = tile.size
    rows_per = (n + a.cols - 1) // a.cols
    bands = 2 if refs else 1
    S = Image.new("RGB", (a.cols * (tw + 2), rows_per * bands * (th + 2) + (8 if refs else 0)), (30, 30, 30))
    for i, f in enumerate(ours):
        r, c = divmod(i, a.cols)
        for b, src in enumerate([refs, ours] if refs else [ours]):
            if i >= len(src): continue
            im = Image.open(src[i]).convert("RGB")
            ImageDraw.Draw(im).text((3, 2), f"{a.t0 + i / a.fps:.2f}s", fill=(255, 255, 0))
            y = (r * bands + b) * (th + 2)
            S.paste(im, (c * (tw + 2), y))
    S.save(a.out); print(a.out, n, "frames")
