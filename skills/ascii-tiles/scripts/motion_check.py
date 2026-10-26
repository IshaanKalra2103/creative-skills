# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""How much each frame differs from the one before, to catch flicker and loop jumps.

    uv run motion_check.py out.mp4                 # one clip
    uv run motion_check.py source.gif out.mp4      # source first: compare the two

Prints the median and largest frame-to-frame change (mean absolute grey
difference, 0-255, on a 360 px wide copy) and the change from the last frame
back to the first. Read it like this:

- converted median well above the source median: cells are flickering
  (raise --stick, or --tile so fewer cells hover at the threshold);
- loop change far above the median in the source too: the jump is in the
  source, not the conversion;
- loop change far above the median only in the output: run with --seamless.
"""
import json
import subprocess
import sys

import numpy as np


def frames(path, w=360):
    s = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
         "-of", "json", path], check=True, capture_output=True, text=True).stdout)["streams"][0]
    h = round(s["height"] * w / s["width"] / 2) * 2
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={w}:{h}:flags=area",
                          "-f", "rawvideo", "-pix_fmt", "gray", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)


def report(path):
    a = frames(path)
    d = np.abs(np.diff(a, axis=0)).mean((1, 2))
    loop = float(np.abs(a[-1] - a[0]).mean())
    med = float(np.median(d))
    print(f"{path}\n  {len(a)} frames  median {med:.2f}  max {d.max():.2f} (after frame {int(d.argmax())})"
          f"  last->first {loop:.2f} ({loop / max(med, 1e-6):.1f}x median)")
    return med


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    meds = [report(p) for p in sys.argv[1:]]
    if len(meds) == 2:
        print(f"output / source median: {meds[1] / max(meds[0], 1e-6):.2f}x")
