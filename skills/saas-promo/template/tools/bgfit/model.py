"""Backdrop model v3 (port to Bg.sksl): a curved edge y = b(x) splits a deep-blue top (navy at
the very top, a dark blob) from a lit region below whose colour ramps white -> cyan ->
periwinkle with distance from a light at the bottom left; a soft glow runs along the edge."""
import numpy as np

def smoothstep(a, b, x):
    t = np.clip((x - a) / np.maximum(b - a, 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)

def mix(a, b, t):
    return a + (b - a) * t

COLS = ["white", "cyan", "peri", "deep", "navy", "glow"]
GEOM = ["b0", "b1", "b2", "b3", "ew", "lx", "ly", "lr", "r0", "r1", "top", "topg", "blob", "bx", "by", "br", "eg"]
C0 = {"white": (210, 232, 246), "cyan": (34, 176, 244), "peri": (62, 128, 250), "deep": (10, 4, 225), "navy": (4, 0, 90), "glow": (90, 120, 255)}
G0 = dict(b0=0.30, b1=0.25, b2=0.05, b3=0.0, ew=0.06, lx=-0.1, ly=1.1, lr=1.0, r0=0.35, r1=0.6, top=0.45, topg=1.2, blob=0.4, bx=0.35, by=-0.05, br=0.04, eg=0.4)
GLO = dict(b0=-0.6, b1=-3.0, b2=-4.0, b3=-4.0, ew=0.005, lx=-1.5, ly=0.2, lr=0.2, r0=0.0, r1=0.05, top=0.02, topg=0.2, blob=0.0, bx=-0.5, by=-0.6, br=0.003, eg=0.0)
GHI = dict(b0=1.4, b1=3.0, b2=4.0, b3=4.0, ew=0.4, lx=1.5, ly=2.5, lr=4.0, r0=1.5, r1=2.5, top=1.2, topg=4.0, blob=1.0, bx=2.3, by=0.5, br=0.3, eg=1.5)

def render(cols, g, W=1280, H=720, dots=0.0):
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float64)
    xs += 0.5; ys += 0.5
    aspect = W / H
    px, py = xs / W * aspect, ys / H
    xn = px / aspect   # 0..1
    b = g["b0"] + g["b1"] * xn + g["b2"] * xn * xn + g["b3"] * xn * xn * xn
    e = py - b
    s = smoothstep(-g["ew"], g["ew"], e)
    # lit region ramp
    d = np.sqrt((px - g["lx"]) ** 2 + (py - g["ly"]) ** 2) / g["lr"]
    lit = np.broadcast_to(cols["white"], (H, W, 3)).copy()
    lit = mix(lit, cols["cyan"], smoothstep(g["r0"] * 0.5, g["r0"], d)[..., None])
    lit = mix(lit, cols["peri"], smoothstep(g["r0"], g["r1"], d)[..., None])
    # dark region
    t = 1.0 - smoothstep(0.0, max(g["top"], 0.02), py) ** max(g["topg"], 0.2)
    dark = mix(np.broadcast_to(cols["deep"], (H, W, 3)), cols["navy"], t[..., None])
    bx, by = px - g["bx"], py - g["by"]
    dark = dark * (1.0 - g["blob"] * np.exp(-(bx * bx + by * by) / max(g["br"], 0.003)))[..., None]
    col = mix(dark, lit, s[..., None])
    # glow along the edge (just inside the lit side)
    gl = np.exp(-((e - g["ew"]) / (2.5 * g["ew"] + 0.02)) ** 2) * g["eg"]
    col = mix(col, cols["glow"], np.clip(gl, 0, 1)[..., None] * 0.5)
    if dots:
        a = 2 * np.pi * 0.2247
        col = col * (1.0 + dots * np.cos(a * xs) * np.cos(a * ys))[..., None]
    return np.clip(col, 0, 1)
