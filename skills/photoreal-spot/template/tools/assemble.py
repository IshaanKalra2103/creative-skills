# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow", "numpy"]
# ///
"""runtime/plates.mp4 on the global timeline: renders/<shot>/NNNN.png for every frame before the
first `comp` shot, black where nothing is rendered (it says how many frames it found).
usage: uv run tools/assemble.py SPOT
"""
import os, subprocess, sys, tempfile
from PIL import Image
from spotlib import Spot

spot = Spot(sys.argv[1])
end = spot.plates_end()
seq = tempfile.mkdtemp()
black = os.path.join(seq, "black.png")
Image.new("RGB", (spot.W, spot.H)).save(black)
found, missing = 0, []
for s in spot.shots:
    for g in range(s["start"], min(s["end"], end)):
        p = spot.path("renders", s["id"], f"{g - s['start'] + 1:04d}.png")
        if os.path.exists(p):
            found += 1
        else:
            missing.append(g)
        os.symlink(p if os.path.exists(p) else black, os.path.join(seq, f"{g:05d}.png"))
print(f"{found} rendered frames of {end}")
if missing:
    runs, a = [], missing[0]
    for x, y in zip(missing, missing[1:] + [None]):
        if y != x + 1:
            runs.append(f"{a}-{x}" if a != x else str(a))
            a = y
    print("black at:", ", ".join(runs))
os.makedirs(spot.path("runtime"), exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(spot.fps), "-i", os.path.join(seq, "%05d.png"),
                "-vf", f"scale={spot.W}:{spot.H}:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-crf", "10",
                "-preset", "slow", "-g", "1", spot.path("runtime", "plates.mp4")], check=True)
