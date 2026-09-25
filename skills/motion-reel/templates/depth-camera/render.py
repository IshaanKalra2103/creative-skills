"""EVERY FRAME IS A LIE — v2, 20s vertical motion graphic from the 30-reel study.

New vs v1: real 3D camera (dive / parallax / orbit), depth of field, motion blur,
24 fps with characters on twos, cut to a licensed stock track (Mixkit "Stylz", 136 BPM).

uv run --with skia-python --with numpy python render.py            # full render
uv run --with skia-python --with numpy python render.py 1.2 5.5    # preview stills
"""
import math, os, subprocess, sys, wave
import numpy as np
import skia

W, H, FPS, DUR = 1080, 1920, 24, 20.0
SUB = 3                     # motion-blur sub-frames (180° shutter)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("OUT", os.path.join(os.getcwd(), "every-frame-is-a-lie.mp4"))
MUSIC = os.environ.get("MUSIC", f"{os.path.dirname(os.path.abspath(__file__))}/music.wav")  # 20s cut, see references/music.md

# ---------- theme: paper + ink + one cobalt accent ----------
PAPER = skia.Color(236, 229, 211)
PAPER2 = skia.Color(226, 217, 196)
INK = skia.Color(22, 20, 15)
COBALT = skia.Color(38, 64, 255)
BASE = 36
SCALE = [round(BASE * 1.618 ** i) for i in range(6)]  # 36 58 94 152 246 398

# music grid (video time): track Stylz @136 BPM, window starts 61.37s
BEAT = 60 / 136
HIT1, HIT2 = 0.906, 1.79          # first kick, full groove
S2, S3, S4, S5 = 4.90, 8.45, 13.20, 16.00
DIP1, DIP2, DIP3 = 3.63, 7.63, 17.90
CLICK = 19.13

tf_head = skia.Typeface.MakeFromFile(f"{HERE}/fonts/ArchivoBlack.ttf")
tf_mono = skia.Typeface.MakeFromFile(f"{HERE}/fonts/JBMono.ttf")
_fonts = {}
def font(kind, size):
    k = (kind, round(size, 1))
    if k not in _fonts:
        f = skia.Font(tf_head if kind == "head" else tf_mono, size)
        f.setEdging(skia.Font.Edging.kAntiAlias); f.setSubpixel(True)
        _fonts[k] = f
    return _fonts[k]
def width(s, kind, size): return font(kind, size).measureText(s)
def fit(s, kind, size, maxw):
    w = width(s, kind, size); return size if w <= maxw else size * maxw / w

# ---------- easing ----------
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def P(t, a, b): return clamp((t - a) / (b - a))
def eo(x): x = clamp(x); return 1 if x >= 1 else 1 - 2 ** (-10 * x)
def ei(x): x = clamp(x); return 0 if x <= 0 else 2 ** (10 * (x - 1))
def eio(x):
    x = clamp(x)
    if x in (0, 1): return x
    return 2 ** (20 * x - 10) / 2 if x < .5 else (2 - 2 ** (-20 * x + 10)) / 2
def cio(x): x = clamp(x); return 3 * x * x - 2 * x * x * x
def lerp(a, b, x): return a + (b - a) * x
def twos(t): return math.floor(t * 12) / 12        # animate on twos
def threes(t): return math.floor(t * 8) / 8

# ---------- paint / text helpers ----------
def paint(color, alpha=1.0, stroke=None, blend=None):
    p = skia.Paint(AntiAlias=True, Color=color)
    p.setAlphaf(clamp(alpha) * skia.ColorGetA(color) / 255)
    if stroke:
        p.setStyle(skia.Paint.kStroke_Style); p.setStrokeWidth(stroke)
        p.setStrokeCap(skia.Paint.kRound_Cap); p.setStrokeJoin(skia.Paint.kRound_Join)
    if blend is not None: p.setBlendMode(blend)
    return p

