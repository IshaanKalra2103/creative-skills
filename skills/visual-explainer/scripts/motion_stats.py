# /// script
# dependencies = ["numpy"]
# ///
"""Motion profile of a reel: % of frames that change, longest still hold, holds >= 0.8 s, bare frames.
uv run motion_stats.py video.mp4 [fps=30]
Bar for this style: longest still < 1.0 s, no holds >= 0.8 s apart from a deliberate beat, bare 0.
"Bare" = the subject zone (between the caption band and IG's bottom UI) is nearly flat: background and caption only.
"Jumps" = single frames that change far more than their neighbours: hard cuts, popping objects, camera snaps. Perspective
shifts in this style are one continuous camera move, so every jump listed should be a deliberate cut, or gets fixed."""
import subprocess, sys
import numpy as np
v, fps = sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 30
W, H = 108, 192
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", v, "-vf", f"fps={fps},scale={W}:{H},format=gray", "-f", "rawvideo", "-"],
                     capture_output=True, check=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
d = np.abs(np.diff(f, axis=0)).mean((1, 2))
moving = d > 0.35  # mean abs diff per pixel (0-255); grain alone stays well below this
holds, run, starts = [], 0, []
for i, m in enumerate(moving):
    if not m:
        if run == 0: starts.append(i)
        run += 1
    else:
        if run: holds.append((run / fps, starts[-1] / fps))
        run = 0
if run: holds.append((run / fps, starts[-1] / fps))
zone = f[:, int(H * 0.22):int(H * 0.80), :]
bare = (zone.std((1, 2)) < 4).nonzero()[0]
longest = max(holds or [(0, 0)])
print(f"frames {len(f)}  moving {moving.mean()*100:.0f}%  longest still {longest[0]:.2f}s (at {longest[1]:.2f}s)  "
      f"holds>=0.8s {sum(h >= 0.8 for h, _ in holds)}  bare {len(bare)}" + (f" (first at {bare[0] / fps:.2f}s)" if len(bare) else ""))

# jumps: a frame-to-frame change well above the local motion level (a seam in a camera move reads as exactly this)
jumps = []
for i in range(len(d)):
    nb = np.concatenate([d[max(0, i - 6):i], d[i + 1:i + 7]])
    if len(nb) and d[i] > 10 and d[i] > 4 * max(np.median(nb), 0.5):
        jumps.append((i + 1) / fps)
print(f"jumps {len(jumps)}" + (": " + ", ".join(f"{j:.2f}s" for j in jumps) if jumps else ""))
