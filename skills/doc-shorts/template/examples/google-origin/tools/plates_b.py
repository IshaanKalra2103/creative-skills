"""Build builder-B photo plates (Larry, Sergey, Stanford, Nightmare, Garage, Board, Faces).

Each plate is the best source we have, colour-matched to the reel: per-channel tone curves are
learned from pixel pairs (source warped onto a reference tick vs that tick), with the film look
our renderer adds on top (scanlines/halftone/vignette multiply, about x0.87 on photos) divided
out. Run from film-B/:  uv run --with opencv-python-headless --with numpy python tools/plates_b.py [names...]
"""
import json
import sys

import cv2
import numpy as np

SRC = "../assets/src/"
REF = "../reference/f10/{:03d}.png"
OUT = "assets/"
LOOK = 0.87  # mean multiplier of our look layer on photo shots


def ref(k):
    return cv2.imread(REF.format(k + 1))


def warp(img, A, size=(720, 1280)):
    return cv2.warpAffine(img, np.float32(A), size, flags=cv2.INTER_AREA, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))


def learn_curves(pairs):
    """pairs: list of (warped_src, ref, valid_mask). Returns 3 LUTs (256) mapping src -> target:
    a robust quadratic per channel (binned medians, weighted by count), monotonic, clipped."""
    luts = []
    for c in range(3):
        xs, ys = [], []
        for w, r, m in pairs:
            wb = cv2.GaussianBlur(w, (7, 7), 0)
            rb = cv2.GaussianBlur(r, (7, 7), 0)
            xs.append(wb[..., c][m]); ys.append(rb[..., c][m].astype(float) / LOOK)
        x = np.concatenate(xs); y = np.concatenate(ys)
        bx, by, bw = [], [], []
        for v in range(0, 256, 4):
            sel = y[(x >= v) & (x < v + 4)]
            if len(sel) > 30:
                bx.append(v + 1.5); by.append(np.median(sel)); bw.append(np.sqrt(len(sel)))
        coef = np.polyfit(bx, by, 2, w=bw)
        lut = np.polyval(coef, np.arange(256))
        lut = np.maximum.accumulate(np.clip(lut, 0, 255))
        luts.append(lut)
    return luts


def apply_luts(img, luts):
    out = img.copy()
    for c in range(3):
        out[..., c] = luts[c].astype(np.uint8)[img[..., c]]
    return out


def valid_mask(w, boxes):
    m = w.max(2) > 0
    m = cv2.erode(m.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    for y0, y1, x0, x1 in boxes:
        m[y0:y1, x0:x1] = False
    return m


def pad(img, p):
    return cv2.copyMakeBorder(img, p, p, p, p, cv2.BORDER_REPLICATE)


# ── servers: Larry, Sergey, Faces ────────────────────────────────────────────────────────

def servers():
    src = cv2.imread(SRC + "servers.jpg")
    e = json.load(open("tools/fit_servers.json"))
    pairs = []
    for k, cap in [(44, (590, 780, 150, 600)), (46, (590, 780, 150, 600)), (53, (600, 780, 150, 620)), (55, (600, 780, 180, 640))]:
        A = e[str(k)]["A"]
        w = warp(src, A); r = ref(k)
        pairs.append((w, r, valid_mask(w, [cap])))
    luts = learn_curves(pairs)
    graded = apply_luts(src, luts)
    # the reel's plate is softer than the 2003 original
    graded = cv2.GaussianBlur(graded, (0, 0), 1.3)
    out = pad(graded, 200)
    cv2.imwrite(OUT + "larry_servers.jpg", out, [cv2.IMWRITE_JPEG_QUALITY, 93])
    print("larry_servers.jpg", out.shape[1], out.shape[0], "(pad 200)")


# ── reference-derived plates ─────────────────────────────────────────────────────────────

def unlook(img):
    """Undo the film look baked into a reference frame so ours can be re-applied on top:
    notch out the scanlines (5.38 px) and the 30-degree halftone screen (6 px), then divide
    out the look's mean darkening and our vignette."""
    out = np.zeros_like(img, dtype=np.float32)
    h, w = img.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.fftfreq(w)[None, :]
    keep = np.ones((h, w), np.float32)
    def notch(cy, cx, r):
        d = np.hypot(fy - cy, fx - cx)
        return 1 - np.exp(-(d / r) ** 2)
    for n in (1, 2):
        keep *= notch(n / 5.38, 0, 0.006) * notch(-n / 5.38, 0, 0.006)
    a = np.radians(30)
    for ang in (a, a + np.pi / 2):
        for sgn in (1, -1):
            keep *= notch(sgn * np.sin(ang) / 6.0, sgn * np.cos(ang) / 6.0, 0.008)
    for c in range(3):
        F = np.fft.fft2(img[..., c].astype(np.float32))
        out[..., c] = np.real(np.fft.ifft2(F * keep))
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot((xx / w - 0.5), (yy / h - 0.5) * 0.72)
    sm = np.clip((r - 0.30) / (0.78 - 0.30), 0, 1); sm = sm * sm * (3 - 2 * sm)
    vig = 1 - 0.12 * sm
    out = out / (LOOK * vig[..., None])
    return np.clip(out, 0, 255).astype(np.uint8)


def red_text_mask(img, grow=9):
    b, g, r = [img[..., i].astype(int) for i in range(3)]
    m = ((r - g > 70) & (r > 120) & (r - b > 60)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    return cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (grow, grow))) > 0