def text(c, s, x, y, kind, size, color, alpha=1.0, align="l"):
    f = font(kind, size); w = f.measureText(s)
    if align == "c": x -= w / 2
    elif align == "r": x -= w
    c.drawString(s, x, y, f, paint(color, alpha)); return w

def reveal(c, s, x, y, kind, size, color, p, align="l"):
    if p <= 0: return
    top, bot = y - size * 0.9, y + size * 0.15
    c.save(); c.clipRect(skia.Rect.MakeLTRB(0, top, W, bot))
    text(c, s, x, y + (1 - eo(p)) * (bot - top), kind, size, color, align=align); c.restore()

def typed(c, s, x, y, size, color, p, alpha=1.0, align="l"):
    n = int(len(s) * clamp(p))
    if align == "c": x -= width(s, "mono", size) / 2
    text(c, s[:n], x, y, "mono", size, color, alpha)

def slam(c, s, x, y, size, color, p, align="l", k=1.45):
    if p <= 0: return
    w = width(s, "head", size)
    ax = x + (w / 2 if align == "l" else 0)
    c.save(); c.translate(ax, y); sc = lerp(k, 1, eo(p)); c.scale(sc, sc)
    text(c, s, 0, 0, "head", size, color, min(1, p * 5), align="c"); c.restore()

def trimmed(c, path, p, color, w, alpha=1.0):
    if p <= 0: return
    pt = paint(color, alpha, stroke=w)
    if p < 1: pt.setPathEffect(skia.TrimPathEffect.Make(0, clamp(p)))
    c.drawPath(path, pt)

def leader(c, x0, y0, x1, y1, label, p, color=INK, above=True):
    if p <= 0: return
    q = eo(p)
    c.drawLine(x0, y0, lerp(x0, x1, q), lerp(y0, y1, q), paint(color, 1, stroke=3))
    c.drawCircle(x0, y0, 8 * q, paint(color))
    if q > .6:
        pill_w = width(label, "mono", 30) + 36
        r = skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(x1 - pill_w / 2, y1 - 26 if above else y1, pill_w, 52), 26, 26)
        c.drawRRect(r, paint(color))
        text(c, label, x1, (y1 if above else y1 + 26) + 10, "mono", 30, PAPER, align="c")

# ---------- tiny 3D camera ----------
F = 1100.0
class Cam:
    def __init__(s, x=0, y=0, z=0, yaw=0.0):
        s.x, s.y, s.z, s.yaw = x, y, z, yaw
        s.fx, s.fz = math.sin(yaw), math.cos(yaw)       # forward
        s.rx, s.rz = math.cos(yaw), -math.sin(yaw)      # right
    def to_cam(s, p):
        dx, dy, dz = p[0] - s.x, p[1] - s.y, p[2] - s.z
        return dx * s.rx + dz * s.rz, dy, dx * s.fx + dz * s.fz
    def proj(s, p):
        x, y, z = s.to_cam(p)
        if z < 30: return None
        return W / 2 + F * x / z, H / 2 + F * y / z, z

def orbit_cam(pivot, R, yaw):
    return Cam(pivot[0] - R * math.sin(yaw), pivot[1], pivot[2] - R * math.cos(yaw), yaw)

