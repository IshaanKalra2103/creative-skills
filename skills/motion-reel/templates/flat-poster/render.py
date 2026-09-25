"""STOP GUESSING — 20s vertical motion graphic built from the Aevy Video School lessons.

uv run --with skia-python --with numpy python render.py            # full render
uv run --with skia-python --with numpy python render.py 1.2 5.5    # preview stills
"""
import colorsys, math, os, subprocess, sys, wave
import numpy as np
import skia

W, H, FPS, DUR = 1080, 1920, 30, 20.0
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("OUT", os.path.join(os.getcwd(), "stop-guessing.mp4"))

# ---------- theme: one hue family (HSL 225) + one accent ----------
def hsl(h, s, l, a=1.0):
    r, g, b = colorsys.hls_to_rgb(h / 360, l / 100, s / 100)
    return skia.Color4f(r, g, b, a).toColor()

def rgba(c, a):
    return skia.ColorSetA(c, int(max(0, min(1, a)) * 255))

LIGHT = hsl(225, 72, 40)   # light source
HOLD = hsl(225, 68, 24)
FALL = hsl(225, 72, 13)
ANCHOR = hsl(225, 78, 6)
TINT = hsl(225, 55, 66)
ACCENT = skia.Color(255, 72, 38)
CREAM = hsl(225, 30, 94)  # "white" pulled toward the scene hue — colour is relative
GREY = skia.Color(138, 140, 148)

BASE = 36
SCALE = [round(BASE * 1.618 ** i) for i in range(6)]  # 36 58 94 152 246 398

tf_anton = skia.Typeface.MakeFromFile(f"{HERE}/fonts/Anton.ttf")
tf_mono = skia.Typeface.MakeFromFile(f"{HERE}/fonts/PlexMono.ttf")
tf_round = skia.Typeface.MakeFromFile(f"{HERE}/fonts/Fredoka.ttf")
try:
    axis = skia.FontArguments.VariationPosition.Coordinate(
        skia.FourByteTag.from_str("wght") if hasattr(skia, "FourByteTag") else 0x77676874, 600)
    tf_round = tf_round.makeClone(skia.FontArguments().setVariationDesignPosition(
        skia.FontArguments.VariationPosition([axis])))
except Exception:
    pass

_fonts = {}
def font(kind, size):
    k = (kind, size)
    if k not in _fonts:
        tf = {"anton": tf_anton, "mono": tf_mono, "round": tf_round}[kind]
        f = skia.Font(tf, size)
        f.setEdging(skia.Font.Edging.kAntiAlias)
        f.setSubpixel(True)
        _fonts[k] = f
    return _fonts[k]

# ---------- easing ----------
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def P(t, a, b): return clamp((t - a) / (b - a))
def eo(x): x = clamp(x); return 1 if x >= 1 else 1 - 2 ** (-10 * x)          # sharp snap
def ei(x): x = clamp(x); return 0 if x <= 0 else 2 ** (10 * (x - 1))
def eio(x):
    x = clamp(x)
    if x in (0, 1): return x
    return 2 ** (20 * x - 10) / 2 if x < .5 else (2 - 2 ** (-20 * x + 10)) / 2
def spring(x, k=5.5, w=11.0):                                                # soft, bouncy
    x = max(0, x); return 1 - math.exp(-k * x) * math.cos(w * x)
def lerp(a, b, x): return a + (b - a) * x