def local_fit(src, dst, msrc, mdst, box):
    """Similarity mapping src -> dst from SIFT features inside `box` (dst coords, grown),
    excluding masked pixels in both."""
    sift = cv2.SIFT_create(nfeatures=4000)
    y0, y1, x0, x1 = box
    ms = np.zeros(src.shape[:2], np.uint8); md = np.zeros(dst.shape[:2], np.uint8)
    ms[max(0, y0 - 250):y1 + 250, max(0, x0 - 250):x1 + 250] = 255
    md[max(0, y0 - 150):y1 + 150, max(0, x0 - 150):x1 + 150] = 255
    ms[msrc] = 0; md[mdst] = 0
    ks, ds_ = sift.detectAndCompute(cv2.cvtColor(src, cv2.COLOR_BGR2GRAY), ms)
    kd, dd = sift.detectAndCompute(cv2.cvtColor(dst, cv2.COLOR_BGR2GRAY), md)
    if ds_ is None or dd is None: return None, 0
    m = cv2.BFMatcher().knnMatch(ds_, dd, k=2)
    good = [a for a, b in (p for p in m if len(p) == 2) if a.distance < 0.75 * b.distance]
    if len(good) < 10: return None, 0
    ps = np.float32([ks[x.queryIdx].pt for x in good]); pd = np.float32([kd[x.trainIdx].pt for x in good])
    M, inl = cv2.estimateAffinePartial2D(ps, pd, method=cv2.RANSAC, ransacReprojThreshold=2.0, maxIters=5000)
    return M, (0 if M is None else int(inl.sum()))


def clean_caption(k, ticks, grow=13):
    """Reference tick k with its red caption replaced by aligned pixels from other ticks."""
    img = ref(k).copy()
    mask = red_text_mask(img, grow)
    if not mask.any():
        return img, mask
    ys, xs = np.where(mask)
    box = (ys.min(), ys.max(), xs.min(), xs.max())
    todo = mask.copy()
    for n in sorted(ticks, key=lambda n: abs(n - k)):
        if n == k or not todo.any(): continue
        other = ref(n); mo = red_text_mask(other, grow)
        M, inl = local_fit(other, img, mo, mask, box)
        if M is None or inl < 12: continue
        w = cv2.warpAffine(other, M, (720, 1280), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0))
        valid = cv2.warpAffine((~mo).astype(np.uint8) * 255, M, (720, 1280), flags=cv2.INTER_NEAREST) > 0
        valid &= cv2.warpAffine(np.full((1280, 720), 255, np.uint8), M, (720, 1280), flags=cv2.INTER_NEAREST) > 0
        fill = todo & valid
        img[fill] = w[fill]
        todo &= ~fill
        print(f"  tick {k}: filled {fill.sum()} px from tick {n} ({inl} inliers), {todo.sum()} left")
    if todo.any():
        img = cv2.inpaint(img, todo.astype(np.uint8) * 255, 5, cv2.INPAINT_TELEA)
    # feather the seam
    soft = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 2.0)[..., None]
    blurred = cv2.GaussianBlur(img, (0, 0), 0.8)
    img = (img * (1 - soft * 0.5) + blurred * soft * 0.5).astype(np.uint8)
    return img, mask


