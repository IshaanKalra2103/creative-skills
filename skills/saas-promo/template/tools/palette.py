# /// script
# dependencies = ["numpy"]
# ///
"""A full [palette] block from one brand colour (OKLab ramps, same lightness steps as the
fitted blue reference), so a promo can be re-coloured in one line.

    uv run tools/palette.py "#ff5a1f"            # print the block
    uv run tools/palette.py "#7c3aed" --text "#ffffff" --accent "#22d3ee"

Paste the output over the spec's [palette]. The six bg_* colours drive the backdrop shader:
bg_white (light core) -> bg_cyan (ring) -> bg_peri (body of the lit sheet) on the lit side,
bg_deep (top) and bg_navy (very top), bg_glow (the band along the edge)."""
import argparse
import numpy as np

def srgb_to_lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * c ** (1 / 2.4) - 0.055)

M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])

def to_oklab(rgb):
    lms = M1 @ srgb_to_lin(rgb)
    return M2 @ np.cbrt(lms)

def from_oklab(lab):
    lms = np.linalg.solve(M2, lab) ** 3
    return lin_to_srgb(np.linalg.solve(M1, lms))

def hx(s):
    s = s.lstrip("#"); return np.array([int(s[i:i + 2], 16) / 255 for i in (0, 2, 4)])

def out(c):
    c = np.clip(np.round(np.asarray(c) * 255), 0, 255).astype(int)
    return "#%02x%02x%02x" % tuple(c)

def lch(lab):
    L, a, b = lab; return L, np.hypot(a, b), np.arctan2(b, a)

def mk(L, C, h):
    lab = np.array([L, C * np.cos(h), C * np.sin(h)])
    # pull chroma in until it fits sRGB
    for _ in range(40):
        rgb = from_oklab(lab)
        if np.all(rgb >= -1e-4) and np.all(rgb <= 1 + 1e-4):
            break
        lab[1:] *= 0.94
    return from_oklab(lab)

ap = argparse.ArgumentParser()
ap.add_argument("brand")
ap.add_argument("--text", default="#ffffff")
ap.add_argument("--accent")
ap.add_argument("--hue-shift", type=float, default=-40, help="degrees the light ring shifts from the brand hue (the reference: blue body, cyan ring)")
a = ap.parse_args()
L0, C0, h0 = lch(to_oklab(hx(a.brand)))
hs = np.radians(a.hue_shift)
# lightness / chroma steps measured on the fitted blue palette
white = mk(0.90, 0.035, h0 + hs)
cyan = mk(0.72, max(C0, 0.14), h0 + hs)
peri = mk(0.58, max(C0, 0.18), h0 + hs * 0.3)
deep = mk(0.42, max(C0, 0.26), h0)
navy = mk(0.20, max(C0 * 0.6, 0.12), h0)
glow = mk(0.86, 0.06, h0 + hs * 0.5)
hl = mk(0.88, 0.05, h0 + hs * 0.3)
flash = mk(0.92, 0.08, h0 + hs)
frost = mk(0.93, 0.02, h0)
accent = hx(a.accent) if a.accent else mk(0.65, max(C0, 0.17), h0 + hs * 0.6)
print("[palette]")
for k, v in [("bg_white", white), ("bg_cyan", cyan), ("bg_peri", peri), ("bg_deep", deep), ("bg_navy", navy), ("bg_glow", glow)]:
    print(f'{k} = "{out(v)}"')
print(f'text = "{a.text}"')
print(f'highlight = "{out(hl)}"')
print(f'flash = "{out(flash)}"')
print(f'accent = "{out(accent)}"')
print(f'frost = "{out(frost)}"')