def card(c, cam, center, w, h, lw, lh, draw, blur=0.0, alpha=1.0):
    """draw a flat card (facing -z) in 3D; `draw(c)` paints in local 0..lw × 0..lh."""
    cx, cy, cz = center
    pts = [cam.proj((cx + dx * w / 2, cy + dy * h / 2, cz)) for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    if any(p is None for p in pts): return None
    m = skia.Matrix()
    if not m.setPolyToPoly([skia.Point(0, 0), skia.Point(lw, 0), skia.Point(lw, lh), skia.Point(0, lh)],
                           [skia.Point(p[0], p[1]) for p in pts]):
        return None
    c.save()
    layered = blur > .6 or alpha < .999
    if layered:
        lp = skia.Paint(); lp.setAlphaf(clamp(alpha))
        if blur > .6: lp.setImageFilter(skia.ImageFilters.Blur(blur, blur))
        c.saveLayer(None, lp)
    c.concat(m); draw(c)
    if layered: c.restore()
    c.restore()
    return pts

# ---------- precomputed textures ----------
rng = np.random.default_rng(11)
GRAIN = []
for _ in range(4):
    n = rng.normal(236, 16, (H // 2, W // 2)).clip(150, 255).astype(np.uint8)
    GRAIN.append(skia.Image.fromarray(np.dstack([n, n, n, np.full_like(n, 255)]), colorType=skia.kRGBA_8888_ColorType))

# ---------- characters ----------
def character(body, eyes_closed=False, look=0.0):
    def d(c):
        c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(20, 250, 260, 350), 110, 110), paint(body))
        c.drawCircle(150, 140, 120, paint(body))
        ex = 150 + look * 38
        for ox in (-38, 38):
            if eyes_closed:
                c.drawLine(ex + ox - 16, 150, ex + ox + 16, 150, paint(PAPER, 1, stroke=8))
            else:
                c.drawCircle(ex + ox, 146, 17, paint(PAPER))
                c.drawCircle(ex + ox + look * 6, 148, 8, paint(INK))
    return d

# ---------- scenes ----------
DIVE = []
for i in range(150):
    kind = rng.choice(["dot", "ring", "word", "cross", "bar"], p=[.35, .2, .15, .15, .15])
    z = rng.uniform(400, 9000)
    ang = rng.uniform(0, math.tau); r = rng.uniform(260, 1500)
    DIVE.append((kind, r * math.cos(ang), r * math.sin(ang) * 1.5, z, rng.uniform(40, 160),
                 rng.choice(["FRAME", "24 FPS", "DEPTH", "CAMERA", "TIMING", "STAGING", "PARALLAX", "ON 2s"]),
                 rng.random() < .15))

def dive_elem(kind, size, word, cob):
    col = COBALT if cob else INK
    def d(c):
        if kind == "dot": c.drawCircle(size / 2, size / 2, size / 2, paint(col))
        elif kind == "ring": c.drawCircle(size / 2, size / 2, size / 2 - 5, paint(col, 1, stroke=8))
        elif kind == "cross":
            c.drawLine(0, size / 2, size, size / 2, paint(col, 1, stroke=6)); c.drawLine(size / 2, 0, size / 2, size, paint(col, 1, stroke=6))
        elif kind == "bar": c.drawRect(skia.Rect.MakeXYWH(0, size * .4, size * 2, size * .2), paint(col))
        else: text(c, word, 0, size * .7, "mono", size * .5, col)
    return d

def scene1(c, t):  # 0 – 4.9  hook + Fight-Club dive
    c.drawColor(PAPER)
    travel = 9200 * (0.08 * t / S2 + 0.92 * ei(P(t, 0.6, S2)) ** 0.8)
    cam = Cam(0, 0, travel)
    c.save(); c.rotate(-8 * eio(P(t, 2.5, S2)), W / 2, H / 2)
    items = sorted(DIVE, key=lambda d: -d[3])
    for kind, x, y, z, size, word, cob in items:
        dz = z - travel
        if dz < 60: continue
        fog = clamp(1 - (dz - 1500) / 6000) * clamp((dz - 60) / 250)
        if fog <= 0.02: continue
        blur = clamp((600 - dz) / 500) * 10
        w = size * (2 if kind == "bar" else 1) * (2.4 if kind == "word" else 1)
        card(c, cam, (x, y, z), w, size, w, size, dive_elem(kind, size, word, cob), blur=blur, alpha=fog)
    # the tunnel's end: a cobalt disc we dive into
    card(c, cam, (0, 0, 9500), 900, 900, 100, 100, lambda k: k.drawCircle(50, 50, 50, paint(COBALT)),
         alpha=clamp((travel - 2000) / 3000))
    c.restore()
    # title (screen space), flies past the camera on the dip
    fly = ei(P(t, DIP1, S2 - .15))
    c.save(); c.translate(W / 2, 900); s = 1 + 5 * fly; c.scale(s, s); c.translate(-W / 2, -900)
    a = 1 - clamp(fly * 1.6)
    if a > 0:
        c.saveLayerAlpha(None, int(255 * a))
        typed(c, "EVERY", 540, 600, 58, INK, P(t, 0.15, 0.7), align="c")
        slam(c, "FRAME", 540, 900, fit("FRAME", "head", SCALE[5], 960), INK, P(t, HIT1, HIT1 + .25), align="c")
        slam(c, "IS A LIE.", 540, 1110, fit("IS A LIE.", "head", SCALE[4], 960), COBALT, P(t, HIT2, HIT2 + .25), align="c")
        typed(c, "notes from 30 reels on animation", 540, 1230, 30, INK, P(t, 2.4, 3.1), .8, align="c")
        c.restore()
    c.restore()

def restage(t, i):
    return cio(P(twos(t), 6.20 + i * .09, 6.75 + i * .09))

FLAT = [(-290, 1000), (0, 1000), (290, 1000)]
STAGED = [(185, 430), (40, 1000), (-560, 2700)]
BODIES = [INK, COBALT, INK]
GROUND = 700

def scene2(c, t):  # 4.9 – 8.45  staging in depth (fg / mid / bg) + parallax
    c.drawColor(PAPER)
    push = ei(P(t, DIP2, S3))
    cam = Cam(lerp(-90, 90, cio(P(t, S2, S3))), 0, 780 * push)
    # floor lines (room lines sell distance)
    fl = eo(P(t, 6.3, 6.9))
    if fl > 0:
        for x in range(-2400, 2401, 300):
            a, b = cam.proj((x, GROUND, 250)), cam.proj((x, GROUND, 7000))
            if a and b: c.drawLine(a[0], a[1], lerp(a[0], b[0], fl), lerp(a[1], b[1], fl), paint(INK, .13, stroke=2))
        for z in (400, 700, 1000, 1500, 2200, 3200, 4600):
            a, b = cam.proj((-3000, GROUND, z)), cam.proj((3000, GROUND, z))
            if a and b: c.drawLine(a[0], a[1], b[0], b[1], paint(INK, .13 * fl, stroke=2))
    # ground line for the flat version
    gl = cam.proj((0, GROUND, 1000))
    if gl and t < 6.6:
        c.drawLine(0, gl[1], W, gl[1], paint(INK, .5 * (1 - P(t, 6.2, 6.6)), stroke=3))
    heads = [None] * 3
    order = sorted(range(3), key=lambda i: -lerp(FLAT[i][1], STAGED[i][1], restage(t, i)))
    for i in order:
        k = restage(t, i)
        x, z = lerp(FLAT[i][0], STAGED[i][0], k), lerp(FLAT[i][1], STAGED[i][1], k)
        blink = 6.18 <= twos(t) < 6.30 or 7.05 + i * .2 <= twos(t) < 7.13 + i * .2
        look = 0.0 if k < .5 else (0.8 if i == 0 else -0.7)
        blur = clamp(abs(z - 1000) / 1000) * 12 * k
        pts = card(c, cam, (x, GROUND - 300, z), 300, 600, 300, 600, character(BODIES[i], blink, look), blur=blur)
        heads[i] = cam.proj((x, GROUND - 460, z))
    # titles
    if t < 6.25:
        slam(c, "FLAT.", 80, 330, SCALE[4], INK, P(t, S2 + .02, S2 + .25))
        typed(c, "same size. same line. no depth.", 80, 410, 32, INK, P(t, 5.3, 5.9), .85)
        strike = skia.Path(); strike.moveTo(70, 250); strike.lineTo(80 + width("FLAT.", "head", SCALE[4]) + 10, 262)
        trimmed(c, strike, eo(P(t, 5.95, 6.15)), COBALT, 16)
    else:
        reveal(c, "STAGE IT", 80, 300, "head", SCALE[3], INK, P(t, 6.25, 6.55))
        reveal(c, "IN DEPTH.", 80, 300 + SCALE[3] * .95, "head", SCALE[3], COBALT, P(t, 6.4, 6.7))
    if 6.8 < t < DIP2 + .2:
        labels = [("FOREGROUND", 0), ("MIDGROUND", 1), ("BACKGROUND", 2)]
        spots = [(700, 1420), (800, 1060), (300, 860)]
        for (lab, i), (lx, ly), t0 in zip(labels, spots, (6.85, 7.0, 7.15)):
            if heads[i] and 0 < heads[i][0] < W and 0 < heads[i][1] < H:
                leader(c, heads[i][0], heads[i][1], lx, ly, lab, P(t, t0, t0 + .25) * (1 - P(t, DIP2, DIP2 + .15)))

# city: buildings that line up perfectly only from the shot camera
CITY = []
x = -20
while x < W + 20:
    sw = rng.uniform(80, 190); sh = rng.uniform(240, 720)
    z = rng.uniform(900, 4600)
    CITY.append((x, sw, sh, z, rng.random() < .12)); x += sw + rng.uniform(-10, 14)
Y_G = 1330
PIVOT = (0, 0, 2600)

def building(sw, sh, cob):
    def d(c):
        c.drawRect(skia.Rect.MakeWH(sw, sh), paint(COBALT if cob else INK))
        for yy in np.arange(26, sh - 30, 40):
            for xx in np.arange(18, sw - 22, 34):
                c.drawRect(skia.Rect.MakeXYWH(xx, yy, 14, 20), paint(PAPER, .85))
    return d

def scene3(c, t):  # 8.45 – 13.2  animate to the camera
    c.drawColor(PAPER)
    orb = eio(P(t, 10.15, 11.2)) - eio(P(t, 11.95, 12.65))
    yaw = math.radians(55) * orb
    piv = (lerp(0, -1000, orb), 0, lerp(PIVOT[2], 2200, orb))
    cam = orbit_cam(piv, lerp(PIVOT[2], 6200, orb), yaw)
    # sun disc far away
    card(c, cam, (260 * 7000 / F, -300 * 7000 / F, 7000), 380 * 7000 / F, 380 * 7000 / F, 100, 100,
         lambda k: k.drawCircle(50, 50, 50, paint(COBALT, .9)))
    items = []
    for i, (sx, sw, sh, z, cob) in enumerate(CITY):
        grow = eo(P(twos(t), 8.5 + i * .05, 8.8 + i * .05))
        if grow <= 0: continue
        h = sh * grow
        cx = (sx + sw / 2 - W / 2) * z / F
        cy = (Y_G - h / 2 - H / 2) * z / F
        items.append((z, cx, cy, sw * z / F, h * z / F, sw, h, cob))
    items.sort(key=lambda it: -cam.to_cam((it[1], it[2], it[0]))[2])
    for z, cx, cy, w, h, lw, lh, cob in items:
        card(c, cam, (cx, cy, z), w, h, lw, lh, building(lw, lh, cob))
    # ground line lives in 3D too
    card(c, cam, (0, (Y_G + 3 - H / 2) * 900 / F, 900), 1400 * 900 / F, 6 * 900 / F, 10, 10,
         lambda k: k.drawRect(skia.Rect.MakeWH(10, 10), paint(INK)))
    # the shot camera + its frustum, visible once we orbit away
    if yaw > .05:
        a = clamp(yaw / math.radians(30))
        o = cam.proj((0, 0, 0))
        far = [cam.proj((sx * 5200 * W / 2 / F, sy * 5200 * H / 2 / F, 5200)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        if o:
            for fp in far:
                if fp: c.drawLine(o[0], o[1], fp[0], fp[1], paint(COBALT, .55 * a, stroke=3))
            c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(o[0] - 50, o[1] - 34, 80, 68), 10, 10), paint(COBALT, a))
            c.drawCircle(o[0] + 44, o[1], 20, paint(COBALT, a))
            typed(c, "SHOT CAMERA", o[0] - 200, o[1] + 80, 28, COBALT, P(t, 10.8, 11.2))
    # titles
    if t < 10.2:
        reveal(c, "LOOKS", 80, 330, "head", SCALE[3], INK, P(t, 9.1, 9.35))
        reveal(c, "PERFECT.", 80, 330 + SCALE[3] * .95, "head", SCALE[3], INK, P(t, 9.3, 9.55))
    elif t < 12.0:
        reveal(c, "FROM THE SIDE?", 80, 330, "head", fit("FROM THE SIDE?", "head", SCALE[3], 920), INK, P(t, 10.25, 10.5))
        slam(c, "BROKEN.", 80, 330 + SCALE[4] * 1.05, fit("BROKEN.", "head", SCALE[4], 920), COBALT, P(t, 10.95, 11.15))
    else:
        reveal(c, "ANIMATE TO", 80, 330, "head", fit("ANIMATE TO", "head", SCALE[3], 920), INK, P(t, 12.12, 12.35))
        reveal(c, "THE CAMERA.", 80, 330 + SCALE[3] * .95, "head", fit("THE CAMERA.", "head", SCALE[3], 920), COBALT, P(t, 12.25, 12.5))
        typed(c, "the frame is the only thing that matters", 80, 330 + SCALE[3] * 1.5, 30, INK, P(t, 12.4, 12.9), .85)

def scene4(c, t):  # 13.2 – 16.0  timing: on 1s / 2s / 3s
    c.drawColor(PAPER)
    reveal(c, "TIMING", 80, 330, "head", fit("TIMING", "head", SCALE[4], 920), INK, P(t, S4 - .04, S4 + .18))
    reveal(c, "IS FEEL.", 80, 330 + SCALE[4] * .9, "head", fit("IS FEEL.", "head", SCALE[4], 920), COBALT, P(t, S4 + .08, S4 + .3))
    rows = [("ON 1s", "24 drawings / sec · smooth", lambda u: u), ("ON 2s", "12 · the anime look", twos),
            ("ON 3s", "8 · stop-motion", threes)]
    for r, (lab, sub, q) in enumerate(rows):
        y0 = 1000 + r * 290
        a = eo(P(t, S4 + .35 + r * .12, S4 + .6 + r * .12))
        if a <= 0: continue
        c.drawLine(80, y0 + 90, 80 + (W - 160) * a, y0 + 90, paint(INK, .35, stroke=3))
        text(c, lab, 80, y0 - 70, "head", 44, COBALT if r == 1 else INK, a)
        text(c, sub, 80 + width(lab, "head", 44) + 24, y0 - 72, "mono", 26, INK, .7 * a)
        tq = q(max(0.0, t - (S4 + .5)))
        def pos(u):
            u = (u / 2.2) % 1
            x = 120 + (W - 240) * u
            ph = (u * 3) % 1
            return x, y0 + 60 - 230 * 4 * ph * (1 - ph)
        # onion skin: previous drawings
        for g in range(1, 4):
            step = {0: 1 / 24, 1: 1 / 12, 2: 1 / 8}[r]
            gx, gy = pos(max(0, tq - g * step))
            c.drawCircle(gx, gy, 30, paint(INK, .12 * a / g))
        bx, by = pos(tq)
        c.drawCircle(bx, by, 30, paint(COBALT if r == 1 else INK, a))

def scene5(c, t):  # 16.0 – 20  end card with a cursor demo + auto-zoom
    c.drawColor(PAPER)
    cur = cursor_pos(t)
    zin = eio(P(t, 17.75, 18.65)); zout = eio(P(t, 19.35, 19.95))
    z = 1 + .55 * zin - .55 * zout
    fx = lerp(W / 2, cur[0], zin * (1 - zout)); fy = lerp(H / 2, cur[1], zin * (1 - zout))
    c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-fx, -fy)
    s1 = fit("DESIGN", "head", SCALE[4], 920)
    reveal(c, "DESIGN", 80, 560, "head", s1, INK, P(t, S5, S5 + .22))
    reveal(c, "FOR THE", 80, 560 + SCALE[3] * .98, "head", SCALE[3], INK, P(t, S5 + BEAT, S5 + BEAT + .22))
    slam(c, "FRAME.", 80, 560 + SCALE[3] * .98 + s1 * .95, fit("FRAME.", "head", SCALE[4], 920), COBALT, P(t, S5 + 2 * BEAT, S5 + 2 * BEAT + .25))
    typed(c, "it only has to look right from here.", 80, 1150, 32, INK, P(t, 16.9, 17.6), .9)
    typed(c, "30 reels · notes from @aevyvideoschool", 80, 1200, 26, INK, P(t, 17.2, 17.8), .6)
    bp = eo(P(t, 17.1, 17.4))
    if bp > 0:
        pressed = t >= CLICK
        sq = 1 - .06 * math.exp(-(t - CLICK) * 18) if pressed else 1
        r = skia.Rect.MakeXYWH(80, 1300, 380 * bp, 96)
        c.save(); c.translate(270, 1348); c.scale(sq, sq); c.translate(-270, -1348)
        rr = skia.RRect.MakeRectXY(r, 48, 48)
        c.drawRRect(rr, paint(COBALT) if pressed else paint(INK, 1, stroke=5))
        if bp > .9: text(c, "SAVE THIS  ↓" if not pressed else "SAVED", 270, 1362, "mono", 34, PAPER if pressed else INK, align="c")
        c.restore()
        if pressed:
            rp = P(t, CLICK, CLICK + .5)
            c.drawCircle(cur[0], cur[1], 20 + 160 * eo(rp), paint(COBALT, (1 - rp) * .8, stroke=5))
    # cursor
    if t > 17.3:
        c.save(); c.translate(*cur); cs = 1.6 * (.9 if CLICK <= t < CLICK + .12 else 1); c.scale(cs, cs)
        ar = skia.Path(); ar.moveTo(0, 0); ar.lineTo(0, 40); ar.lineTo(10, 30); ar.lineTo(18, 47); ar.lineTo(25, 44); ar.lineTo(17, 27); ar.lineTo(30, 27); ar.close()
        c.drawPath(ar, paint(PAPER, 1, stroke=6)); c.drawPath(ar, paint(INK)); c.restore()
    c.restore()

