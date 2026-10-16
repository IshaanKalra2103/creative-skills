"""Build assets/editors_desk.png: the editing-desk photo as a clean panorama plate.

The reference pans across the photo (content shifts 284 px over ticks 228-233), so the
plate is stitched from two reference frames: tick 233 (f10/234.png) for plate x 0..720,
tick 228 (f10/229.png, shifted by its measured offset) for x 720..1004 and for the area
under the "Editors" caption. Then the reference's baked-in scanlines and halftone screen are
removed with an FFT notch (`descreen`), so our own look layer doesn't double them.

usage: uv run --with pillow --with numpy --with scipy python tools/editors_plate.py
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "..", "reference", "f10")
OUT = os.path.join(HERE, "..", "assets", "editors_desk.png")

# measured with ORB + estimateAffinePartial2D: tick 228 shows plate x at x - 283.7, y - 2.2
DX, DY = 283.7, 2.2
PW = 1004


def load(n):
    return np.asarray(Image.open(os.path.join(REF, f"{n:03d}.png")).convert("RGB")).astype(np.float64)


def shift(img, dx, dy):
    """Sample img at (x - dx, y - dy) with bilinear interpolation, on a PW-wide canvas."""
    h = img.shape[0]
    ys, xs = np.mgrid[0:h, 0:PW].astype(np.float64)
    out = np.zeros((h, PW, 3))
    for c in range(3):
        out[..., c] = ndimage.map_coordinates(img[..., c], [ys - dy, xs - dx], order=1, mode="nearest")
    return out


def descreen(img, keep_r=0.07, thresh=0.6, grow=4, soften=1.4):
    """Notch out periodic texture (scanlines, halftone) per channel: bins whose log magnitude
    stands well above the local spectral background and lie away from DC are replaced by the
    background level (phase kept)."""
    out = np.empty_like(img)
    h, w = img.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    far = np.hypot(fx, fy) > keep_r
    for c in range(3):
        F = np.fft.fft2(img[..., c])
        mag = np.abs(F)
        lm = np.log(mag + 1e-6)
        bg = ndimage.median_filter(lm, size=15, mode="wrap")
        peaks = ((lm - bg) > thresh) & far
        peaks = ndimage.binary_dilation(peaks, iterations=grow) & far
        scale = np.where(peaks, np.exp(bg) / (mag + 1e-6), 1.0)
        out[..., c] = np.real(np.fft.ifft2(F * np.minimum(scale, 1.0)))
    # what the notch leaves (harmonics spread by the image) goes with a light blur; an
    # unsharp mask at a coarser radius brings the edges back
    soft = ndimage.gaussian_filter(out, (soften, soften, 0))
    wide = ndimage.gaussian_filter(soft, (3.0, 3.0, 0))
    out = soft + 0.6 * (soft - wide)
    return np.clip(out, 0, 255)


def main():
    a = load(234)  # tick 233: the settled frame, caption "Editors" over the mic
    b = load(229)  # tick 228: panned, caption area of `a` is clean here
    base = shift(a, 0.0, 0.0)
    pan = shift(b, DX, DY)
    # x > 720 only exists in the panned frame
    xs = np.arange(PW)[None, :, None]
    w_right = np.clip((xs - 712) / 8.0, 0, 1)
    plate = base * (1 - w_right) + pan * w_right
    # caption box in `a` (measured 309-411 x 626-658), feathered
    m = np.zeros(plate.shape[:2])
    m[618:668, 298:424] = 1.0
    m = ndimage.gaussian_filter(m, 4)[..., None]
    plate = plate * (1 - m) + pan * m
    plate = descreen(plate)
    Image.fromarray(plate.astype(np.uint8)).save(OUT)
    print(OUT, plate.shape)


if __name__ == "__main__":
    main()
