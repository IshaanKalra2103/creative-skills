# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow", "numpy"]
# ///
"""Study a reference spot's editing: every cut (from the frame-to-frame change of a small
grey copy), how long each shot holds, a histogram of hold lengths, and a contact sheet of
each shot's first frame labelled with its frame number and hold. Snap-cut sections show up as
runs of 2-4 frame holds; look at those frame by frame with sheet.py.
usage: uv run tools/study.py REF.mp4 OUT_DIR [--fps 30] [--k 3.5]
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
opts = {"--fps": "30", "--k": "3.5"}
for k in list(opts):
    if k in args:
        i = args.index(k)
        opts[k] = args[i + 1]
        del args[i:i + 2]
ref, out = args
os.makedirs(out, exist_ok=True)
fps = float(opts["--fps"])
w, h = 48, 60
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", ref, "-vf", f"fps={fps},scale={w}:{h},format=gray",
                      "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
v = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
d = np.abs(np.diff(v, axis=0)).mean((1, 2))
# a cut is a change well above the local motion level
cuts = [0]
for i, x in enumerate(d):
    local = np.median(d[max(0, i - 8):i + 9])
    if x > max(6.0, float(opts["--k"]) * local) and i + 1 - cuts[-1] >= 2:
        cuts.append(i + 1)
holds = [b - a for a, b in zip(cuts, cuts[1:] + [len(v)])]
print(f"{ref}: {len(v)} frames, {len(cuts)} shots")
print("cut  hold")
for c, hl in zip(cuts, holds):
    print(f"{c:5d} {hl:4d}  {'#' * min(hl, 60)}")
hist = np.bincount(holds)
print("\nholds (frames: count):", ", ".join(f"{n}: {c}" for n, c in enumerate(hist) if c))
json.dump({"fps": fps, "cuts": cuts, "holds": holds}, open(os.path.join(out, "cuts.json"), "w"), indent=1)

# contact sheet of each shot's first frame
tmp = os.path.join(out, "cut_frames")
os.makedirs(tmp, exist_ok=True)
sel = "+".join(f"eq(n\\,{c})" for c in cuts)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", ref, "-vf", f"fps={fps},select='{sel}',scale=240:-2",
                "-fps_mode", "passthrough", os.path.join(tmp, "%04d.jpg")], check=True)
tiles = [Image.open(os.path.join(tmp, f)).convert("RGB") for f in sorted(os.listdir(tmp))]
tw, th = tiles[0].size
cols = 10
sheet = Image.new("RGB", (cols * (tw + 4) + 4, -(-len(tiles) // cols) * (th + 4) + 4), (34, 34, 34))
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default(size=16)
for i, (c, hl, im) in enumerate(zip(cuts, holds, tiles)):
    x, y = 4 + (i % cols) * (tw + 4), 4 + (i // cols) * (th + 4)
    sheet.paste(im, (x, y))
    draw.text((x + 6, y + 4), f"{c} +{hl}", fill="white", font=font, stroke_width=2, stroke_fill="black")
sheet.save(os.path.join(out, "cuts.jpg"), quality=88)
print(f"\nwrote {out}/cuts.json and {out}/cuts.jpg")