# ---------- precomputed textures ----------
rng = np.random.default_rng(7)
GRAIN = []
for _ in range(6):
    n = rng.normal(128, 38, (H // 2, W // 2)).clip(0, 255).astype(np.uint8)
    a = np.dstack([n, n, n, np.full_like(n, 255)])
    GRAIN.append(skia.Image.fromarray(a, colorType=skia.kRGBA_8888_ColorType))

def make_halftone():
    s = 16
    yy, xx = np.mgrid[0:H + 64, 0:W + 64]
    cx, cy = (xx // s) * s + s / 2, (yy // s) * s + s / 2
    d = np.hypot(cx - (W + 64), cy - 0) / math.hypot(W, H)
    r = np.clip((0.75 - d) * 12, 0, 7.5)
    m = (np.hypot(xx - cx, yy - cy) < r).astype(np.uint8) * 255
    a = np.dstack([m, m, m, m])
    return skia.Image.fromarray(np.ascontiguousarray(a), colorType=skia.kRGBA_8888_ColorType)
HALFTONE = make_halftone()

# ---------- drawing helpers ----------
def paint(color, alpha=1.0, stroke=None, blend=None, aa=True):
    p = skia.Paint(AntiAlias=aa, Color=color)
    p.setAlphaf(clamp(alpha) * skia.ColorGetA(color) / 255)
    if stroke:
        p.setStyle(skia.Paint.kStroke_Style)
        p.setStrokeWidth(stroke)
        p.setStrokeCap(skia.Paint.kRound_Cap)
        p.setStrokeJoin(skia.Paint.kRound_Join)
    if blend is not None: p.setBlendMode(blend)
    return p

def text(c, s, x, y, kind, size, color, alpha=1.0, align="l", spacing=0):
    f = font(kind, size)
    w = f.measureText(s)
    if align == "c": x -= w / 2
    elif align == "r": x -= w
    if spacing:
        for ch in s:
            c.drawString(ch, x, y, f, paint(color, alpha)); x += f.measureText(ch) + spacing
    else:
        c.drawString(s, x, y, f, paint(color, alpha))
    return w

def width(s, kind, size): return font(kind, size).measureText(s)

def fit(s, kind, size, maxw):
    w = width(s, kind, size)
    return size if w <= maxw else size * maxw / w

def reveal(c, s, x, y, kind, size, color, p, align="l"):
    """mask reveal: text rises out of a clip box (their text-reveal move)."""
    if p <= 0: return
    f = font(kind, size)
    top, bot = y - size * 0.95, y + size * 0.12
    c.save()
    c.clipRect(skia.Rect.MakeLTRB(0, top, W, bot))
    text(c, s, x, y + (1 - eo(p)) * (bot - top), kind, size, color, align=align)
    c.restore()

def typed(c, s, x, y, kind, size, color, p, alpha=1.0, cursor=True):
    n = int(len(s) * clamp(p))
    text(c, s[:n], x, y, kind, size, color, alpha)
    if cursor and 0 < p < 1.15:
        cx = x + width(s[:n], kind, size) + 4
        c.drawRect(skia.Rect.MakeXYWH(cx, y - size * .8, size * .5, size * .95), paint(ACCENT, alpha))

def trimmed(c, path, p, color, w, alpha=1.0):
    if p <= 0: return
    pt = paint(color, alpha, stroke=w)
    if p < 1: pt.setPathEffect(skia.TrimPathEffect.Make(0, clamp(p)))
    c.drawPath(path, pt)

def arrow(c, pts, p, color=None, w=5):
    """hand-drawn annotation arrow along a cubic."""
    color = color or CREAM
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = pts
    path = skia.Path(); path.moveTo(x0, y0); path.cubicTo(x1, y1, x2, y2, x3, y3)
    trimmed(c, path, p / 0.8, color, w)
    hp = P(p, .75, 1)
    if hp > 0:
        ang = math.atan2(y3 - y2, x3 - x2)
        for da in (2.6, -2.6):
            L = 34 * eo(hp)
            c.drawLine(x3, y3, x3 + L * math.cos(ang + da), y3 + L * math.sin(ang + da), paint(color, 1, stroke=w))

def star(cx, cy, ro, ri, n, rot):
    path = skia.Path()
    for i in range(n * 2):
        r = ro if i % 2 == 0 else ri
        a = rot + i * math.pi / n - math.pi / 2
        (path.moveTo if i == 0 else path.lineTo)(cx + r * math.cos(a), cy + r * math.sin(a))
    path.close(); return path

def blob(cx, cy, R, t, sx=1.0, sy=1.0):
    pts = []
    for i in range(64):
        a = i / 64 * math.tau
        r = R * (1 + .07 * math.sin(3 * a + t * 2.1) + .045 * math.sin(5 * a - t * 1.6) + .03 * math.sin(2 * a + t * 3))
        pts.append((cx + r * math.cos(a) * sx, cy + r * math.sin(a) * sy))
    path = skia.Path()
    mid = lambda a, b: ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    path.moveTo(*mid(pts[-1], pts[0]))
    for i, pnt in enumerate(pts):
        m = mid(pnt, pts[(i + 1) % 64]); path.quadTo(pnt[0], pnt[1], m[0], m[1])
    path.close(); return path

def gradient_bg(c, lift=0.0):
    """4-stop HSL gradient (light source → hold → falloff → anchor) + corner light spots."""
    sh = skia.GradientShader.MakeLinear(
        [skia.Point(0, 0), skia.Point(W * .55, H)],
        [LIGHT, HOLD, FALL, ANCHOR], [0, .28, .62, 1])
    c.drawPaint(skia.Paint(Shader=sh))
    for (x, y, r, col, a) in [(-80, -60, 900, TINT, .28 + lift), (W + 120, H * .78, 800, LIGHT, .35)]:
        rs = skia.GradientShader.MakeRadial(skia.Point(x, y), r, [rgba(col, a), rgba(col, 0)])
        c.drawPaint(skia.Paint(Shader=rs))

def fill(c, color): c.drawRect(skia.Rect.MakeWH(W, H), paint(color))

def header(c, t, t0, num, label, title, color=None, size=None):
    color = color or CREAM
    typed(c, f"{num} — {label}", 80, 200, "mono", 30, color, P(t, t0, t0 + .35), alpha=.8)
    if title:
        s = size or fit(title, "anton", SCALE[2], W - 160)
        reveal(c, title, 80, 310, "anton", s, color, P(t, t0 + .15, t0 + .5))

# ---------- scenes ----------
JUNK = [(rng.uniform(40, 900), rng.uniform(250, 1650), rng.uniform(60, 340), rng.uniform(20, 180),
         rng.uniform(-25, 25)) for _ in range(9)]

def scene1(c, t):  # 0.0–3.0 hook
    gradient_bg(c)
    # scattered "wrong layout" junk, jittering on twos
    step = math.floor(t * 15) / 15
    for i, (x, y, w, h, r) in enumerate(JUNK):
        a = P(t, .05 + i * .03, .3 + i * .03) * .16
        c.save(); c.translate(x + 6 * math.sin(step * 7 + i), y + 6 * math.cos(step * 5 + i)); c.rotate(r)
        c.drawRect(skia.Rect.MakeXYWH(0, 0, w, h), paint(CREAM, a)); c.restore()
    # STOP — slams with a sharp snap
    p = P(t, .12, .42)
    if p > 0:
        s = lerp(1.6, 1, eo(p))
        c.save(); c.translate(80, 820); c.scale(s, s)
        text(c, "STOP", 0, 0, "anton", SCALE[5], ACCENT, alpha=min(1, p * 4)); c.restore()
    gs = fit("GUESSING.", "anton", SCALE[4], W - 160)
    reveal(c, "GUESSING.", 80, 820 + gs * .98, "anton", gs, CREAM, P(t, .55, .9))
    # underline + sub
    ul = skia.Path(); ul.moveTo(84, 1090); ul.cubicTo(380, 1076, 700, 1100, 990, 1084)
    trimmed(c, ul, eo(P(t, 1.0, 1.35)), ACCENT, 10)
    typed(c, "layouts. type sizes. colours. motion.", 80, 1190, "mono", SCALE[0], CREAM, P(t, 1.25, 2.0), .85)
    typed(c, "there's a system for all of it.", 80, 1245, "mono", SCALE[0], CREAM, P(t, 1.75, 2.4), .85)

# S2 targets: hero block on the top-left thirds point, grouped bars, similar squares, small credits
S2_T = [(80, 380, 520, 360, ACCENT), (80, 790, 700, 56, CREAM), (80, 870, 470, 30, CREAM),
        (80, 1300, 200, 200, TINT), (300, 1300, 200, 200, TINT), (520, 1300, 200, 200, TINT),
        (780, 1520, 220, 18, CREAM), (860, 1300, 140, 140, HOLD)]
S2_C = [(rng.uniform(80, 700), rng.uniform(400, 1500), rng.uniform(80, 300), rng.uniform(40, 260),
         rng.uniform(-35, 35)) for _ in S2_T]

def scene2(c, t):  # 3.0–7.0 layout
    gradient_bg(c)
    header(c, t, 3.1, "01", "LAYOUT", "GUIDE THE EYE.")
    # thirds grid
    gp = eo(P(t, 4.55, 5.0))
    for x in (W / 3, W * 2 / 3):
        c.drawLine(x, 0, x, H * gp, paint(CREAM, .22, stroke=2))
    for y in (H / 3, H * 2 / 3):
        c.drawLine(0, y, W * gp, y, paint(CREAM, .22, stroke=2))
    exit_p = eio(P(t, 6.45, 7.0))
    for i, ((tx, ty, tw, th, col), (cx, cy, cw, ch, cr)) in enumerate(zip(S2_T, S2_C)):
        appear = eo(P(t, 3.05 + i * .04, 3.35 + i * .04))
        if appear <= 0: continue
        drift = math.sin(t * 2 + i) * 8
        k = eo(P(t, 4.0 + i * .05, 4.4 + i * .05))
        x, y = lerp(cx + drift, tx, k), lerp(cy - drift, ty, k)
        w, h, r = lerp(cw, tw, k), lerp(ch, th, k), lerp(cr, 0, k)
        colr = col if k > .5 else GREY
        alpha = appear
        if i == 0:   # hero block → becomes the red rule of scene 3 (match cut)
            x, y, w, h = lerp(x, 80, exit_p), lerp(y, 420, exit_p), lerp(w, 8, exit_p), lerp(h, 1160, exit_p)
        else:
            alpha *= 1 - eo(P(t, 6.35 + i * .02, 6.6 + i * .02))
        c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(r)
        c.drawRect(skia.Rect.MakeXYWH(-w / 2, -h / 2, w, h), paint(colr, alpha)); c.restore()
    # intersection pulses
    for (x, y) in [(W / 3, H / 3), (W * 2 / 3, H / 3), (W / 3, H * 2 / 3), (W * 2 / 3, H * 2 / 3)]:
        pp = P(t, 4.9, 5.5)
        if 0 < pp < 1:
            c.drawCircle(x, y, 10 + 60 * eo(pp), paint(CREAM, (1 - pp) * .8, stroke=3))
        if t > 4.9: c.drawCircle(x, y, 7 * eo(P(t, 4.9, 5.1)) * (1 - exit_p), paint(CREAM, .8))
    # F-pattern eye path
    path = skia.Path(); path.moveTo(140, 560); path.lineTo(960, 560)
    path.cubicTo(700, 700, 300, 720, 140, 830); path.lineTo(720, 830)
    path.cubicTo(500, 1000, 200, 1150, 150, 1400)
    ep = eio(P(t, 5.15, 6.2)) * (1 - exit_p)
    trimmed(c, path, ep, rgba(CREAM, 1), 6, alpha=.9)
    if 0 < ep < 1:
        pm = skia.PathMeasure(path, False)
        pos, _ = pm.getPosTan(pm.getLength() * ep)
        c.drawCircle(pos.x(), pos.y(), 16, paint(CREAM))
        c.drawCircle(pos.x(), pos.y(), 34, paint(CREAM, .25))
    # annotation
    if t < 6.45:
        arrow(c, [(930, 330), (900, 440), (760, 470), (640, 470)], P(t, 5.45, 5.9))
        typed(c, "HERO SPOT", 690, 310, "mono", 34, CREAM, P(t, 5.55, 5.95))
        typed(c, "proximity", 580, 950, "mono", 26, CREAM, P(t, 5.8, 6.1), .7, cursor=False)
        typed(c, "similarity", 80, 1560, "mono", 26, CREAM, P(t, 5.9, 6.2), .7, cursor=False)

def scene3(c, t):  # 7.0–11.0 type scale
    gradient_bg(c)
    header(c, t, 7.05, "02", "HIERARCHY", "DON'T GUESS. MULTIPLY.")
    out = lambda i: eio(P(t, 10.45 + i * .05, 10.85 + i * .05))
    # spine rule (from scene 2 hero block)
    ro = out(0)
    c.drawRect(skia.Rect.MakeXYWH(80 - 1400 * ro, 420, 8, 1160), paint(ACCENT))
    y = 420
    for i, s in enumerate(SCALE):
        y += s * .86 + 26
        p = P(t, 7.25 + i * .33, 7.55 + i * .33)
        dx = -1300 * out(i + 1)
        col = ACCENT if i == 5 else CREAM
        for g, ga in ((0, 1), (70, .25), (140, .1)) if 0 < out(i + 1) < 1 else ((0, 1),):
            c.save(); c.translate(dx + g * out(i + 1), 0)
            if ga < 1: c.saveLayerAlpha(None, int(255 * ga))
            reveal(c, "TYPE", 120, y, "anton", s, col, p)
            if ga < 1: c.restore()
            c.restore()
        lx = 120 + width("TYPE", "anton", s) + 30
        ly = y
        if i == 5: lx, ly = 90, y + 70
        lbl = f"{s}px" if i == 0 else f"×1.618 = {s}px"
        if out(i + 1) < .2:
            c.drawLine(lx, ly - 12, lx + 40 * eo(P(t, 7.5 + i * .33, 7.8 + i * .33)), ly - 12, paint(CREAM, .5, stroke=2))
            typed(c, lbl, lx + 55, ly, "mono", 28, CREAM, P(t, 7.55 + i * .33, 7.95 + i * .33), .8, cursor=False)
    typed(c, "golden ratio → bold, dramatic, premium", 80, 1760, "mono", 30, CREAM, P(t, 9.3, 10.0) * (1 - out(6)), .75)

def scene4(c, t):  # 11.0–14.5 kiki / bouba
    op = eio(P(t, 14.05, 14.5))
    # top half: KIKI (sharp)
    c.save(); c.translate(0, -960 * op)
    c.clipRect(skia.Rect.MakeWH(W, 960)); fill(c, ANCHOR); gradient_bg(c)
    header(c, t, 11.05, "03", "FEELING", None)
    reveal(c, "KIKI", 80, 560, "anton", SCALE[4], CREAM, P(t, 11.1, 11.35))
    k = eo(P(t, 11.15, 11.4))
    steps = sum(eo(P(t, 11.9 + j * .5, 12.0 + j * .5)) for j in range(6))
    if k > 0:
        c.save(); c.translate(760, 560); c.scale(k, k)
        c.drawPath(star(0, 0, 230, 105, 9, math.radians(20 * steps)), paint(ACCENT)); c.restore()
    typed(c, "sharp snaps. hard angles.", 80, 780, "mono", 30, CREAM, P(t, 11.5, 12.1), .85, cursor=False)
    typed(c, "→ premium, edgy", 80, 830, "mono", 30, ACCENT, P(t, 11.9, 12.3), 1, cursor=False)
    c.restore()
    # bottom half: bouba (soft)
    c.save(); c.translate(0, 960 * op)
    c.clipRect(skia.Rect.MakeXYWH(0, 960, W, 960)); fill(c, TINT)
    rs = skia.GradientShader.MakeRadial(skia.Point(900, 1100), 900, [rgba(hsl(225, 60, 80), 1), rgba(TINT, 0)])
    c.drawPaint(skia.Paint(Shader=rs))
    b = spring(t - 11.6)
    if t > 11.6:
        bt = (t - 11.6) % .5
        sq = .07 * math.exp(-bt * 7) * math.cos(bt * 30)
        c.save(); c.translate(330, 1450); c.scale(b, b)
        c.drawPath(blob(0, 0, 200, t, 1 + sq, 1 - sq), paint(CREAM)); c.restore()
    bs = spring(P(t, 11.75, 12.9) * 1.2)
    if t > 11.75:
        c.save(); c.translate(580, 1400); c.scale(bs, bs)
        text(c, "bouba", 0, 0, "round", SCALE[3], ANCHOR); c.restore()
    typed(c, "soft ease. round curves.", 580, 1480, "mono", 26, ANCHOR, P(t, 12.0, 12.6), .85, cursor=False)
    typed(c, "→ playful, friendly", 580, 1525, "mono", 26, ANCHOR, P(t, 12.4, 12.8), 1, cursor=False)
    c.restore()
    # divider + velocity graphs
    if op < 1:
        dp = eo(P(t, 11.0, 11.35))
        c.drawRect(skia.Rect.MakeXYWH(0, 956 - 960 * op, W * dp, 4), paint(ACCENT))
        c.drawRect(skia.Rect.MakeXYWH(0, 960 + 960 * op, W * dp, 4), paint(ACCENT))
        vs = eo(P(t, 11.3, 11.5)) * (1 - op)
        if vs > 0:
            c.drawCircle(W - 150, 958, 46 * vs, paint(ACCENT))
            text(c, "VS", W - 150, 958 + 14, "anton", 40 * vs, CREAM, align="c")
    # small speed graphs, drawn like their graph-editor overlay
    gp = P(t, 12.5, 13.3) * (1 - op)
    if gp > 0:
        g1 = skia.Path(); g1.moveTo(640, 915 - 960 * op); g1.lineTo(680, 915 - 960 * op)
        g1.lineTo(690, 820 - 960 * op); g1.cubicTo(705, 905 - 960 * op, 760, 915 - 960 * op, 1000, 915 - 960 * op)
        trimmed(c, g1, gp, CREAM, 4, .8)
        g2 = skia.Path(); oy = 960 * op
        g2.moveTo(620, 1720 + oy); g2.cubicTo(720, 1720 + oy, 740, 1600 + oy, 810, 1600 + oy)
        g2.cubicTo(880, 1600 + oy, 880, 1700 + oy, 920, 1735 + oy); g2.cubicTo(950, 1745 + oy, 970, 1720 + oy, 1000, 1720 + oy)
        trimmed(c, g2, gp, ANCHOR, 4, .8)

def scene5(c, t):  # 14.1–17.5 colour is relative
    fill(c, hsl(225, 70, 11))
    uni = eio(P(t, 15.9, 16.3))
    # right half: bright accent, then a neutral mid-tone wipes both halves
    c.drawRect(skia.Rect.MakeXYWH(W / 2, 0, W / 2, H), paint(hsl(28, 95, 62)))
    c.drawRect(skia.Rect.MakeXYWH(0, 0, W, H * uni), paint(hsl(225, 18, 42)))
    header(c, t, 14.55, "04", "COLOUR", "WHICH GREY IS LIGHTER?")
    m = eio(P(t, 16.45, 16.85))
    grow = eio(P(t, 17.05, 17.5))
    sz = 300
    for i, cx in enumerate((270, 810)):
        a = eo(P(t, 14.6 + i * .12, 14.9 + i * .12))
        x = lerp(cx, 540, m)
        s = sz * a
        if grow > 0:
            s = lerp(sz, 2400, grow)
        col = GREY if grow == 0 else skia.Color4f.FromColor(GREY).toColor() if grow < .01 else \
            skia.Color(*[int(lerp(v1, v2, grow)) for v1, v2 in zip((138, 140, 148), (18, 30, 72))])
        c.drawRect(skia.Rect.MakeXYWH(x - s / 2, 960 - s / 2, s, s), paint(col))
    if grow == 0:
        typed(c, "A", 270 - 12, 1180, "mono", 34, CREAM, P(t, 15.0, 15.2) * (1 - m), cursor=False)
        typed(c, "B", 810 - 12, 1180, "mono", 34, ANCHOR if uni < .5 else CREAM, P(t, 15.1, 15.3) * (1 - m), cursor=False)
        reveal(c, "SAME GREY.", 540, 1320, "anton", SCALE[3], CREAM, P(t, 16.6, 16.9), align="c")
        ul = skia.Path(); ul.moveTo(340, 1350); ul.cubicTo(480, 1340, 620, 1358, 740, 1346)
        trimmed(c, ul, eo(P(t, 16.8, 17.0)), ACCENT, 9)
        typed(c, "your eye judges colour by its neighbours", 540 - width("your eye judges colour by its neighbours", "mono", 28) / 2,
              1430, "mono", 28, CREAM, P(t, 16.75, 17.1), .85, cursor=False)

def scene6(c, t):  # 17.5–20 end card
    gradient_bg(c, lift=.05)
    typed(c, "STOP GUESSING.", 80, 200, "mono", 30, CREAM, P(t, 17.55, 17.9), .8)
    reveal(c, "DESIGN", 80, 700, "anton", SCALE[4], CREAM, P(t, 17.6, 17.85))
    reveal(c, "WHAT THEY", 80, 700 + SCALE[3] + 20, "anton", SCALE[3], CREAM, P(t, 17.85, 18.1))
    p = P(t, 18.1, 18.35)
    if p > 0:
        s = lerp(1.5, 1, eo(p))
        c.save(); c.translate(80, 1260); c.scale(s, s)
        text(c, "FEEL.", 0, 0, "anton", SCALE[5], ACCENT, min(1, p * 4)); c.restore()
    typed(c, "20 lessons. 1 system.", 80, 1390, "mono", 34, CREAM, P(t, 18.6, 19.0), .9, cursor=False)
    typed(c, "notes from @aevyvideoschool", 80, 1440, "mono", 28, CREAM, P(t, 18.85, 19.3), .6, cursor=False)
    bp = eo(P(t, 19.1, 19.4))
    if bp > 0:
        r = skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(80, 1500, 360 * bp, 70), 35, 35)
        c.drawRRect(r, paint(ACCENT, 1, stroke=4))
        if bp > .9: text(c, "SAVE THIS  ↓", 110, 1546, "mono", 28, ACCENT)

# ---------- camera, HUD, texture ----------
SLAMS = [(.12, 26), (3.0, 10), (4.0, 12), (7.0, 8), (11.15, 16), (14.5, 10), (17.5, 10), (18.1, 28)]

def shake(t):
    x = y = 0
    for i, (t0, a) in enumerate(SLAMS):
        if t >= t0:
            d = t - t0; e = a * math.exp(-d * 13)
            x += e * math.sin(d * 75 + i); y += e * math.cos(d * 61 + i * 2)
    return x, y

SCENES = [(0, 3.0, scene1), (3.0, 7.0, scene2), (7.0, 11.0, scene3), (11.0, 14.5, scene4), (14.5, 17.5, scene5), (17.5, 20.01, scene6)]
LABELS = ["INTRO", "01/04", "02/04", "03/04", "04/04", "END"]

def wipe(c, t):
    """S1→S2 red diagonal panel wipe."""
    p = P(t, 2.62, 3.22)
    if 0 < p < 1:
        a, b = eio(clamp(p * 2)), eio(clamp(p * 2 - 1))
        x0, x1 = lerp(-1400, 0, b) * 0 + lerp(-600, 1700, b), lerp(-600, 1700, a)
        path = skia.Path()
        path.moveTo(x0 - 500, H); path.lineTo(x1 - 500, H); path.lineTo(x1 + 500, 0); path.lineTo(x0 + 500, 0); path.close()
        c.drawPath(path, paint(ACCENT))

def frame(c, t):
    idx = next(i for i, (a, b, _) in enumerate(SCENES) if a <= t < b)
    a, b, fn = SCENES[idx]
    c.save()
    zoom = 1 + .035 * (t - a) / (b - a)
    sx, sy = shake(t)
    c.translate(W / 2 + sx, H / 2 + sy); c.scale(zoom, zoom); c.translate(-W / 2, -H / 2)
    if 2.92 <= t < 3.0:          # swap to scene 2 underneath the red wipe
        scene2(c, t)
    elif 14.05 <= t < 14.5:      # scene 4 splits open over scene 5
        scene5(c, t); scene4(c, t)
    else:
        fn(c, t)
    c.restore()
    wipe(c, t)
    # halftone drifting (moiré-ish shimmer when it moves)
    c.save(); c.translate(-32 + 20 * math.sin(t * .5), -32 + 14 * math.cos(t * .4))
    c.drawImage(HALFTONE, 0, 0, skia.SamplingOptions(), paint(skia.ColorWHITE, .09, blend=skia.BlendMode.kScreen))
    c.restore()
    # vignette
    vs = skia.GradientShader.MakeRadial(skia.Point(W / 2, H / 2), H * .72, [rgba(skia.ColorBLACK, 0), rgba(skia.ColorBLACK, .45)], [0.55, 1])
    c.drawPaint(skia.Paint(Shader=vs))
    # HUD details
    ha = P(t, .3, .6)
    text(c, "MOTION NOTES", 80, 120, "mono", 24, CREAM, .55 * ha, spacing=2)
    text(c, LABELS[idx], W - 80, 120, "mono", 24, CREAM, .55 * ha, align="r")
    for (x, y, dx, dy) in [(40, 40, 1, 1), (W - 40, 40, -1, 1), (40, H - 40, 1, -1), (W - 40, H - 40, -1, -1)]:
        c.drawLine(x, y, x + 30 * dx, y, paint(CREAM, .5 * ha, stroke=2))
        c.drawLine(x, y, x, y + 30 * dy, paint(CREAM, .5 * ha, stroke=2))
    c.drawRect(skia.Rect.MakeXYWH(80, H - 90, (W - 160) * t / DUR, 3), paint(ACCENT, .9 * ha))
    c.drawRect(skia.Rect.MakeXYWH(80, H - 90, W - 160, 3), paint(CREAM, .15 * ha))
    # film grain on twos
    g = GRAIN[(int(t * FPS) // 2) % len(GRAIN)]
    c.drawImageRect(g, skia.Rect.MakeWH(W, H), skia.SamplingOptions(), paint(skia.ColorWHITE, .42, blend=skia.BlendMode.kOverlay))

# ---------- sound design on a 120 BPM grid ----------
SR = 48000
def audio(path):
    n = int(SR * DUR); L = np.zeros(n); tt = np.arange(n) / SR
    def add(sig, t0, gain=1.0):
        i = int(t0 * SR); j = min(n, i + len(sig)); L[i:j] += sig[: j - i] * gain
    def env(d, k): x = np.arange(int(d * SR)) / SR; return x, np.exp(-x * k)
    def kick(g=1.0):
        x, e = env(.45, 9); f = 45 + 110 * np.exp(-x * 30)
        return np.sin(np.cumsum(2 * np.pi * f / SR)) * e * g
    def noise(d, k): x, e = env(d, k); return rng.normal(0, 1, len(x)) * e
    def lowpass(sig, cut):
        out = np.empty_like(sig); y = 0.0
        cut = np.broadcast_to(cut, sig.shape)
        for i, (s, fc) in enumerate(zip(sig, cut)):
            a = 1 - math.exp(-2 * math.pi * fc / SR); y += a * (s - y); out[i] = y
        return out
    def whoosh(d=.45):
        x = np.arange(int(d * SR)) / SR; sh = np.sin(np.pi * x / d) ** 2
        return lowpass(rng.normal(0, 1, len(x)), 300 + 5000 * sh) * sh * 1.6
    def tick(f=2200): x, e = env(.05, 90); return np.sin(2 * np.pi * f * x) * e
    def bloop():
        x, e = env(.22, 16); f = 260 + 700 * (x / .22)
        return np.sin(np.cumsum(2 * np.pi * f / SR)) * e
    def boom():
        x, e = env(2.2, 2.2); return (np.sin(2 * np.pi * 42 * x) * e + lowpass(noise(2.2, 3.5), 400) * .6)
    # bed: low drone + pulse
    L += (np.sin(2 * np.pi * 55 * tt) + .5 * np.sin(2 * np.pi * 82.4 * tt) + .3 * np.sin(2 * np.pi * 110.3 * tt)) * .05 * (.6 + .4 * np.sin(tt * 1.3))
    for b in np.arange(3.0, 17.0, .5): add(kick(), b, .55)
    for b in np.arange(3.25, 17.0, .5): add(noise(.05, 80), b, .06)          # offbeat hat
    add(kick(), .12, 1.0); add(noise(.35, 12), .12, .5)                       # STOP slam
    add(tick(1400), .55, .4)
    for w0 in (2.55, 6.55, 10.4, 13.95): add(whoosh(), w0, .5)
    for i in range(len(S2_T)): add(tick(1800 + i * 120), 4.0 + i * .05, .35)  # grid snaps
    for i in range(6): add(tick(900 + i * 250), 7.25 + i * .33, .45)          # type ladder
    add(noise(.12, 40), 11.15, .5)
    for j in range(6): add(noise(.06, 70), 11.9 + j * .5, .35)               # kiki snaps
    add(bloop(), 11.6, .6); add(bloop(), 11.75, .4)
    for b in np.arange(12.1, 14.0, .5): add(bloop(), b, .18)
    add(tick(700), 15.9, .5); add(tick(1200), 16.45, .5)
    x = np.arange(int(1.0 * SR)) / SR                                          # riser into end
    add((np.sin(np.cumsum(2 * np.pi * (200 + 900 * x) / SR)) * .3 + rng.normal(0, 1, len(x)) * .35) * (x / 1.0) ** 2, 16.5, .6)
    add(boom(), 17.5, .7); add(kick(), 17.5, .8)
    add(kick(), 18.1, 1.0); add(boom(), 18.1, .9); add(noise(.3, 14), 18.1, .4)
    fade = np.clip((DUR - tt) / .6, 0, 1); L *= fade
    L = np.tanh(L * 1.4) / np.tanh(1.4)
    L = L / np.abs(L).max() * .89
    st = (np.stack([L, L], 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())

def surface():
    return skia.Surface.MakeRaster(skia.ImageInfo.Make(W, H, skia.kRGBA_8888_ColorType, skia.kPremul_AlphaType))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        for s in sys.argv[1:]:
            srf = surface(); frame(srf.getCanvas(), float(s))
            srf.makeImageSnapshot().save(f"{HERE}/prev_{float(s):05.2f}.png", skia.kPNG)
        sys.exit()
    wav = f"{HERE}/audio.wav"; audio(wav)
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}",
                           "-r", str(FPS), "-i", "-", "-i", wav, "-c:v", "libx264", "-preset", "slow", "-crf", "17",
                           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT],
                          stdin=subprocess.PIPE)
    srf = surface()
    for f in range(int(DUR * FPS)):
        c = srf.getCanvas(); c.clear(skia.ColorBLACK); frame(c, f / FPS)
        ff.stdin.write(srf.makeImageSnapshot().tobytes())
        if f % 60 == 0: print(f"frame {f}", flush=True)
    ff.stdin.close(); ff.wait(); print("wrote", OUT)