def cursor_pos(t):
    u = cio(P(t, 17.3, 18.85))
    p0, p1, p2, p3 = (1150, 1750), (900, 1650), (600, 1500), (300, 1360)
    x = (1 - u) ** 3 * p0[0] + 3 * (1 - u) ** 2 * u * p1[0] + 3 * (1 - u) * u * u * p2[0] + u ** 3 * p3[0]
    y = (1 - u) ** 3 * p0[1] + 3 * (1 - u) ** 2 * u * p1[1] + 3 * (1 - u) * u * u * p2[1] + u ** 3 * p3[1]
    return x, y

SCENES = [(0, S2, scene1), (S2, S3, scene2), (S3, S4, scene3), (S4, S5, scene4), (S5, 20.01, scene5)]
KICKS = [(HIT1, 22), (HIT2, 14), (S2, 12), (S3, 10), (10.95, 14), (S4, 10), (S5 + 2 * BEAT, 18), (CLICK, 8)]

def shake(t):
    x = y = 0
    for i, (t0, a) in enumerate(KICKS):
        if t >= t0:
            d = t - t0; e = a * math.exp(-d * 14); x += e * math.sin(d * 80 + i); y += e * math.cos(d * 67 + 2 * i)
    return x, y

def frame(c, t):
    fn = next(f for a, b, f in SCENES if a <= t < b)
    c.save(); sx, sy = shake(t); c.translate(sx, sy)
    fn(c, t)
    c.restore()
    # HUD: frame counter (it's a video about frames)
    f = int(t * FPS)
    text(c, f"FRAME {f:04d}", 80, 120, "mono", 26, INK, .6)
    text(c, "24 FPS", W - 80, 120, "mono", 26, INK, .6, align="r")
    c.drawRect(skia.Rect.MakeXYWH(80, H - 100, (W - 160) * t / DUR, 4), paint(COBALT))
    # paper grain (multiply — a light texture wants a darken mode) + burnt edges
    g = GRAIN[(f // 2) % len(GRAIN)]
    c.drawImageRect(g, skia.Rect.MakeWH(W, H), skia.SamplingOptions(), paint(skia.ColorWHITE, 1, blend=skia.BlendMode.kMultiply))
    vs = skia.GradientShader.MakeRadial(skia.Point(W / 2, H / 2), H * .75,
                                        [skia.ColorSetA(INK, 0), skia.ColorSetA(INK, 60)], [0.6, 1])
    c.drawPaint(skia.Paint(Shader=vs))

def surface():
    return skia.Surface.MakeRaster(skia.ImageInfo.Make(W, H, skia.kRGBA_8888_ColorType, skia.kPremul_AlphaType))

def render_frame(srf, t):
    acc = None
    for k in range(SUB):
        ts = t + (k / SUB - .5 * (SUB - 1) / SUB) * (0.5 / FPS)
        c = srf.getCanvas(); c.clear(PAPER); frame(c, max(0, ts))
        a = srf.makeImageSnapshot().toarray().astype(np.float32)
        acc = a if acc is None else acc + a
    return (acc / SUB).astype(np.uint8)

# ---------- mix: stock track + a few SFX accents ----------
SR = 48000
def mix(path_in, path_out):
    with wave.open(path_in) as w:
        mus = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(np.float32) / 32768
    n = len(mus); out = mus.copy()
    def add(sig, t0, g):
        i = int(t0 * SR); j = min(n, i + len(sig)); out[i:j] += (sig[: j - i] * g)[:, None]
    def env(d, k): x = np.arange(int(d * SR)) / SR; return x, np.exp(-x * k)
    def whoosh(d):
        x = np.arange(int(d * SR)) / SR; e = (x / d) ** 2 * np.exp(-((x - d) * 10) ** 2 * 0)
        nz = rng.normal(0, 1, len(x)); sm = np.convolve(nz, np.ones(24) / 24, "same")
        return sm * e * 2.2
    def click():
        x, e = env(.06, 70); return np.sin(2 * np.pi * 1900 * x) * e
    def pop():
        x, e = env(.12, 30); f = 400 + 900 * x / .12; return np.sin(np.cumsum(2 * np.pi * f / SR)) * e
    add(whoosh(1.2), DIP1, .35)          # dive
    add(whoosh(.8), DIP2, .25)           # dolly push
    for i in range(3): add(pop(), 6.2 + i * .09, .18)
    add(whoosh(.9), 10.15, .2); add(whoosh(.6), 11.95, .18)   # orbit
    add(click(), CLICK, .5)
    out = np.clip(out, -1, 1)
    with wave.open(path_out, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())

if __name__ == "__main__":
    srf = surface()
    if len(sys.argv) > 1:
        for s in sys.argv[1:]:
            img = render_frame(srf, float(s))
            skia.Image.fromarray(img, colorType=skia.kRGBA_8888_ColorType).save(f"{HERE}/prev_{float(s):05.2f}.png", skia.kPNG)
        sys.exit()
    wav = f"{HERE}/mix.wav"; mix(MUSIC, wav)
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}",
                           "-r", str(FPS), "-i", "-", "-i", wav, "-c:v", "libx264", "-preset", "slow", "-crf", "18",
                           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", OUT],
                          stdin=subprocess.PIPE)
    for f in range(int(DUR * FPS)):
        ff.stdin.write(render_frame(srf, f / FPS).tobytes())
        if f % 48 == 0: print(f"frame {f}", flush=True)
    ff.stdin.close(); ff.wait(); print("wrote", OUT)
