"""Cut the blue-face/brain/spiral-glasses collage out of a Hypno reference frame.
The rings behind it are saturated red and yellow; everything in the collage is either a
different hue (blue skin, grey hair, black/white glasses) or a softer pink (brain, tongue).
usage: uv run --with pillow --with numpy --with opencv-python-headless python tools/hypno_cutout.py IN.png OUT.png"""
import sys
import cv2
import numpy as np

src = cv2.imread(sys.argv[1])
hsv = cv2.cvtColor(src, cv2.COLOR_BGR2HSV).astype(np.float32)
h, s, v = hsv[..., 0] * 2.0, hsv[..., 1] / 255.0, hsv[..., 2] / 255.0
ring = ((h < 70) | (h > 345)) & (s > 0.42) & (v > 0.12)
keep = (~ring).astype(np.uint8)
# the collage sits in this box on the reference frame; drop the caption above it
box = np.zeros_like(keep)
box[455:1000, 130:610] = 1
keep &= box
keep = cv2.morphologyEx(keep, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
n, lab, stats, _ = cv2.connectedComponentsWithStats(keep, 8)
big = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
mask = (lab == big).astype(np.uint8) * 255
# fill holes (mouth interior, tongue, lens whites)
flood = mask.copy()
hh, ww = mask.shape
ff = np.zeros((hh + 2, ww + 2), np.uint8)
cv2.floodFill(flood, ff, (0, 0), 255)
mask = mask | cv2.bitwise_not(flood)
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
mask = cv2.erode(mask, np.ones((3, 3), np.uint8))
alpha = cv2.GaussianBlur(mask, (5, 5), 1.2)
x, y, w, hgt = cv2.boundingRect(mask)
pad = 6
x0, y0 = max(x - pad, 0), max(y - pad, 0)
x1, y1 = min(x + w + pad, ww), min(y + hgt + pad, hh)
# soften the reference's baked-in scanlines (5.4 px period) so ours don't double them
soft = cv2.GaussianBlur(src, (1, 9), sigmaX=0, sigmaY=1.7)
rgba = np.dstack([soft, alpha])[y0:y1, x0:x1]
cv2.imwrite(sys.argv[2], rgba)
print("crop origin", x0, y0, "size", x1 - x0, y1 - y0)
