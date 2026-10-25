# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow", "numpy"]
# ///
"""Unpack a raw clip into a frame source: SPOT/frames/<name>/0000.png onwards, every frame as
delivered (no resampling, so a 24 fps clip stays 24 fps; plates.py and snaps.py set the speed
with `step`). Prints the size, rate and count to note in spot.json.
usage: uv run tools/unpack.py CLIP.mp4 SPOT NAME
"""
import os, subprocess, sys
from spotlib import Spot, probe

clip, spot, name = sys.argv[1], Spot(sys.argv[2]), sys.argv[3]
out = spot.path("frames", name)
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if f.endswith(".png"):
        os.remove(os.path.join(out, f))
subprocess.run(["ffmpeg", "-v", "error", "-i", clip, "-start_number", "0", "-fps_mode", "passthrough",
                os.path.join(out, "%04d.png")], check=True)
w, h, fps, n = probe(clip)
print(f"frames/{name}: {len(os.listdir(out))} frames, {w}x{h} at {fps:g} fps ({n / fps:.2f} s)")
print(f'add to spot.json "sources": "{name}": "frames/{name}"')
