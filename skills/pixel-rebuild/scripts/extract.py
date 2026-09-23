# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow", "scipy"]
# ///
"""Rebuild a pixel-art video or GIF as sprite layers for a canvas player.

    uv run extract.py <video> [--out DIR] [--crop X,Y,W,H] [--scale S | --size WxH]
                      [--fps F] [--lo 30] [--hi 90] [--audio] [--title T]

1. Find the art's pixel grid (period + offset per axis) from where edges fall.
2. Sample every frame back down to one colour per art pixel; drop repeated frames
   and keep how long each one holds.
3. Temporal median = the static background. Whatever differs from it is cut into
   blobs, and blobs are deduped into cels (median of every repeat, so noise cancels).
4. One palette (background colours first, then sprite colours), palette-index strings.

Writes DIR/data.js, DIR/index.html (from the template, only if missing),
DIR/audio.m4a with --audio, and DIR/.check/ (orig|rebuild PNGs, native frames for check.py).
"""
import argparse
import json
import shutil
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage, sparse

SKILL = Path(__file__).resolve().parent.parent
# palette index -> one character; '~' and '.' are reserved for run-length marks
ALPHA = "".join(chr(c) for c in [*range(33, 127), *range(161, 0x2B0)]
                if chr(c) not in "\"\\~.`'\xad")
PAL_D = 24          # colours closer than this (sum |dRGB|) share a palette entry
SAME = 90           # a pixel differing by more than this counts as a real change


def log(*a):
    print(*a, file=sys.stderr)


# ---------------------------------------------------------------- video in

def probe(video):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "stream=codec_type,width,height,avg_frame_rate,r_frame_rate", "-of", "json", str(video)],
        capture_output=True, check=True, text=True).stdout
    streams = json.loads(out)["streams"]
    v = next(s for s in streams if s["codec_type"] == "video")
    fps = 0.0
    for key in ("r_frame_rate", "avg_frame_rate"):      # r_ is exact for constant-rate files
        try:
            f = float(Fraction(v.get(key) or "0/1"))
        except (ZeroDivisionError, ValueError):
            f = 0.0
        if 0 < f <= 60:
            fps = round(f) if abs(f - round(f)) < 0.01 else f     # 9.99999 -> 10
            break
    has_audio = any(s["codec_type"] == "audio" for s in streams)
    return v["width"], v["height"], fps or 10.0, has_audio


def frames(video, size, fps, crop=None):
    """Yield (h, w, 3) uint8 frames at a constant rate."""
    w, h = size
    vf = [f"fps={fps}"]
    if crop:
        x, y, w, h = crop
        vf.insert(0, f"crop={w}:{h}:{x}:{y}")
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(video), "-vf", ",".join(vf),
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    n = w * h * 3
    try:
        while True:
            buf = p.stdout.read(n)
            if len(buf) < n:
                break
            yield np.frombuffer(buf, np.uint8).reshape(h, w, 3)
    finally:
        p.kill()
        p.wait()


# ---------------------------------------------------------------- pixel grid

def edge_signal(video, size, fps, crop, max_frames=240):
    """Summed |gradient| per column boundary and per row boundary."""
    ex = ey = None
    for k, f in enumerate(frames(video, size, fps, crop)):
        g = f.astype(np.float32).sum(-1)
        dx = np.abs(np.diff(g, axis=1)).sum(0)
        dy = np.abs(np.diff(g, axis=0)).sum(1)
        ex = dx if ex is None else ex + dx
        ey = dy if ey is None else ey + dy
        if k + 1 >= max_frames:
            break
    return ex, ey


def fit_grid(e, period=None):
    """Pixel boundaries sit at o + k*p. Find p (unless given) and o from the edge signal.

    e[i] is the edge strength between video pixels i and i+1, i.e. at position i+1.
    The Fourier coefficient at period p peaks at the true period; its phase gives o.
    With a whole-number scale, p/2 and p/3 score exactly as high as p (every boundary
    still lands in phase), so after the search we climb to the largest multiple that
    keeps the score. Wrong multiples of the true period cancel out and score far lower.
    """
    pos = np.arange(1, len(e) + 1, dtype=np.float64)
    s = e - e.mean()

    def coef(ps):
        ps = np.atleast_1d(ps)
        return (s[None, :] * np.exp(-2j * np.pi * pos[None, :] / ps[:, None])).sum(1)

    if period is None:
        cand = np.arange(1.5, min(24.0, len(e) / 12), 0.005)
        mags = np.concatenate([np.abs(coef(c)) for c in np.array_split(cand, 32)])
        p = cand[mags.argmax()]
        fine = np.arange(p - 0.01, p + 0.01, 0.0002)
        p = float(fine[np.abs(coef(fine)).argmax()])
        best = abs(coef(p)[0])
        for k in range(6, 1, -1):
            if k * p > len(e) / 12:
                continue
            fine = np.arange(k * p - 0.01, k * p + 0.01, 0.0002)
            m = np.abs(coef(fine))
            if m.max() >= 0.9 * best:
                p = float(fine[m.argmax()])
                break
    else:
        p = float(period)
    z = coef(p)[0]
    o = float((-np.angle(z) / (2 * np.pi) * p) % p)
    strength = float(abs(z) / (np.abs(s).sum() + 1e-9))
    return p, o, strength


