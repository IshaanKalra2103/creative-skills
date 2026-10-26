# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "pillow"]
# ///
"""Turn a video, GIF or still into the ascii-tiles look.

The picture is cut into a grid of cells and every cell takes one colour from a
small palette fitted to the whole clip, which gives the flat banded look of the
pond's water. Cells that stand out from their surroundings (fish, pads,
flowers) become gapped tiles with a glyph and drop a shadow; the rest stays
flat, with line glyphs (- / | \\) where an edge runs through it.

    uv run ascii_video.py in.gif out.mp4 --cell 6 --seamless --loops 8
    uv run ascii_video.py in.mp4 out.mp4 --cell 8 --audio
    uv run ascii_video.py in.webm out.mp4 --ss 8 --t 10 --crf 20
    uv run ascii_video.py still.png x.mp4 --preview 0 --preview-dir .
    uv run ascii_video.py in.mp4 x.mp4 --preview 0,120 --preview-dir previews

--keep x,y,w,h lays the source pixels of that region back on top (feathered),
for a signature the grid would otherwise wash out.
"""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT = "/System/Library/Fonts/Menlo.ttc"
GLYPHS = [" ", ".", "#", "%", "&", "8", "@", "x", "-", "\\", "|", "/", "*", "+"]
GI = {ch: i for i, ch in enumerate(GLYPHS)}
BODY = np.array([GI[c] for c in "#%&8@x"])
LINE = np.array([GI[c] for c in "-\\|/"])


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,avg_frame_rate,r_frame_rate",
         "-of", "json", str(path)], check=True, capture_output=True, text=True).stdout
    streams = json.loads(out)["streams"]
    v = next(s for s in streams if s["codec_type"] == "video")
    rate = v["avg_frame_rate"] if v["avg_frame_rate"] not in ("0/0", "") else v["r_frame_rate"]
    num, den = (int(x) for x in rate.split("/"))
    has_audio = any(s["codec_type"] == "audio" for s in streams)
    return v["width"], v["height"], num / den, rate, has_audio


def trim(a):
    """ffmpeg input options for --ss / --t."""
    return (["-ss", str(a.ss)] if a.ss else []) + (["-t", str(a.t)] if a.t else [])


