"""Fit a similarity transform (scale, rotation, translation) mapping a source photo onto each
reference tick, with SIFT + RANSAC. Prints one line per tick:
  tick  scale  rot_deg  tx  ty  inliers
where screen = R(rot) * scale * src + (tx, ty), screen in ref px (720x1280).
usage: python tools/fit_b.py SRC.jpg TICK0 TICK1 [mask y0 y1 x0 x1 in ref px to ignore caption]
"""
import sys, json
import cv2
import numpy as np

REF = "../reference/f10/{:03d}.png"
src_path = sys.argv[1]
k0, k1 = int(sys.argv[2]), int(sys.argv[3])
ign = [int(v) for v in sys.argv[4:8]] if len(sys.argv) >= 8 else None
src = cv2.imread(src_path, cv2.IMREAD_GRAYSCALE)
# work on a downscaled source for speed; scale results back
ds = min(1.0, 1600 / max(src.shape))
srcs = cv2.resize(src, None, fx=ds, fy=ds, interpolation=cv2.INTER_AREA)
sift = cv2.SIFT_create(nfeatures=6000)
kps, des = sift.detectAndCompute(srcs, None)
bf = cv2.BFMatcher()
out = {}
for k in range(k0, k1 + 1):
    ref = cv2.imread(REF.format(k + 1), cv2.IMREAD_GRAYSCALE)
    mask = np.full(ref.shape, 255, np.uint8)
    if ign:
        mask[ign[0]:ign[1], ign[2]:ign[3]] = 0
    kpr, der = sift.detectAndCompute(ref, mask)
    if der is None or len(kpr) < 10:
        print(k, "no features"); continue
    m = bf.knnMatch(des, der, k=2)
    good = [a for a, b in (p for p in m if len(p) == 2) if a.distance < 0.75 * b.distance]
    if len(good) < 8:
        print(k, "few matches", len(good)); continue
    p_src = np.float32([kps[g.queryIdx].pt for g in good]) / ds
    p_ref = np.float32([kpr[g.trainIdx].pt for g in good])
    M, inl = cv2.estimateAffinePartial2D(p_src, p_ref, method=cv2.RANSAC, ransacReprojThreshold=3.0, maxIters=5000)
    if M is None:
        print(k, "fail"); continue
    s = float(np.hypot(M[0, 0], M[1, 0])); r = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
    out[k] = dict(s=s, rot=r, tx=float(M[0, 2]), ty=float(M[1, 2]), inl=int(inl.sum()))
    print(f"{k:4d} s={s:.5f} rot={r:7.3f} tx={M[0,2]:8.2f} ty={M[1,2]:8.2f} inl={int(inl.sum())}/{len(good)}")
json.dump(out, open(f"/tmp/fit_{k0}_{k1}.json", "w"), indent=1)
