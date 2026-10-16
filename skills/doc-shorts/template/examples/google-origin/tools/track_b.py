"""Per-tick translation of a plate at FIXED scale/rotation: where src anchor (ax, ay) lands on
screen, via normalized cross-correlation of the warped plate against each reference tick.
usage: python tools/track_b.py SRC s rot ax ay TICK0 TICK1 guess_x guess_y [ign y0 y1 x0 x1]"""
import sys
import cv2
import numpy as np
REF = "../reference/f10/{:03d}.png"
src = cv2.imread(sys.argv[1])
s, rot, ax, ay = map(float, sys.argv[2:6]); k0, k1 = int(sys.argv[6]), int(sys.argv[7])
gx, gy = float(sys.argv[8]), float(sys.argv[9])
ign = [int(v) for v in sys.argv[10:14]] if len(sys.argv) >= 14 else None
a = np.radians(rot)
R = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]]) * s
# canvas: anchor at (C, C)
C = 2200
t = np.array([C, C]) - R @ np.array([ax, ay])
M = np.hstack([R, t.reshape(2, 1)]).astype(np.float32)
big = cv2.warpAffine(src, M, (2 * C, 2 * C), flags=cv2.INTER_AREA)
bigg = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY)
bigg = cv2.GaussianBlur(bigg, (5, 5), 0)
for k in range(k0, k1 + 1):
    r = cv2.cvtColor(cv2.imread(REF.format(k + 1)), cv2.COLOR_BGR2GRAY)
    r = cv2.GaussianBlur(r, (5, 5), 0)
    # template: a band of the reference avoiding the caption and the frame edges
    y0, y1, x0, x1 = 60, 600, 40, 680
    if ign and ign[0] < 600: y0, y1 = ign[1], 1220
    tpl = r[y0:y1, x0:x1]
    # search window around the guess
    best = None
    sx, sy = int(C - gx + x0), int(C - gy + y0)
    pad = 420
    win = bigg[max(0, sy - pad):sy + (y1 - y0) + pad, max(0, sx - pad):sx + (x1 - x0) + pad]
    res = cv2.matchTemplate(win, tpl, cv2.TM_CCOEFF_NORMED)
    _, mx, _, loc = cv2.minMaxLoc(res)
    wx, wy = max(0, sx - pad) + loc[0], max(0, sy - pad) + loc[1]
    # screen pos of anchor: anchor in big at (C,C); template top-left in big at (wx,wy) corresponds to screen (x0,y0)
    px, py = C - wx + x0, C - wy + y0
    print(f"{k:4d} anchor=({px:7.1f},{py:7.1f}) ncc={mx:.3f}")
    gx, gy = px, py
