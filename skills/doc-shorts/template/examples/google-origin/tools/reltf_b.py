"""Similarity transform of each reference tick relative to a master tick, using features in a
region mask (screen coords of the tick being matched).
usage: python tools/reltf_b.py MASTER TICK0 TICK1 [region y0 y1 x0 x1 | -] [ign y0 y1 x0 x1]"""
import sys, json
import cv2
import numpy as np
REF = "../reference/f10/{:03d}.png"
master = int(sys.argv[1]); k0, k1 = int(sys.argv[2]), int(sys.argv[3])
reg = [int(v) for v in sys.argv[4:8]] if len(sys.argv) >= 8 and sys.argv[4] != "-" else None
sift = cv2.SIFT_create(nfeatures=5000)
mg = cv2.imread(REF.format(master + 1), cv2.IMREAD_GRAYSCALE)
km, dm = sift.detectAndCompute(mg, None)
out = {}
for k in range(k0, k1 + 1):
    g = cv2.imread(REF.format(k + 1), cv2.IMREAD_GRAYSCALE)
    mask = np.zeros_like(g) if reg else np.full_like(g, 255)
    if reg: mask[reg[0]:reg[1], reg[2]:reg[3]] = 255
    kk, dk = sift.detectAndCompute(g, mask)
    m = cv2.BFMatcher().knnMatch(dk, dm, k=2)
    good = [a for a, b in (p for p in m if len(p) == 2) if a.distance < 0.75 * b.distance]
    if len(good) < 8: print(k, "few", len(good)); continue
    pk = np.float32([kk[x.queryIdx].pt for x in good]); pm = np.float32([km[x.trainIdx].pt for x in good])
    # transform from MASTER coords to tick-k screen coords
    M, inl = cv2.estimateAffinePartial2D(pm, pk, method=cv2.RANSAC, ransacReprojThreshold=2.5, maxIters=5000)
    s = float(np.hypot(M[0, 0], M[1, 0])); r = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
    out[k] = dict(s=s, rot=r, A=M.tolist(), inl=int(inl.sum()))
    print(f"{k} s={s:.4f} rot={r:6.2f} tx={M[0,2]:8.1f} ty={M[1,2]:8.1f} inl={int(inl.sum())}/{len(good)}")
json.dump(out, open(f"/tmp/rel_{master}_{k0}_{k1}.json", "w"), indent=1)
