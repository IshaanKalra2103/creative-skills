"""Per-tick similarity of a src REGION (a cropped card) onto reference ticks.
usage: python tools/fitcard_b.py SRC sx0 sy0 sx1 sy1 TICK0 TICK1 OUT.json"""
import sys, json
import cv2
import numpy as np
REF = "../reference/f10/{:03d}.png"
src = cv2.imread(sys.argv[1], cv2.IMREAD_GRAYSCALE)
sx0, sy0, sx1, sy1 = map(int, sys.argv[2:6]); k0, k1 = int(sys.argv[6]), int(sys.argv[7])
sift = cv2.SIFT_create(nfeatures=4000)
crop = src[sy0:sy1, sx0:sx1]
res = {}
for k in range(k0, k1 + 1):
    r = cv2.imread(REF.format(k + 1), cv2.IMREAD_GRAYSCALE)
    # rescale crop roughly to ref scale for better SIFT: try several pyramid levels
    best = None
    for f in [0.15, 0.22, 0.3, 0.45, 0.65, 0.9]:
        c = cv2.resize(crop, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
        kc, dc = sift.detectAndCompute(c, None)
        kr, dr = sift.detectAndCompute(r, None)
        if dc is None or dr is None or len(kc) < 8: continue
        m = cv2.BFMatcher().knnMatch(dc, dr, k=2)
        good = [a for a, b in (p for p in m if len(p) == 2) if a.distance < 0.75 * b.distance]
        if len(good) < 8: continue
        ps = np.float32([kc[g.queryIdx].pt for g in good]) / f + [sx0, sy0]
        pr = np.float32([kr[g.trainIdx].pt for g in good])
        M, inl = cv2.estimateAffinePartial2D(ps, pr, method=cv2.RANSAC, ransacReprojThreshold=2.5, maxIters=5000)
        if M is None: continue
        n = int(inl.sum())
        if best is None or n > best[1]: best = (M, n, f)
    if best is None: print(k, "fail"); continue
    M, n, f = best
    s = float(np.hypot(M[0, 0], M[1, 0])); rot = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
    res[k] = dict(s=s, rot=rot, A=M.tolist(), inl=n)
    print(f"{k} s={s:.4f} rot={rot:6.2f} tx={M[0,2]:8.1f} ty={M[1,2]:8.1f} inl={n} f={f}")
json.dump(res, open(sys.argv[8], "w"), indent=1)