def cells(L, p, o):
    """First cell start and cell count along one axis (a cell mostly off-frame is dropped)."""
    a0 = o - p if o - p > -0.5 else o
    n = int(np.floor((L - a0 + 0.5) / p))
    return a0, n


def sampler(L, p, a0, n):
    """Sparse (n, L) matrix averaging the video pixels well inside each art pixel."""
    mg = min(1.0, 0.25 * p)
    rows, cols, vals = [], [], []
    for j in range(n):
        a, b = a0 + j * p, a0 + (j + 1) * p
        idx = [i for i in range(int(np.floor(a)), int(np.ceil(b)) + 1)
               if 0 <= i < L and a + mg <= i + 0.5 <= b - mg]
        if not idx:
            idx = [min(L - 1, max(0, int(a + p / 2)))]
        rows += [j] * len(idx)
        cols += idx
        vals += [1 / len(idx)] * len(idx)
    return sparse.csr_matrix((vals, (rows, cols)), shape=(n, L))


def to_native(f, Sy, Sx):
    f = f.astype(np.float32)
    out = np.empty((Sy.shape[0], Sx.shape[0], 3), np.float32)
    for c in range(3):
        out[..., c] = (Sx @ (Sy @ f[..., c]).T).T
    return out


# ---------------------------------------------------------------- layers

def blobs_for(frame, bg, lo, hi):
    # hysteresis: weak differences count only when connected to a strong one,
    # so dark-on-dark outlines survive and isolated compression noise doesn't
    d = np.abs(frame - bg).sum(-1)
    lab, n = ndimage.label(d > lo, structure=np.ones((3, 3)))
    keep = np.zeros(n + 1, bool)
    keep[np.unique(lab[d > hi])] = True
    keep[0] = False
    m = keep[lab]
    # paint each shape solid: holes inside a sprite come from the frame too
    m = ndimage.binary_fill_holes(ndimage.binary_closing(m, np.ones((3, 3))) | m)
    # group nearby parts of one character into a single blob
    grp, n = ndimage.label(ndimage.binary_dilation(m, iterations=1), structure=np.ones((3, 3)))
    out = []
    for k, sl in enumerate(ndimage.find_objects(grp)):
        mask = m[sl] & (grp[sl] == k + 1)
        if not mask.any():
            continue
        ys, xs = np.where(mask)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        mask = mask[y0:y1, x0:x1]
        Y0, X0 = sl[0].start + y0, sl[1].start + x0
        rgb = frame[Y0:Y0 + mask.shape[0], X0:X0 + mask.shape[1]]
        out.append(dict(x=int(X0), y=int(Y0), mask=mask, rgb=rgb))
    return out


def cel_dist(a, b):
    ma, mb = a["mask"], b["mask"]
    union = ma | mb
    both = ma & mb
    if (union & ~both).sum() > max(2, 0.06 * union.sum()):
        return 1e9
    cd = np.abs(a["rgb"] - b["rgb"]).sum(-1)[both]
    if not len(cd) or (cd > 110).sum() > max(1, 0.01 * len(cd)):
        return 1e9          # a few clearly different pixels = a different pose
    return float(cd.mean())