def fit_src(srcimg, dst, mdst, region=None):
    """Similarity mapping a source photo onto a reference tick (SIFT + RANSAC)."""
    sift = cv2.SIFT_create(nfeatures=6000)
    ds = min(1.0, 1400 / max(srcimg.shape[:2]))
    sm = cv2.resize(srcimg, None, fx=ds, fy=ds, interpolation=cv2.INTER_AREA)
    ks, dsc = sift.detectAndCompute(cv2.cvtColor(sm, cv2.COLOR_BGR2GRAY), None)
    md = np.full(dst.shape[:2], 255, np.uint8); md[mdst] = 0
    if region is not None:
        y0, y1, x0, x1 = region; r = np.zeros_like(md); r[y0:y1, x0:x1] = 255; md &= r
    kd, dd = sift.detectAndCompute(cv2.cvtColor(dst, cv2.COLOR_BGR2GRAY), md)
    m = cv2.BFMatcher().knnMatch(dsc, dd, k=2)
    good = [a for a, b in (p for p in m if len(p) == 2) if a.distance < 0.75 * b.distance]
    if len(good) < 10: return None, 0
    ps = np.float32([ks[x.queryIdx].pt for x in good]) / ds; pd = np.float32([kd[x.trainIdx].pt for x in good])
    M, inl = cv2.estimateAffinePartial2D(ps, pd, method=cv2.RANSAC, ransacReprojThreshold=2.5, maxIters=5000)
    return M, (0 if M is None else int(inl.sum()))


def stanford():
    """The reel's Stanford shot is a composite (Getty 524309146 people, AI-extended and
    re-synthesised, on a Hoover Tower backdrop) with separately animated layers; the Getty
    pixels do not match it (SIFT finds <5 inliers). So the plates are the reference ticks
    themselves with the red caption inpainted; our caption is redrawn on the same spot."""
    for k in range(56, 66):
        img = ref(k)
        mask = red_text_mask(img, 37)
        img = cv2.inpaint(img, mask.astype(np.uint8) * 255, 15, cv2.INPAINT_NS)
        cv2.imwrite(OUT + f"stanford_t{k - 56:02d}.jpg", unlook(img), [cv2.IMWRITE_JPEG_QUALITY, 94])
    print("stanford_t00..09.jpg")


def card_rect(img, bg_l=190):
    """Bounding box of the non-grey card on a flat grey ground."""
    a = img.astype(int); L = a.mean(2); sat = a.max(2) - a.min(2)
    bg = (np.abs(L - bg_l) < 22) & (sat < 14)
    m = cv2.morphologyEx((~bg).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    i = 1 + np.argmax(st[1:, 4])
    return [int(v) for v in st[i][:4]]


def white_text_mask(img, region, grow=11, thr=150, sat=50):
    y0, y1, x0, x1 = region
    m = np.zeros(img.shape[:2], np.uint8)
    sub = img[y0:y1, x0:x1].astype(int)
    m[y0:y1, x0:x1] = ((sub.min(2) > thr) & ((sub.max(2) - sub.min(2)) < sat)).astype(np.uint8)
    return cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (grow, grow))) > 0


