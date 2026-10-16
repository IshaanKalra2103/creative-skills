"""Refine a similarity fit with ECC (affine), print per-tick params and save overlays.
usage: python tools/ecc_b.py SRC.jpg FIT.json TICK0 TICK1 OUTDIR [ign y0 y1 x0 x1]"""
import sys, json, os
import cv2
import numpy as np
REF = "../reference/f10/{:03d}.png"
src = cv2.imread(sys.argv[1]); fit = json.load(open(sys.argv[2]))
k0, k1, outd = int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
ign = [int(v) for v in sys.argv[6:10]] if len(sys.argv) >= 10 else None
os.makedirs(outd, exist_ok=True)
res = {}
prev = None
for k in range(k0, k1 + 1):
    ref = cv2.imread(REF.format(k + 1))
    v = fit.get(str(k))
    if v is None or v["s"] < 0.3:
        if prev is None: continue
        v = prev
    a = np.radians(v["rot"]); s = v["s"]
    M = np.float32([[s*np.cos(a), -s*np.sin(a), v["tx"]], [s*np.sin(a), s*np.cos(a), v["ty"]]])
    warped = cv2.warpAffine(src, M, (720, 1280), flags=cv2.INTER_AREA)
    # ECC: find W so that ref(x) ~ warped(W x); then total = W^-1 o M
    g1 = cv2.GaussianBlur(cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY), (5, 5), 0).astype(np.float32)
    g2 = cv2.GaussianBlur(cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY), (5, 5), 0).astype(np.float32)
    mask = (cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY) > 0).astype(np.uint8) * 255
    if ign: mask[ign[0]:ign[1], ign[2]:ign[3]] = 0
    W = np.eye(2, 3, dtype=np.float32)
    try:
        cc, W = cv2.findTransformECC(g2, g1, W, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), mask, 5)
    except cv2.error as e:
        cc = -1
    # g2(W p) ~ g1(p)  => screen point p corresponds to warped point W p; so src -> screen is W^-1 o M
    W3 = np.vstack([W, [0, 0, 1]]); M3 = np.vstack([M, [0, 0, 1]])
    T = np.linalg.inv(W3) @ M3
    s2 = float(np.sqrt(abs(np.linalg.det(T[:2, :2])))); r2 = float(np.degrees(np.arctan2(T[1, 0] - T[0, 1], T[0, 0] + T[1, 1])))
    res[k] = dict(s=s2, rot=r2, tx=float(T[0, 2]), ty=float(T[1, 2]), cc=float(cc), A=T[:2].tolist())
    print(f"{k:4d} s={s2:.5f} rot={r2:7.3f} tx={T[0,2]:8.2f} ty={T[1,2]:8.2f} cc={cc:.3f}")
    fin = cv2.warpAffine(src, T[:2].astype(np.float32), (720, 1280), flags=cv2.INTER_AREA)
    cv2.imwrite(f"{outd}/{k}.jpg", np.hstack([ref, fin, cv2.addWeighted(ref, 0.5, fin, 0.5, 0)]))
    prev = res[k]
json.dump(res, open(f"{outd}/ecc.json", "w"), indent=1)
