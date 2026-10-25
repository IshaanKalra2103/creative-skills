# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow", "numpy"]
# ///
"""Video plates: each `segments` entry in spot.json maps a run of global frames to a run of
source frames, sped up by `step` (a fractional step interpolates, a step above 1 blends toward
the next frame for a slow-shutter smear), scaled to cover the frame with a slow zoom and roll.
Writes renders/<shot>/NNNN.png, where assemble.py looks.
usage: uv run tools/plates.py SPOT [first-last]
"""
import sys
from spotlib import Spot, cover, lerp, range_arg

spot = Spot(sys.argv[1])
lo, hi = range_arg(sys.argv[2] if len(sys.argv) > 2 else None)
for seg in spot.data.get("segments", []):
    g0, g1 = seg["at"]
    if g1 < lo or g0 > hi:
        continue
    src = spot.source(seg["src"])
    step = seg.get("step", 1.0)
    for g in range(max(g0, lo), min(g1, hi) + 1):
        t = (g - g0) / max(1, g1 - g0)
        img = src.sample(seg.get("start", 0) + step * (g - g0), step)
        fx, fy = seg.get("focus", (0.5, 0.5))
        out = cover(img, spot.W, spot.H, lerp(seg.get("zoom", (1, 1)), t), fx, fy, lerp(seg.get("roll", (0, 0)), t))
        out.save(spot.out_path(g))
    end = seg.get("start", 0) + step * (g1 - g0)
    print(f"{g0:4d}-{g1:4d} {spot.shot_at(g0)['id']:12} <- {seg['src']} {seg.get('start', 0)}..{end:.0f}")
