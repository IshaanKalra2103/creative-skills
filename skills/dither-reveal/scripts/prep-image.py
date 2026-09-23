# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "opencv-python-headless"]
# ///
"""Turn any image into the page's image.js: `window.DITHER_IMAGE = "data:image/...;base64,..."`.

A data URI keeps the page working from file:// (WebGL and getImageData refuse file:// images).

    uv run prep-image.py <in> <out.js> [--cutout auto|none] [--near 14] [--width 1400] [--pad 24]

--cutout auto  (default) keep the image's own alpha if it has one; otherwise, when the border is a
               plain colour, cut the subject out: background = pixels close to the border colour
               AND connected to the border (so white highlights inside the subject survive).
               Stray specks (scale bars, labels) are dropped unless they sit within --near px of
               the main subject (antennae, whiskers) or are big in their own right.
--cutout none  keep the full rectangle (paintings, prints, busy photos).
"""
import argparse
import base64
import sys

import cv2
import numpy as np


def cutout(img: np.ndarray, near: int) -> np.ndarray | None:
    h, w = img.shape[:2]
    b = max(4, min(h, w) // 100)
    border = np.concatenate([img[:b].reshape(-1, 3), img[-b:].reshape(-1, 3), img[:, :b].reshape(-1, 3), img[:, -b:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    if np.percentile(np.abs(border - bg).max(axis=1), 90) > 28:
        print("border is not a plain colour; keeping the full rectangle (pass --cutout none to silence)", file=sys.stderr)
        return None
    close = (np.abs(img.astype(np.int16) - bg.astype(np.int16)).max(axis=2) < 32).astype(np.uint8)
    # Only background that touches the border counts: flood from a 1px frame of 'close' pixels.
    frame = np.ones((h + 2, w + 2), np.uint8)
    frame[1:-1, 1:-1] = close
    _, lab = cv2.connectedComponents(frame, connectivity=4)
    bgmask = lab[1:-1, 1:-1] == lab[0, 0]
    fg = (~bgmask).astype(np.uint8)
    # Find the main subject on a de-speckled mask, but keep pixels from the raw one so thin parts
    # attached to it (antennae, whiskers, stems) survive.
    opened = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(opened, 8)
    if n <= 1:
        return None
    big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    main_area = st[big, cv2.CC_STAT_AREA]
    reach = cv2.dilate((lab == big).astype(np.uint8), np.ones((2 * near + 1, 2 * near + 1), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg, 8)
    keep = np.zeros_like(fg)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > 0.05 * main_area or reach[lab == i].any():
            keep[lab == i] = 1
    return cv2.GaussianBlur(keep.astype(np.float32), (3, 3), 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--cutout", choices=["auto", "none"], default="auto")
    ap.add_argument("--near", type=int, default=14)
    ap.add_argument("--width", type=int, default=1400)
    ap.add_argument("--pad", type=int, default=24)
    ap.add_argument("--var", default="DITHER_IMAGE")
    a = ap.parse_args()

    img = cv2.imread(a.src, cv2.IMREAD_UNCHANGED)
    if img is None:
        sys.exit(f"can't read {a.src}")
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    alpha = img[..., 3].astype(np.float32) / 255 if img.shape[2] == 4 else None
    rgb = img[..., :3]
    if alpha is None and a.cutout == "auto":
        alpha = cutout(rgb, a.near)
    if alpha is not None and a.cutout == "auto":
        ys, xs = np.where(alpha > 0.5)
        y0, y1 = max(ys.min() - a.pad, 0), min(ys.max() + a.pad + 1, rgb.shape[0])
        x0, x1 = max(xs.min() - a.pad, 0), min(xs.max() + a.pad + 1, rgb.shape[1])
        rgb, alpha = rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1]

    scale = min(1.0, a.width / rgb.shape[1], a.width / rgb.shape[0])
    size = (round(rgb.shape[1] * scale), round(rgb.shape[0] * scale))
    rgb = cv2.resize(rgb, size, interpolation=cv2.INTER_AREA)
    if alpha is not None:
        alpha = cv2.resize(alpha, size, interpolation=cv2.INTER_AREA)
        ok, buf = cv2.imencode(".webp", np.dstack([rgb, (alpha * 255).astype(np.uint8)]), [cv2.IMWRITE_WEBP_QUALITY, 90])
        mime = "image/webp"
    else:
        ok, buf = cv2.imencode(".jpg", rgb, [cv2.IMWRITE_JPEG_QUALITY, 90])
        mime = "image/jpeg"
    with open(a.out, "w") as f:
        f.write(f'window.{a.var} = "data:{mime};base64,{base64.b64encode(buf.tobytes()).decode()}";\n')
    kind = "cut out (alpha)" if alpha is not None else "full rectangle"
    print(f"{a.out}: {size[0]}x{size[1]} {kind}, {len(buf) // 1024} KB")


if __name__ == "__main__":
    main()