def palette_from(bg, cels):
    """Seed from the clean background first, then add colours only sprites use.
    Seed colour = the bin's mode, which in pixel art is the true colour."""
    def seeds(px, pal, min_count):
        q = (px // 4).astype(int)
        keys = (q[:, 0] << 12) | (q[:, 1] << 6) | q[:, 2]
        u, inv, cnt = np.unique(keys, return_inverse=True, return_counts=True)
        csum = np.zeros((len(u), 3))
        np.add.at(csum, inv, px)
        cols = csum / cnt[:, None]
        for i in np.argsort(-cnt):
            if cnt[i] < min_count:
                break
            if pal and np.abs(np.array(pal) - cols[i]).sum(1).min() < PAL_D:
                continue
            pal.append(cols[i])
        return pal

    pal = seeds(bg.reshape(-1, 3), [], 3)
    n_bg = len(pal)
    if cels:
        pal = seeds(np.concatenate([c["rgb"][c["mask"]] for c in cels]), pal, 4)
    if len(pal) > len(ALPHA):
        log(f"warning: {len(pal)} colours, keeping the {len(ALPHA)} most used")
        pal = pal[:len(ALPHA)]
    return np.array(pal), n_bg


def rle(s):
    """Runs longer than 4 become '<char>~<count>.'"""
    out, i = [], 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]:
            j += 1
        n = j - i
        out.append(s[i] * n if n <= 4 else f"{s[i]}~{n}.")
        i = j
    return "".join(out)


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", type=Path)
    ap.add_argument("--out", type=Path, help="output folder (default: ./<video name>-rebuild)")
    ap.add_argument("--crop", help="X,Y,W,H in video pixels: keep only the art")
    ap.add_argument("--scale", type=float, help="video pixels per art pixel (skip detection)")
    ap.add_argument("--size", help="art size WxH (skip detection; scale = video/size)")
    ap.add_argument("--fps", type=float, help="sampling rate (default: the video's)")
    ap.add_argument("--lo", type=float, default=30, help="weak change threshold (sum |dRGB|)")
    ap.add_argument("--hi", type=float, default=90, help="strong change threshold")
    ap.add_argument("--audio", action="store_true", help="copy the soundtrack to audio.m4a")
    ap.add_argument("--title", help="page title (default: video name)")
    args = ap.parse_args()

    video = args.video.resolve()
    out = (args.out or Path.cwd() / f"{video.stem}-rebuild").resolve()
    chk = out / ".check"
    chk.mkdir(parents=True, exist_ok=True)

    W, H, fps, has_audio = probe(video)
    if args.fps:
        fps = args.fps
    crop = tuple(int(v) for v in args.crop.split(",")) if args.crop else None
    if crop:
        W, H = crop[2], crop[3]
    log(f"video {W}x{H} @ {fps:g} fps")

    # 1. grid
    if args.size:
        nx, ny = (int(v) for v in args.size.lower().split("x"))
        per = (W / nx, H / ny)
    elif args.scale:
        per = (args.scale, args.scale)
    else:
        per = (None, None)
    ex, ey = edge_signal(video, (W, H), fps, crop)
    px, ox, sx = fit_grid(ex, per[0])
    py, oy, sy = fit_grid(ey, per[1])
    if per[0] is None and abs(px - py) / max(px, py) > 0.01:
        log(f"note: x period {px:.4f} and y period {py:.4f} differ; pixels are not square")
    ax, nx = cells(W, px, ox)
    ay, ny = cells(H, py, oy)
    log(f"grid: {px:.4f} x {py:.4f} video px per art px, offset ({ox:.2f}, {oy:.2f}) "
        f"-> art {nx}x{ny}  (lock {sx:.2f}/{sy:.2f}; under ~0.15 = weak, pass --scale or --size)")
    Sx, Sy = sampler(W, px, ax, nx), sampler(H, py, ay, ny)

    # 2. native frames, repeats collapsed into durations
    kept, holds = [], []
    for f in frames(video, (W, H), fps, crop):
        nat = np.clip(to_native(f, Sy, Sx).round(), 0, 255).astype(np.uint8)
        if kept and not (np.abs(nat.astype(np.int16) - kept[-1]).sum(-1) > SAME).any():
            holds[-1] += 1
            continue
        kept.append(nat)
        holds.append(1)
    if len(kept) > 1 and not (np.abs(kept[-1].astype(np.int16) - kept[0]).sum(-1) > SAME).any():
        kept.pop()          # the clip ends on a copy of its first frame
        holds.pop()
    F = np.stack(kept).astype(np.float32)
    T = len(F)
    durs = [int(round(1000 * h / fps)) for h in holds]
    steps = [int((np.abs(F[t] - F[t - 1]).sum(-1) > SAME).sum()) for t in range(1, T)]
    seam = int((np.abs(F[0] - F[-1]).sum(-1) > SAME).sum())
    typical = float(np.median(steps)) if steps else 0.0
    log(f"{T} distinct frames, {sum(durs) / 1000:.2f} s; last->first changes {seam} px "
        f"(typical step {typical:.0f} px) -> {'loops cleanly' if seam <= 2.5 * typical + 5 else 'visible jump at the loop'}")
    if T > 2000:
        log("warning: long clip; data.js will be large")

    # 3. layers
    bg = np.median(F, axis=0)
    clusters, placements = {}, []
    for t in range(T):
        pl = []
        for b in blobs_for(F[t], bg, args.lo, args.hi):
            best, bd = None, 38.0
            for c in clusters.setdefault(b["mask"].shape, []):
                d = cel_dist(b, c["proto"])
                if d < bd:
                    best, bd = c, d
            if best is None:
                best = dict(proto=b, members=[])
                clusters[b["mask"].shape].append(best)
            best["members"].append(b)
            pl.append((best, b["x"], b["y"]))
        placements.append(pl)
    cels = []
    for lst in clusters.values():
        for c in lst:
            c["id"] = len(cels)
            cels.append(dict(mask=np.stack([m["mask"] for m in c["members"]]).mean(0) >= 0.5,
                             rgb=np.median(np.stack([m["rgb"] for m in c["members"]]), axis=0),
                             n=len(c["members"])))
    log(f"{len(cels)} cels from {sum(len(p) for p in placements)} blobs")

    # 4. palette + encoding
    pal, n_bg = palette_from(bg, cels)
    log(f"palette: {n_bg} background + {len(pal) - n_bg} sprite colours")

    def snap(rgb):
        return np.abs(rgb[..., None, :] - pal).sum(-1).argmin(-1)

    bg_i = snap(bg)
    cel_out = []
    for c in cels:
        idx = snap(c["rgb"])
        s = "".join(ALPHA[v] if m else " " for v, m in zip(idx.ravel(), c["mask"].ravel()))
        cel_out.append([c["mask"].shape[1], c["mask"].shape[0], s])
    frames_out = [[[c["id"], x, y] for c, x, y in pl] for pl in placements]
    hexpal = ["#%02x%02x%02x" % tuple(int(round(v)) for v in np.clip(c, 0, 255)) for c in pal]
    border = np.concatenate([bg_i[0], bg_i[-1], bg_i[:, 0], bg_i[:, -1]])
    backdrop = hexpal[np.bincount(border).argmax()]

    # 5. how close is it? rebuild every frame from the encoded data
    ci = {ch: i for i, ch in enumerate(ALPHA)}
    strong, mild, recon = [], [], []
    for t in range(T):
        img = pal[bg_i].copy()
        for cid, x, y in frames_out[t]:
            w, h, s = cel_out[cid]
            a = np.array([ci.get(ch, -1) for ch in s]).reshape(h, w)
            m = a >= 0
            img[y:y + h, x:x + w][m] = pal[a[m]]
        e = np.abs(img - F[t]).sum(-1)
        strong.append(int((e > 120).sum()))
        mild.append(int((e > 50).sum()))
        recon.append(img)
    worst = int(np.argmax(strong))
    log(f"rebuild vs video, px per frame: clearly wrong (>120) mean {np.mean(strong):.1f} max {max(strong)} "
        f"(frame {worst}); slightly off (>50) mean {np.mean(mild):.1f}")
    sc = max(1, 480 // max(nx, ny))
    for t in sorted({0, T // 2, worst}):
        a = Image.fromarray(np.clip(F[t], 0, 255).astype(np.uint8))
        b = Image.fromarray(np.clip(recon[t], 0, 255).astype(np.uint8))
        pair = Image.new("RGB", (nx * 2 + 2, ny), (0, 0, 0))
        pair.paste(a, (0, 0))
        pair.paste(b, (nx + 2, 0))
        pair.resize(((nx * 2 + 2) * sc, ny * sc), Image.NEAREST).save(chk / f"orig-vs-rebuild_{t:04d}.png")
    np.save(chk / "native.npy", np.stack(kept))

    # 6. write the page
    audio = None
    if args.audio:
        if has_audio:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vn", "-c:a", "aac",
                            "-b:a", "128k", str(out / "audio.m4a")], check=True)
            audio = "audio.m4a"
        else:
            log("no audio stream; skipping --audio")
    data = dict(title=args.title or video.stem, w=nx, h=ny, durs=durs, backdrop=backdrop,
                palette=hexpal, bg=rle("".join(ALPHA[v] for v in bg_i.ravel())),
                cels=cel_out, frames=frames_out, audio=audio,
                grid=dict(px=round(px, 5), py=round(py, 5), ox=round(ox, 3), oy=round(oy, 3),
                          crop=crop, fps=fps, source=video.name))
    (out / "data.js").write_text(
        f"// generated by pixel-rebuild/scripts/extract.py from {video.name}\nwindow.PIXEL = "
        + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf-8")
    page = out / "index.html"
    if not page.exists():
        shutil.copy(SKILL / "template" / "index.html", page)
    log(f"wrote {out / 'data.js'} ({(out / 'data.js').stat().st_size // 1024} KB); open {page}")


if __name__ == "__main__":
    main()