def nightmare():
    """The meme is video (the face moves every tick) and its source needs a YouTube sign-in,
    so each tick's card is cropped from the reference with the caption inpainted (it sits on
    the black T-shirt). Rects go to tools/nightmare_rects.json."""
    rects = {}
    for k in range(111, 120):
        img = ref(k)
        x, y, w, h = card_rect(img)
        cx = x + 297 if k <= 113 else (x + w // 2 if k < 119 else 362)
        half = int(0.36 * min(w, 600))
        mask = white_text_mask(img, (y + int(h * 0.74), y + h - 4, cx - half, cx + half), 13, 112, 42)
        clean = cv2.inpaint(img, mask.astype(np.uint8) * 255, 9, cv2.INPAINT_NS)
        crop = unlook(clean)[y:y + h, x:x + w]
        cv2.imwrite(OUT + f"nightmare_t{k - 111:02d}.jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 94])
        rects[k - 111] = [x, y, w, h]
    json.dump(rects, open("tools/nightmare_rects.json", "w"))
    print("nightmare_t00..08.jpg", rects)


def garage():
    """The reel's 1998 office photo is outpainted (joists, shoes), so the plate is a mosaic of
    reference ticks 169-179 in tick-179 coordinates at 2x: zoomed-in ticks first (sharper),
    caption pixels skipped, canvas 80 px wider on the right for the final pan. Per-tick
    transforms (tools/chain_garage.json) come from chaining consecutive tick fits."""
    ch = json.load(open("tools/chain_garage.json"))
    Z, W, H = 2.0, 800, 1280  # master coords: tick 179 pixels, x in -0..800
    canvas = np.zeros((int(H * Z), int(W * Z), 3), np.float32)
    have = np.zeros(canvas.shape[:2], bool)
    for k in [169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179]:
        img = ref(k)
        # caption pixels: near-white and neutral inside the caption band (a local-contrast mask
        # was tried and ate the plaid shirt)
        cap = white_text_mask(img, (560, 700, 150, 660), 11, 135, 45)
        c = ch[str(k)]
        # screen = s*(p - (360,640)) + (x,y); canvas q = Z*p  => screen = (s/Z) q + (x,y) - s*(360,640)
        sc = c["s"] / Z
        A = np.float32([[sc, 0, c["x"] - c["s"] * 360], [0, sc, c["y"] - c["s"] * 640]])
        Ainv = cv2.invertAffineTransform(A)
        w = cv2.warpAffine(unlook(img).astype(np.float32), Ainv, (canvas.shape[1], canvas.shape[0]), flags=cv2.INTER_CUBIC)
        ok = cv2.warpAffine((~cap).astype(np.uint8) * 255, Ainv, (canvas.shape[1], canvas.shape[0]), flags=cv2.INTER_NEAREST) > 0
        inside = cv2.warpAffine(np.full((1280, 720), 255, np.uint8), Ainv, (canvas.shape[1], canvas.shape[0]), flags=cv2.INTER_NEAREST) > 0
        inside = cv2.erode(inside.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        sel = ok & inside & ~have
        canvas[sel] = w[sel]; have |= sel
    hole = (~have).astype(np.uint8) * 255
    out = cv2.inpaint(np.clip(canvas, 0, 255).astype(np.uint8), hole, 7, cv2.INPAINT_TELEA)
    cv2.imwrite(OUT + "garage_mosaic.jpg", out, [cv2.IMWRITE_JPEG_QUALITY, 93])
    print("garage_mosaic.jpg", out.shape[1], out.shape[0], "holes", int((~have).sum()))


def board():
    """Board: no caption; the camera pans 108 px right (decelerating). The reel's frame is an
    outpainted full-length view (board.jpg, the exact photo, is cropped tight), so the plate is
    a mosaic of reference ticks in tick-180 coordinates, 120 px wider on the left for the pan."""
    ch = json.load(open("tools/chain_board.json"))
    OX = 120
    canvas = np.zeros((1280, 720 + OX, 3), np.float32); have = np.zeros(canvas.shape[:2], bool)
    for k in range(180, 192):
        c = ch[str(k)]
        # screen = s*(p - (360,640)) + (x,y), canvas q = p + (OX, 0)
        sc = c["s"]
        A = np.float32([[sc, 0, c["x"] - sc * (360 + OX)], [0, sc, c["y"] - sc * 640]])
        Ainv = cv2.invertAffineTransform(A)
        w = cv2.warpAffine(unlook(ref(k)).astype(np.float32), Ainv, (canvas.shape[1], canvas.shape[0]), flags=cv2.INTER_CUBIC)
        inside = cv2.warpAffine(np.full((1280, 720), 255, np.uint8), Ainv, (canvas.shape[1], canvas.shape[0]), flags=cv2.INTER_NEAREST) > 0
        inside = cv2.erode(inside.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        sel = inside & ~have
        canvas[sel] = w[sel]; have |= sel
    out = cv2.inpaint(np.clip(canvas, 0, 255).astype(np.uint8), (~have).astype(np.uint8) * 255, 5, cv2.INPAINT_TELEA)
    cv2.imwrite(OUT + "board_mosaic.jpg", out, [cv2.IMWRITE_JPEG_QUALITY, 94])
    print("board_mosaic.jpg", out.shape[1], out.shape[0], "holes", int((~have).sum()))


PLATES = {"servers": servers, "stanford": stanford, "nightmare": nightmare, "garage": garage, "board": board}

if __name__ == "__main__":
    names = sys.argv[1:] or list(PLATES)
    for n in names:
        PLATES[n]()
