#!/usr/bin/env bash
# Pull the unique designs out of a reference reel (hard cuts between stamps on flat colour fields).
#   scripts/ref-frames.sh <video> <outdir>   → outdir/f_###.png (unique frames) + outdir/sheet.png (labelled)
# Scene detection (select='gt(scene,…)') finds nothing on these reels: flat fields, small-object cuts.
# mpdecimate drops near-duplicate frames instead. Reels usually loop — read the sheet and keep the first run.
set -euo pipefail
video=${1:?video}; out=${2:?outdir}; mkdir -p "$out"; rm -f "$out"/f_*.png
ffmpeg -v error -i "$video" -vf "mpdecimate=hi=6000:lo=3000:frac=0.5,setpts=N/FRAME_RATE/TB" -fps_mode vfr "$out/f_%03d.png"
uv run -q --with pillow python - "$out" <<'PY'
import sys, glob
from PIL import Image, ImageDraw
out = sys.argv[1]; fs = sorted(glob.glob(f"{out}/f_*.png")); W = 220; cols = 8
h = int(W * Image.open(fs[0]).height / Image.open(fs[0]).width)
s = Image.new("RGB", (cols * W, h * ((len(fs) + cols - 1) // cols)))
for i, f in enumerate(fs):
    im = Image.open(f).convert("RGB").resize((W, h)); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 30, 18), fill="yellow"); d.text((4, 3), str(i + 1), fill="black")
    s.paste(im, ((i % cols) * W, (i // cols) * h))
s.save(f"{out}/sheet.png"); print(f"{len(fs)} frames → {out}/sheet.png")
PY
