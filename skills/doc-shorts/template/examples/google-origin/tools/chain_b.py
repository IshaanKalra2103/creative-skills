"""Chain consecutive reference-tick similarity fits so every tick is expressed relative to a
master tick: prints per tick the scale s and the screen position (x, y) of master point (cx, cy)
so that screen = s * (p - (cx,cy)) + (x, y), with p in master-tick pixels.
usage: python tools/chain_b.py TICK0 TICK1 MASTER [cx cy]"""
import sys, json
import cv2
import numpy as np
REF = "../reference/f10/{:03d}.png"
k0, k1, master = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
cx, cy = (float(sys.argv[4]), float(sys.argv[5])) if len(sys.argv) > 5 else (360.0, 640.0)
sift = cv2.SIFT_create(nfeatures=6000)
feats = {}
def F(k):
    if k not in feats:
        g = cv2.imread(REF.format(k + 1), cv2.IMREAD_GRAYSCALE)
        # blur away the baked scanlines/halftone: they are fixed to the screen and would
        # otherwise lock low-texture shots to the identity transform
        g = cv2.GaussianBlur(g, (0, 0), 2.2)
        feats[k] = sift.detectAndCompute(g, None)
    return feats[k]
def fit(a, b):
    """similarity mapping tick-b coords -> tick-a coords"""
    ka, da = F(a); kb, db = F(b)
    m = cv2.BFMatcher().knnMatch(db, da, k=2)
    good = [x for x, y in (p for p in m if len(p) == 2) if x.distance < 0.75 * y.distance]
    pb = np.float32([kb[g.queryIdx].pt for g in good]); pa = np.float32([ka[g.trainIdx].pt for g in good])
    M, inl = cv2.estimateAffinePartial2D(pb, pa, method=cv2.RANSAC, ransacReprojThreshold=2.0, maxIters=8000)
    return np.vstack([M, [0, 0, 1]]), int(inl.sum())
T = {master: np.eye(3)}
for k in range(master - 1, k0 - 1, -1):
    M, n = fit(k, k + 1); T[k] = M @ T[k + 1]
for k in range(master + 1, k1 + 1):
    M, n = fit(k, k - 1); T[k] = M @ T[k - 1]
out = {}
for k in range(k0, k1 + 1):
    A = T[k]; s = float(np.hypot(A[0, 0], A[1, 0])); p = A @ [cx, cy, 1]
    out[k] = dict(s=s, x=float(p[0]), y=float(p[1]))
    print(f"{k} s={s:.4f} x={p[0]:.1f} y={p[1]:.1f} rot={np.degrees(np.arctan2(A[1,0],A[0,0])):.2f}")
json.dump(out, open(f"/tmp/chain_{k0}_{k1}_{master}.json", "w"), indent=1)
