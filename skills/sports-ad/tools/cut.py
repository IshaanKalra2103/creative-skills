# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow", "numpy", "typesafe-sdk"]
# ///
"""The edit engine: renders ad.json to an mp4. Shots come from AI clips or stills, each with a
speed curve (ramps, freezes), a camera move on top (push, pan, roll, handheld shake), and an
optional mirror for screen direction. Between shots: cut, flash, dip, whip, zoom-through,
glitch, smash, or a match cut that lines up the subject (boxes from Jev, cached). Inside
shots: impact hits (flash, chromatic kick, shake, punch-in, exposure pop). On top: the grade
(contrast, crush, split tone, saturation with one kept hue), bloom, vignette, kinetic type and
logos, grain, and the score. See references/edit.md for every key.
usage: uv run tools/cut.py AD_DIR [--preview 0.5] [--range 0-120] [--frames 10,40 --png DIR]
                                  [--out out/ad.mp4] [--jobs 8] [--no-audio]
"""
import argparse, math, os, subprocess, sys, zlib
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from adlib import FONTS, Ad, ease, find_box, keyframes

AD = None
W = H = 0
U = 1.0      # px scale: 1 at 1080 wide
PLAN = {}


def color(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def lerp2(v, t):
    """[a, b] -> a..b at t; a plain number stays."""
    if isinstance(v, list) and len(v) == 2 and not isinstance(v[0], list):
        return v[0] + (v[1] - v[0]) * t
    return v


# ---------------------------------------------------------------- per-shot plan

def plan_shot(s):
    n = s["_len"]
    if "src" not in s:
        return {"pos": np.zeros(n), "prog": np.linspace(0, 1, n)}
    src = AD.source(s)
    rate = src.fps / AD.fps
    pos = np.zeros(n)
    pos[0] = float(str(s.get("in", 0)).rstrip("s")) * src.fps
    speed = s.get("speed", 1)
    for k in range(1, n):
        pos[k] = pos[k - 1] + keyframes(speed, k - 1) * rate
    if not src.still and pos[-1] > src.n - 1:
        print(f"  shot {s['id']}: runs past the clip's last frame ({pos[-1]:.0f} > {src.n - 1}); it holds there",
              file=sys.stderr)
    if src.still:
        # a still has no time; its camera move follows the speed curve, so ramps still read
        cum = pos - pos[0]
        prog = cum / cum[-1] if cum[-1] > 0 else np.linspace(0, 1, n)
    else:
        prog = np.linspace(0, 1, n) if n > 1 else np.zeros(1)
    return {"pos": pos, "prog": prog}


def hits_of(s):
    out = [dict(h, at=AD.local(s, h["at"])) for h in s.get("hits", [])]
    prev = AD.shots.index(s) - 1
    if prev >= 0:
        o = AD.shots[prev].get("out", {})
        if o.get("type") == "smash":
            out.append({"at": 0, "fx": o.get("fx", "ca shake pop punch"), "len": AD.frames(o.get("len", 6)),
                        "amt": o.get("amt", 1)})
    return out


def hit_env(s, k):
    """Summed effect strengths at shot frame k."""
    e = {"flash": 0.0, "ca": 0.0, "shake": 0.0, "punch": 0.0, "pop": 0.0}
    for h in PLAN["hits"][s["id"]]:
        j = k - h["at"]
        L = AD.frames(h.get("len", 6))
        if 0 <= j < L:
            d = (1 - j / L) ** 2 * h.get("amt", 1)
            for fx in h["fx"].split():
                e[fx] += ([0.8, 0.45, 0.15][j] * h.get("amt", 1) if j < 3 else 0) if fx == "flash" else d
    return e


# ---------------------------------------------------------------- pixels

def affine(img, zoom, fx, fy, roll, dx, dy, flip=False):
    """Cover the output with img at zoom, centred on (fx, fy) of the source, rolled, shifted."""
    w, h = img.size
    S = 1 / (max(W / w, H / h) * zoom)
    if S >= 2:
        f = int(S)
        img = img.reduce(f)
        w, h = img.size
        S /= f
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
        fx = 1 - fx
    hw, hh = W * S / 2, H * S / 2
    cx = min(max(fx * w, hw), w - hw)
    cy = min(max(fy * h, hh), h - hh)
    th = math.radians(roll)
    a, b, d, e = S * math.cos(th), -S * math.sin(th), S * math.sin(th), S * math.cos(th)
    ox, oy = W / 2 + dx, H / 2 + dy
    return img.transform((W, H), Image.AFFINE, (a, b, cx - a * ox - b * oy, d, e, cy - d * ox - e * oy),
                         resample=Image.BICUBIC)


def wobble(g, seed, amp):
    """Smooth handheld drift in px."""
    r = np.random.default_rng(seed)
    f, p = r.uniform(0.5, 2.2, 4), r.uniform(0, 6.3, 4)
    t = g / AD.fps
    return (amp * (math.sin(6.28 * f[0] * t + p[0]) + 0.5 * math.sin(6.28 * f[1] * t + p[1])),
            amp * (math.sin(6.28 * f[2] * t + p[2]) + 0.5 * math.sin(6.28 * f[3] * t + p[3])))


def shot_image(s, k, extra_zoom=1.0):
    """Shot s at its frame k: source sample, camera move, shake, hits that move the camera."""
    if "src" not in s:
        return Image.new("RGB", (W, H), color(s.get("color", "#000000")))
    p = PLAN["shots"][s["id"]]
    mv = s.get("move", {})
    t = ease(p["prog"][k], mv.get("ease", "inout"))
    e = hit_env(s, k)
    g = s["_start"] + k
    dx, dy = wobble(g, zlib.crc32(s["id"].encode()), mv.get("shake", 0) * U)
    if e["shake"]:
        r = np.random.default_rng(g)
        dx += r.uniform(-1, 1) * 22 * U * e["shake"]
        dy += r.uniform(-1, 1) * 22 * U * e["shake"]
    pan = mv.get("pan", [0.5, 0.5])
    if isinstance(pan[0], list):
        pan = [pan[0][i] + (pan[1][i] - pan[0][i]) * t for i in (0, 1)]
    zoom = lerp2(mv.get("zoom", 1.0), t) * (1 + 0.08 * e["punch"]) * extra_zoom
    return affine(AD.source(s).at(p["pos"][k]), zoom, pan[0], pan[1], lerp2(mv.get("roll", 0), t),
                  dx, dy, s.get("flip", False))


def box_blur_x(a, width):
    width = max(1, int(width)) | 1
    pad = np.pad(a, ((0, 0), (width // 2 + 1, width // 2), (0, 0)), mode="edge")
    c = np.cumsum(pad, axis=1, dtype=np.float32)
    return (c[:, width:] - c[:, :-width]) / width


def whip(img, x, direction):
    """Directional smear and shift; x in 0..1."""
    a = np.asarray(img, np.float32)
    vertical = direction in ("up", "down")
    if vertical:
        a = a.transpose(1, 0, 2)
    L = a.shape[1]
    sign = -1 if direction in ("left", "up") else 1
    shift = int(sign * x * 0.3 * L)
    if shift:
        a = np.pad(a, ((0, 0), (abs(shift), abs(shift)), (0, 0)), mode="edge")[:, abs(shift) - shift: abs(shift) - shift + L]
    a = box_blur_x(a, x * 0.4 * L)
    if vertical:
        a = a.transpose(1, 0, 2)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def radial(img, x):
    """Zoom blur toward the centre."""
    if x < 0.02:
        return img
    acc = np.zeros((H, W, 3), np.float32)
    n = 6
    for i in range(n):
        z = 1 + 0.12 * x * i / (n - 1)
        big = img.resize((round(W * z), round(H * z)), Image.BILINEAR)
        l, t = (big.width - W) // 2, (big.height - H) // 2
        acc += np.asarray(big.crop((l, t, l + W, t + H)), np.float32)
    return Image.fromarray((acc / n).astype(np.uint8))


def glitch(img, x, g):
    a = np.asarray(img).copy()
    r = np.random.default_rng(g * 7 + 1)
    sh = int(26 * U * x)
    a[..., 0] = np.roll(a[..., 0], sh, 1)
    a[..., 2] = np.roll(a[..., 2], -sh, 1)
    for _ in range(int(3 + 6 * x)):
        y0 = int(r.uniform(0, H - 10))
        y1 = min(H, y0 + int(r.uniform(6, 80) * U))
        a[y0:y1] = np.roll(a[y0:y1], int(r.uniform(-90, 90) * U * x), 1)
    return Image.fromarray(a)


def chroma(img, px):
    """Chromatic aberration: red scaled out, blue scaled in, by px at the edge."""
    if px < 0.5:
        return img
    r, g, b = img.split()
    d = px / (W / 2)
    rb = r.resize((round(W * (1 + d)), round(H * (1 + d))), Image.BILINEAR)
    l, t = (rb.width - W) // 2, (rb.height - H) // 2
    r = rb.crop((l, t, l + W, t + H))
    bs = b.resize((round(W * (1 - d)), round(H * (1 - d))), Image.BILINEAR)
    b2 = b.copy()
    b2.paste(bs, ((W - bs.width) // 2, (H - bs.height) // 2))
    return Image.merge("RGB", (r, g, b2))


def toward(img, c, x):
    return Image.blend(img, Image.new("RGB", (W, H), c), min(1.0, max(0.0, x)))


# ---------------------------------------------------------------- the finish

def grade(img):
    lk = AD.data.get("look", {})
    a = np.asarray(img, np.float32) / 255
    if lk.get("exposure"):
        a = a * 2 ** lk["exposure"]
    if lk.get("crush"):
        a = (a - lk["crush"]) / (1 - lk["crush"])
    if lk.get("contrast", 1) != 1:
        a = 0.45 + (a - 0.45) * lk["contrast"]
    a = np.clip(a, 0, 1)
    sp = lk.get("split")
    if sp:
        lum = a.mean(2, keepdims=True)
        sh = np.array(color(sp.get("shadows", "#000000")), np.float32) / 255
        hi = np.array(color(sp.get("highlights", "#ffffff")), np.float32) / 255
        amt = sp.get("amount", 0.15)
        a = a + amt * ((1 - lum) ** 2 * sh + lum ** 2 * (hi - 1))
        a = np.clip(a, 0, 1)
    img = Image.fromarray((a * 255).astype(np.uint8))
    sat, keep = lk.get("sat", 1.0), lk.get("keep")
    if sat != 1 or keep:
        hsv = np.asarray(img.convert("HSV"), np.float32)
        m = np.full(hsv.shape[:2], sat, np.float32)
        if keep:
            hue = keep["hue"] / 360 * 255
            dist = np.abs((hsv[..., 0] - hue + 128) % 256 - 128) / 255 * 360
            wgt = np.exp(-(dist / keep.get("width", 18)) ** 2)
            m = m + (keep.get("sat", 1.1) - m) * wgt
        hsv[..., 1] = np.clip(hsv[..., 1] * m, 0, 255)
        img = Image.fromarray(hsv.astype(np.uint8), "HSV").convert("RGB")
    if lk.get("bloom"):
        small = img.resize((W // 4, H // 4), Image.BILINEAR)
        s = np.asarray(small, np.float32) / 255
        s = np.clip((s - 0.62) / 0.38, 0, 1) ** 2
        glow = Image.fromarray((s * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10 * U)).resize((W, H), Image.BILINEAR)
        a = np.asarray(img, np.float32) + lk["bloom"] * np.asarray(glow, np.float32)
        img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    if lk.get("vignette"):
        a = np.asarray(img, np.float32) * PLAN["vignette"][..., None]
        img = Image.fromarray(a.astype(np.uint8))
    return img


def vignette_mask(amt):
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2) / math.sqrt(2)
    return 1 - amt * np.clip((r - 0.35) / 0.65, 0, 1) ** 1.6


def grain(img, g):
    amt = AD.data.get("look", {}).get("grain", 0)
    if not amt:
        return img
    r = np.random.default_rng(10_000 + g)
    n = r.normal(0, amt * 255, (H // 2 + 1, W // 2 + 1)).astype(np.float32)
    n = np.asarray(Image.fromarray(n, "F").resize((W, H), Image.BILINEAR))
    a = np.asarray(img, np.float32) + n[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- type and logos

_layers = {}


def font(name, size):
    path = name if os.path.isabs(name) else os.path.join(FONTS, name)
    return ImageFont.truetype(path, max(4, round(size)))


def text_layer(o, chars=None):
    key = (id(o), chars)
    if key in _layers:
        return _layers[key]
    size = o.get("size", 96) * U
    f = font(o.get("font", "Anton-Regular.ttf"), size)
    track = o.get("track", 0.0) * size
    text = o["text"] if chars is None else o["text"][:chars]
    lines = text.split("\n")
    lead = o.get("leading", 1.05) * size
    widths = [sum(f.getlength(ch) + track for ch in ln) - track if ln else 0 for ln in lines]
    lw, lh = int(max(widths + [1]) + 4 * size / 10), int(lead * len(lines) + size * 0.4)
    layer = Image.new("RGBA", (lw, lh), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    fill = color(o.get("color", "#ffffff")) + (255,)
    for i, ln in enumerate(lines):
        x = {"left": 0, "right": lw - widths[i]}.get(o.get("align", "center"), (lw - widths[i]) / 2)
        for ch in ln:
            d.text((x, i * lead), ch, font=f, fill=fill)
            x += f.getlength(ch) + track
    _layers[key] = layer
    return layer


def image_layer(o):
    key = (id(o), "img")
    if key not in _layers:
        im = Image.open(AD.path(o["image"])).convert("RGBA")
        w = round(o.get("width", 0.3) * W)
        _layers[key] = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    return _layers[key]


def overlays(img, g):
    for o in AD.data.get("overlays", []):
        at = AD.when(o["at"])
        L = AD.frames(o["len"]) if "len" in o else AD.shot_at(at)["_start"] + AD.shot_at(at)["_len"] - at
        j, rem = g - at, at + L - g
        if not 0 <= j < L:
            continue
        style = o.get("style", "cut")
        alpha, scale, dy = 1.0, 1.0, 0.0
        chars = None
        if style == "fade":
            alpha = min(1, (j + 1) / 6, rem / 6)
        elif style == "slam":
            scale = 1 + 0.55 * (1 - ease(j / 4, "out"))
            alpha = min(1, (j + 1) / 2)
        elif style == "rise":
            dy = 40 * U * (1 - ease(j / 10, "out"))
            alpha = min(1, (j + 1) / 8, rem / 6)
        elif style == "type":
            chars = min(len(o["text"]), j // o.get("rate", 2) + 1)
        elif style == "strobe":
            alpha = 1.0 if j >= 8 or j % 4 < 2 else 0.0
        if alpha <= 0:
            continue
        layer = image_layer(o) if "image" in o else text_layer(o, chars)
        if scale != 1:
            layer = layer.resize((round(layer.width * scale), round(layer.height * scale)), Image.BICUBIC)
        if alpha < 1:
            layer = layer.copy()
            layer.putalpha(layer.getchannel("A").point(lambda v: int(v * alpha)))
        px, py = o.get("pos", [0.5, 0.5])
        img.paste(layer, (round(px * W - layer.width / 2), round(py * H - layer.height / 2 + dy)), layer)
    return img


# ---------------------------------------------------------------- transitions

def edges(s):
    """(transition into s from the previous shot, transition out of s)."""
    i = AD.shots.index(s)
    prev = AD.shots[i - 1].get("out") if i > 0 else None
    nxt = s.get("out") if i < len(AD.shots) - 1 else None
    return prev, nxt


def match_plan(i):
    """Subject boxes (normalised) at the cut out of shot i, from `boxes` or Jev."""
    a, b = AD.shots[i], AD.shots[i + 1]
    o = a["out"]
    if "boxes" in o:
        return o["boxes"]
    global W, H, U
    keep = W, H, U
    W, H, U = 540, round(540 * AD.H / AD.W), 0.5
    ia, ib = shot_image(a, a["_len"] - 1), shot_image(b, 0)
    cache = AD.path("build", "boxes.json")
    ba, bb = find_box(ia, o["subject"], cache), find_box(ib, o["subject"], cache)
    W, H, U = keep
    if ba is None or bb is None:
        print(f"  match cut after {a['id']}: no box for {o['subject']!r}; plain cut", file=sys.stderr)
        return None
    return [[v / (540 if j % 2 == 0 else round(540 * AD.H / AD.W)) for j, v in enumerate(x)] for x in (ba, bb)]


def align(img, src_box, dst_box, t, max_zoom=1.8):
    """Move img so the subject at src_box sits at lerp(dst_box, src_box, t). It only scales up,
    so the picture always covers the frame: enough to match the subject's size, and more if
    that is what it takes to move the subject to the target, up to max_zoom."""
    (ax0, ay0, ax1, ay1), (bx0, by0, bx1, by1) = src_box, dst_box
    cs = ((ax0 + ax1) / 2 * W, (ay0 + ay1) / 2 * H)
    cd = ((bx0 + bx1) / 2 * W, (by0 + by1) / 2 * H)
    s_size = math.sqrt(((bx1 - bx0) * (by1 - by0)) / max(1e-6, (ax1 - ax0) * (ay1 - ay0)))
    s_move = max(cd[0] / max(cs[0], 1), (W - cd[0]) / max(W - cs[0], 1),
                 cd[1] / max(cs[1], 1), (H - cd[1]) / max(H - cs[1], 1))
    s0 = min(max_zoom, max(1.0, s_size, s_move))
    s = s0 + (1 - s0) * t
    c = [cd[k] + (cs[k] - cd[k]) * t for k in (0, 1)]
    # keep the picture covering the frame
    c[0] = min(max(c[0], W - s * (W - cs[0])), s * cs[0])
    c[1] = min(max(c[1], H - s * (H - cs[1])), s * cs[1])
    return img.transform((W, H), Image.AFFINE, (1 / s, 0, cs[0] - c[0] / s, 0, 1 / s, cs[1] - c[1] / s),
                         resample=Image.BICUBIC)


def side(o, k, n_frames, into):
    """Strength (0..1) of transition o at shot frame k: on the way out (into=False) it rises to
    1 at the cut over the first half of o.len; on the way in it falls from the cut."""
    L = AD.frames(o.get("len", 4))
    half = L // 2 if not into else L - L // 2
    if into:
        return (half - k) / (half + 1) if k < half else 0.0
    j = k - (n_frames - half)
    return (j + 1) / half if j >= 0 and half else 0.0


# ---------------------------------------------------------------- one frame

def render(g):
    s = AD.shot_at(g)
    k = g - s["_start"]
    n = s["_len"]
    i = AD.shots.index(s)
    prev, nxt = edges(s)
    # zoom-through: push hard into the cut, land a little wide of it and settle
    zin = side(prev, k, n, True) if prev and prev.get("type") == "zoom" else 0.0
    zout = side(nxt, k, n, False) if nxt and nxt.get("type") == "zoom" else 0.0
    img = shot_image(s, k, 1 + 0.35 * zin ** 2 + 0.5 * zout ** 2)
    post = []
    for o, into in ((prev, True), (nxt, False)):
        if not o:
            continue
        typ, x = o.get("type", "cut"), side(o, k, n, into)
        if typ == "match":
            boxes = PLAN["match"].get(i - 1 if into else i)
            L = AD.frames(o.get("len", 8))
            if boxes:
                ba, bb = boxes
                sa = (ba[2] - ba[0]) * (ba[3] - ba[1])
                sb = (bb[2] - bb[0]) * (bb[3] - bb[1])
                mz = o.get("max_zoom", 1.8)
                if into and sa >= sb and k < L:
                    img = align(img, bb, ba, ease(k / L, "out"), mz)
                if not into and sa < sb and k >= n - L:
                    img = align(img, ba, bb, ease((n - 1 - k) / L, "in"), mz)
            continue
        if x <= 0:
            continue
        if typ == "whip":
            d = o.get("dir", "left")
            img = whip(img, x, d)
        elif typ == "zoom":
            img = radial(img, x)
        elif typ == "glitch":
            img = glitch(img, x, g)
        elif typ in ("flash", "dip"):
            post.append((color(o.get("color", "#ffffff" if typ == "flash" else "#000000")), x ** (0.8 if typ == "flash" else 1.0)))
    e = hit_env(s, k)
    img = chroma(img, 16 * U * e["ca"] + AD.data.get("look", {}).get("ca", 0) * U)
    if e["pop"]:
        img = Image.fromarray(np.clip(np.asarray(img, np.float32) * (1 + 0.4 * e["pop"]), 0, 255).astype(np.uint8))
    img = grade(img)
    if e["flash"]:
        img = toward(img, (255, 255, 255), 0.85 * e["flash"])
    img = overlays(img, g)
    for c, x in post:
        img = toward(img, c, x)
    fi, fo = AD.frames(AD.data.get("fade_in", 0)), AD.frames(AD.data.get("fade_out", 0))
    if g < fi:
        img = toward(img, (0, 0, 0), 1 - (g + 1) / (fi + 1))
    if fo and g >= AD.N - fo:
        img = toward(img, (0, 0, 0), (g - (AD.N - fo) + 1) / fo)
    return np.asarray(grain(img, g), np.uint8).tobytes()


def setup(path, scale):
    global AD, W, H, U, PLAN
    AD = Ad(path)
    W, H = round(AD.W * scale / 2) * 2, round(AD.H * scale / 2) * 2
    U = W / 1080
    PLAN = {"shots": {s["id"]: plan_shot(s) for s in AD.shots},
            "hits": {s["id"]: hits_of(s) for s in AD.shots}, "match": {}}
    PLAN["vignette"] = vignette_mask(AD.data.get("look", {}).get("vignette", 0))
    for i, s in enumerate(AD.shots[:-1]):
        if s.get("out", {}).get("type") == "match":
            PLAN["match"][i] = match_plan(i)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ad")
    ap.add_argument("--preview", type=float, default=1.0, help="render scale, e.g. 0.5")
    ap.add_argument("--range", help="frames a-b")
    ap.add_argument("--frames", help="comma list of frames to write as PNGs (with --png)")
    ap.add_argument("--png", help="folder for --frames")
    ap.add_argument("--out")
    ap.add_argument("--jobs", type=int, default=max(1, (os.cpu_count() or 4) - 2))
    ap.add_argument("--no-audio", action="store_true")
    a = ap.parse_args()
    setup(a.ad, a.preview)
    print(f"{AD.file}: {len(AD.shots)} shots, {AD.N} frames ({AD.N / AD.fps:.2f} s) at {W}x{H}")
    for s in AD.shots:
        o = s.get("out", {}).get("type", "cut") if s is not AD.shots[-1] else "end"
        print(f"  {s['id']:>10} {s['_start']:4d}-{s['_start'] + s['_len'] - 1:<4d} {s['_len']:3d}f  -> {o}")
    if a.frames:
        os.makedirs(a.png, exist_ok=True)
        for g in map(int, a.frames.split(",")):
            Image.frombytes("RGB", (W, H), render(g)).save(os.path.join(a.png, f"{g:04d}.png"))
        print(f"wrote {a.png}")
        return
    g0, g1 = (0, AD.N - 1) if not a.range else map(int, a.range.split("-"))
    out = a.out or AD.path("out", os.path.basename(AD.dir) + ("_preview" if a.preview < 1 else "") + ".mp4")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    audio = AD.data.get("audio")
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(AD.fps), "-i", "-"]
    if audio and not a.no_audio and os.path.exists(AD.path(audio)):
        cmd += ["-ss", f"{g0 / AD.fps:.4f}", "-i", AD.path(audio), "-map", "0:v", "-map", "1:a", "-c:a", "aac",
                "-b:a", "256k", "-shortest"]
    cmd += ["-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with ProcessPoolExecutor(a.jobs, initializer=setup, initargs=(a.ad, a.preview)) as ex:
        for i, buf in enumerate(ex.map(render, range(g0, g1 + 1), chunksize=4)):
            enc.stdin.write(buf)
            if i % 60 == 0:
                print(f"  frame {g0 + i}/{g1}", end="\r", flush=True)
    enc.stdin.close()
    enc.wait()
    print(f"\nwrote {out}")


if __name__ == "__main__":
    main()
