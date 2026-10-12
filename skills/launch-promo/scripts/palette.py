# /// script
# dependencies = ["pillow", "numpy"]
# ///
"""Sample colours from a video frame (7x7 px average around each point) to fill FILM.theme.

uv run palette.py ref.mp4 <time> x,y[,name] x,y[,name] ...
e.g. uv run palette.py ref.mp4 16.6 960,620,paper 230,360,ink 400,660,accent
Pick points on flat areas (backgrounds, the middle of a thick letter), not on edges or under grain clumps.
"""
import subprocess, sys, tempfile
import numpy as np
from PIL import Image

if len(sys.argv) < 4: sys.exit(__doc__)
png = tempfile.mktemp(suffix=".png")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", sys.argv[2], "-i", sys.argv[1], "-frames:v", "1", png], check=True)
a = np.asarray(Image.open(png).convert("RGB")).astype(float)
for spec in sys.argv[3:]:
    parts = spec.split(","); x, y = int(parts[0]), int(parts[1]); name = parts[2] if len(parts) > 2 else ""
    c = a[max(0, y - 3):y + 4, max(0, x - 3):x + 4].reshape(-1, 3).mean(0)
    print(f"{name:12s} ({x},{y})  #{int(c[0]):02x}{int(c[1]):02x}{int(c[2]):02x}")