def read_frames(path, w, h, opts=()):
    p = subprocess.Popen(["ffmpeg", "-v", "error", *opts, "-i", str(path), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    size = w * h * 3
    try:
        while len(buf := p.stdout.read(size)) == size:
            yield np.frombuffer(buf, np.uint8).reshape(h, w, 3)
    finally:
        p.kill()
        p.wait()


def to_lab(rgb):
    c = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    xyz = c @ np.array([[0.4124, 0.2126, 0.0193], [0.3576, 0.7152, 0.1192], [0.1805, 0.0722, 0.9505]])
    xyz = xyz / np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def blur(a, sigma):
    """Separable gaussian on the cell grid, edges clamped."""
    r = int(3 * sigma)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    for axis in (0, 1):
        p = np.pad(a, [(r, r) if i == axis else (0, 0) for i in range(a.ndim)], mode="edge")
        n = a.shape[axis]
        a = sum(w * np.take(p, np.arange(i, i + n), axis=axis) for i, w in enumerate(k))
    return a


def neighbours(m):
    p = np.pad(m.astype(np.int32), 1)
    return sum(p[1 + dy:1 + dy + m.shape[0], 1 + dx:1 + dx + m.shape[1]]
               for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)


def kmeans(x, k, iters=20, seed=3):
    rng = np.random.default_rng(seed)
    cen = x[rng.choice(len(x), 1)]
    for _ in range(k - 1):                                  # k-means++ seeding
        d = ((x[:, None] - cen[None]) ** 2).sum(-1).min(1)
        cen = np.vstack([cen, x[rng.choice(len(x), 1, p=d / d.sum())]])
    for _ in range(iters):
        lab = ((x[:, None] - cen[None]) ** 2).sum(-1).argmin(1)
        cen = np.array([x[lab == i].mean(0) if (lab == i).any() else cen[i] for i in range(k)])
    return cen


def glyph_masks(px):
    font = ImageFont.truetype(FONT, round(px * 0.62))
    masks = np.zeros((len(GLYPHS), px, px), np.float32)
    for i, ch in enumerate(GLYPHS[1:], 1):
        im = Image.new("L", (px, px), 0)
        ImageDraw.Draw(im).text((px / 2, px / 2), ch, fill=255, font=font, anchor="mm")
        masks[i] = np.asarray(im, np.float32) / 255
    return masks


class Renderer:
    def __init__(self, w, h, a):
        self.a, c, px = a, a.cell, a.px
        self.rows, self.cols = h // c, w // c                   # whole cells only, centred crop
        self.oy, self.ox = (h - self.rows * c) // 2, (w - self.cols * c) // 2
        self.masks = glyph_masks(px)
        g = max(1, round(px / 16))                              # gap on each side of a tile
        self.tile = np.zeros((px, px), np.float32)
        self.tile[g:px - g, g:px - g] = 1
        rng = np.random.default_rng(7)                          # fixed per-cell choices, so glyphs hold still
        self.pick = BODY[rng.integers(0, len(BODY), (self.rows, self.cols))]
        self.speck = rng.random((self.rows, self.cols))
        self.label = None
        self.on = np.zeros((self.rows, self.cols), bool)
        self.palette = None

    def cells(self, frame):
        c, R, C = self.a.cell, self.rows, self.cols
        f = frame[self.oy:self.oy + R * c, self.ox:self.ox + C * c].astype(np.float32) / 255
        rgb = f.reshape(R, c, C, c, 3).mean(axis=(1, 3))
        if self.a.sat != 1:
            grey = rgb.mean(-1, keepdims=True)
            rgb = np.clip(grey + (rgb - grey) * self.a.sat, 0, 1)
        return rgb

    def fit_palette(self, samples):
        x = np.concatenate([to_lab(s).reshape(-1, 3) for s in samples])
        cen = kmeans(x[np.random.default_rng(0).permutation(len(x))[:60000]], self.a.colors)
        # back to rgb by averaging the source colours that fall in each cluster
        rgb = np.concatenate([s.reshape(-1, 3) for s in samples])
        lab = ((x[:, None] - cen[None]) ** 2).sum(-1).argmin(1)
        self.palette_lab = cen
        self.palette = np.array([rgb[lab == i].mean(0) if (lab == i).any() else [0, 0, 0]
                                 for i in range(len(cen))])

    def step(self, rgb):
        """Update the per-cell state (palette label, tile on/off) from one frame's cell colours."""
        a = self.a
        lab = to_lab(rgb)
        d = np.sqrt(((lab[..., None, :] - self.palette_lab) ** 2).sum(-1))
        best = d.argmin(-1)
        if self.label is not None:                              # keep last label unless clearly worse
            keep = np.take_along_axis(d, self.label[..., None], -1)[..., 0] <= \
                np.take_along_axis(d, best[..., None], -1)[..., 0] + a.stick
            best = np.where(keep, self.label, best)
        self.label = best

        wt = np.array([a.lw, 1, 1])
        bg = blur(lab, a.radius)
        sal = np.sqrt((((lab - bg) * wt) ** 2).sum(-1))
        # surroundings again without the cells that stood out, so an object does not pull
        # the background towards itself and leave a halo of tiles around it
        w = (sal < a.tile * 0.6).astype(np.float64)
        den = blur(w, a.radius)[..., None]
        bg = np.where(den > 0.05, blur(lab * w[..., None], a.radius) / np.maximum(den, 1e-6), bg)
        sal = np.sqrt((((lab - bg) * wt) ** 2).sum(-1))
        self.on = np.where(self.on, sal > a.tile * 0.65, sal > a.tile)
        self.lab, self.bg = lab, bg

    def draw(self):
        a, px, R, C = self.a, self.a.px, self.rows, self.cols
        col = self.palette[self.label]
        L = self.lab[..., 0]

        n = neighbours(self.on)
        tile = (self.on & (n >= 2)) | (~self.on & (n >= 6))     # drop lone tiles, fill pinholes

        P = np.pad(L, 1, mode="edge")
        gx = (P[:-2, 2:] + 2 * P[1:-1, 2:] + P[2:, 2:] - P[:-2, :-2] - 2 * P[1:-1, :-2] - P[2:, :-2]) / 8
        gy = (P[2:, :-2] + 2 * P[2:, 1:-1] + P[2:, 2:] - P[:-2, :-2] - 2 * P[:-2, 1:-1] - P[:-2, 2:]) / 8
        mag = np.hypot(gx, gy)
        ang = np.mod(np.arctan2(gx, -gy), np.pi)                 # direction along the edge
        line = LINE[np.floor((ang + np.pi / 8) / (np.pi / 4)).astype(int) & 3]
        edge = mag > a.edge

        # shadow: tiles shifted down-right darken the flat cells they fall on
        sh = np.zeros_like(tile)
        sy, sx = a.shadow
        sh[sy:, sx:] = tile[:R - sy, :C - sx]
        flat = np.where((sh & ~tile)[..., None], col * 0.74, col)

        lift = L - self.bg[..., 0]
        g_idx = np.where(tile, np.where(edge, line, self.pick), 0)
        g_idx = np.where(~tile & edge, line, g_idx)
        g_idx = np.where(~tile & ~edge & (lift > a.fleck) & (self.speck < 0.35), GI["*"], g_idx)
        g_idx = np.where((g_idx == 0) & (self.speck < 0.03), GI["."], g_idx)

        bright = (col.mean(-1) > 0.5)[..., None]
        on_tile = np.where(bright, col * 0.62, col + (1 - col) * 0.38)
        on_flat = np.where(bright, flat * 0.8, flat + (1 - flat) * 0.22)
        fleck = flat + (1 - flat) * 0.6
        glyph = np.where(tile[..., None], on_tile, np.where((g_idx == GI["*"])[..., None], fleck, on_flat))
        gap = col * 0.7

        tm = np.where(tile[..., None, None], self.tile, 1.0)[..., None]
        fill = np.where(tile[..., None], col, flat)
        base = gap[:, :, None, None] * (1 - tm) + fill[:, :, None, None] * tm
        g = self.masks[g_idx][..., None]
        out = base * (1 - g) + glyph[:, :, None, None] * g
        out = out.transpose(0, 2, 1, 3, 4).reshape(R * px, C * px, 3)
        return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)


class Keep:
    """Paste one region of the source frame, scaled up and feathered, over the output."""

    def __init__(self, rect, r, a, feather=10):
        x, y, w, h = rect
        k = a.px / a.cell
        self.src = (x, y, w, h)
        self.dst = (round((x - r.ox) * k), round((y - r.oy) * k))
        self.size = (round(w * k), round(h * k))
        W, H = self.size
        ex = np.minimum(np.arange(W), np.arange(W)[::-1]) / feather
        ey = np.minimum(np.arange(H), np.arange(H)[::-1]) / feather
        self.alpha = np.clip(np.minimum(ey[:, None], ex[None]), 0, 1)[..., None] * 0.92

    def crop(self, frame):
        x, y, w, h = self.src
        return frame[y:y + h, x:x + w].copy()

    def apply(self, img, crop):
        (X, Y), (W, H) = self.dst, self.size
        patch = np.asarray(Image.fromarray(crop).resize((W, H), Image.LANCZOS), np.float32)
        x0, y0 = max(0, X), max(0, Y)
        x1, y1 = min(img.shape[1], X + W), min(img.shape[0], Y + H)
        if x1 <= x0 or y1 <= y0:
            return img
        p = patch[y0 - Y:y1 - Y, x0 - X:x1 - X]
        al = self.alpha[y0 - Y:y1 - Y, x0 - X:x1 - X]
        reg = img[y0:y1, x0:x1].astype(np.float32)
        img[y0:y1, x0:x1] = (reg * (1 - al) + p * al + 0.5).astype(np.uint8)
        return img


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("output", help="an .mp4 path")
    ap.add_argument("--cell", type=int, default=8, help="source pixels per grid cell")
    ap.add_argument("--px", type=int, default=16, help="output pixels per grid cell")
    ap.add_argument("--colors", type=int, default=16, help="palette size")
    ap.add_argument("--sat", type=float, default=1.0, help="saturation multiplier")
    ap.add_argument("--stick", type=float, default=4.0, help="how much closer (in Lab units) a new palette colour must be before a cell switches")
    ap.add_argument("--radius", type=float, default=5.0, help="surroundings blur, in cells, for picking out objects")
    ap.add_argument("--tile", type=float, default=16.0, help="how far (Lab) a cell must stand out to become a tile")
    ap.add_argument("--lw", type=float, default=0.6, help="weight of lightness against hue when picking out objects")
    ap.add_argument("--edge", type=float, default=7.0, help="edge strength (Lab L per cell) for a line glyph")
    ap.add_argument("--fleck", type=float, default=10.0, help="how much brighter than its surroundings a flat cell gets a * fleck")
    ap.add_argument("--shadow", type=lambda s: tuple(int(v) for v in s.split(",")), default=(1, 1), help="shadow offset in cells, dy,dx")
    ap.add_argument("--seamless", action="store_true", help="warm the per-cell state over two passes so the clip loops without a jump")
    ap.add_argument("--ss", type=float, default=0, help="start this many seconds into the input")
    ap.add_argument("--t", type=float, default=0, help="use only this many seconds of the input")
    ap.add_argument("--crf", type=int, default=16, help="x264 quality: lower is better and bigger (16 to 22 is sensible)")
    ap.add_argument("--loops", type=int, default=1, help="repeat the clip this many times in the output")
    ap.add_argument("--keep", type=lambda s: tuple(int(v) for v in s.split(",")), help="x,y,w,h source region to keep as-is (a signature)")
    ap.add_argument("--audio", action="store_true", help="keep the source audio (single pass only)")
    ap.add_argument("--preview", help="comma-separated frame numbers to save as PNG instead of encoding")
    ap.add_argument("--preview-dir", default="previews")
    a = ap.parse_args()

    w, h, fps, rate, has_audio = probe(a.input)
    r = Renderer(w, h, a)
    W, H = r.cols * a.px, r.rows * a.px
    print(f"{w}x{h} @ {fps:.3f} fps -> {r.cols}x{r.rows} cells -> {W}x{H}")

    keep = Keep(a.keep, r, a) if a.keep else None
    frames, crops = [], []                                      # cell grids are small; keep them all
    for f in read_frames(a.input, w, h, trim(a)):
        frames.append(r.cells(f))
        crops.append(keep.crop(f) if keep else None)
    n = len(frames)

    def render(i):
        img = r.draw()
        return keep.apply(img, crops[i]) if keep else img
    r.fit_palette(frames[::max(1, n // 24)])
    if a.seamless:
        for _ in range(2):
            for fr in frames:
                r.step(fr)

    if a.preview:
        want = {int(v) for v in a.preview.split(",")}
        Path(a.preview_dir).mkdir(parents=True, exist_ok=True)
        for i, fr in enumerate(frames):
            r.step(fr)
            if i in want:
                p = Path(a.preview_dir) / f"{Path(a.input).stem}_{i:04d}.png"
                Image.fromarray(render(i)).save(p)
                print("wrote", p)
        return

    out = Path(a.output)
    tmp = Path(tempfile.mkdtemp())
    once = tmp / "once.mp4"
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", rate,
         "-i", "-", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", str(a.crf), "-preset", "medium",
         "-tune", "animation", str(once)], stdin=subprocess.PIPE)
    for i, fr in enumerate(frames):
        r.step(fr)
        enc.stdin.write(render(i).tobytes())
    enc.stdin.close()
    if enc.wait() != 0:
        raise SystemExit("ffmpeg encode failed")

    cmd = ["ffmpeg", "-v", "error", "-y", "-stream_loop", str(max(0, a.loops - 1)), "-i", str(once)]
    if a.audio and has_audio:
        cmd += ["-stream_loop", str(max(0, a.loops - 1)), *trim(a), "-i", str(a.input), "-map", "0:v", "-map", "1:a",
                "-c:a", "aac", "-b:a", "160k", "-shortest"]
    cmd += ["-c:v", "copy", "-movflags", "+faststart", str(out)]
    subprocess.run(cmd, check=True)
    once.unlink()
    tmp.rmdir()
    print(f"encoded {n} frames x {max(1, a.loops)} -> {out}")


if __name__ == "__main__":
    main()
