# /// script
# dependencies = ["numpy"]
# ///
"""Motion profile of a video: % of frames that change, longest still hold, holds >= 0.5 s.
uv run motion_stats.py video.mp4 [fps=30]
Run it on the reference and on your render: a cut that reads as "a presentation" has a low moving share and long holds.
Reference this style was studied from: 61% moving, longest still 1.17 s. The Loopcast film: 83%, 1.07 s."""
import subprocess, sys
import numpy as np
v, fps = sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 30
W, H = 192, 108
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", v, "-vf", f"fps={fps},scale={W}:{H},format=gray", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
d = np.abs(np.diff(f, axis=0)).mean((1, 2))
moving = d > 0.35  # mean abs diff per pixel (0-255); grain alone stays well below this at 192x108
holds, run = [], 0
for m in moving:
    if not m: run += 1
    else:
        if run: holds.append(run / fps)
        run = 0
if run: holds.append(run / fps)
print(f"frames {len(d)+1}  moving {moving.mean()*100:.0f}%  longest still {max(holds or [0]):.2f}s  holds>=0.5s {sum(h >= 0.5 for h in holds)}")
