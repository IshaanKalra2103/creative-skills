# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow", "playwright"]
# ///
"""Open a rebuilt page in Chrome, compare every frame with the video, optionally write a GIF.

    uv run check.py <out-dir> [--gif out.gif] [--gif-scale 3]

Needs <out-dir>/.check/native.npy from extract.py. Uses the installed Google Chrome
(channel="chrome"), falling back to Playwright's Chromium. Exits 1 on page errors or
when frames are clearly off.
"""
import argparse
import base64
import io
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright


def to_gif_frame(im):
    """Exact colours when a frame has <= 256. Otherwise merge the closest pair of
    colours (rarer into commoner) until 256 remain: near-duplicate compression shades
    go first, and rare but distinct colours survive."""
    a = np.asarray(im, np.int32)
    packed = (a[..., 0] << 16) | (a[..., 1] << 8) | a[..., 2]
    cols, inv, cnt = np.unique(packed.ravel(), return_inverse=True, return_counts=True)
    rgb = np.stack([cols >> 16, (cols >> 8) & 255, cols & 255], 1)
    slot = np.arange(len(cols))                     # which colour each one is drawn as
    alive = list(range(len(cols)))
    while len(alive) > 256:
        sub = rgb[alive]
        d = np.abs(sub[:, None] - sub[None]).sum(-1).astype(float)
        np.fill_diagonal(d, np.inf)
        i, j = np.unravel_index(d.argmin(), d.shape)
        lose, win = (alive[i], alive[j]) if cnt[alive[i]] < cnt[alive[j]] else (alive[j], alive[i])
        slot[slot == lose] = win
        cnt[win] += cnt[lose]
        alive.remove(lose)
    index = {c: k for k, c in enumerate(alive)}
    p = Image.fromarray(np.array([index[s] for s in slot])[inv].reshape(a.shape[:2]).astype(np.uint8), "P")
    p.putpalette(rgb[alive].astype(np.uint8).ravel().tolist())
    return p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir", type=Path)
    ap.add_argument("--gif", type=Path, help="also write the loop as a GIF")
    ap.add_argument("--gif-scale", type=int, default=3, help="GIF pixels per art pixel")
    args = ap.parse_args()

    d = args.dir.resolve()
    data = json.loads(re.search(r"window\.PIXEL = (\{.*\});", (d / "data.js").read_text(encoding="utf-8")).group(1))
    native = np.load(d / ".check" / "native.npy").astype(np.float32)
    url = (d / "index.html").as_uri()

    shots, errors = [], []
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="chrome")
        except Exception:
            browser = p.chromium.launch()
        page = browser.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(url + "?f=0")
        page.wait_for_function("window.pixel")
        n = page.evaluate("pixel.frames")
        for f in range(n):
            page.evaluate(f"pixel.seek({f})")
            uri = page.evaluate("document.getElementById('c').toDataURL('image/png')")
            shots.append(Image.open(io.BytesIO(base64.b64decode(uri.split(",", 1)[1]))).convert("RGB"))
        # real-time playback: frames advanced vs what durs says should have
        page.goto(url)
        page.wait_for_function("window.pixel")
        page.wait_for_timeout(2000)
        got = page.evaluate("pixel.frame")
        browser.close()

    strong = []
    for f, im in enumerate(shots):
        e = np.abs(np.asarray(im, np.float32) - native[f]).sum(-1)
        strong.append(int((e > 120).sum()))
    cum = np.cumsum(data["durs"])
    want = int(np.searchsorted(cum, 2000 % cum[-1], side="right"))
    print(f"{n} frames, {data['w']}x{data['h']}; clearly wrong px per frame: mean {np.mean(strong):.2f} "
          f"max {max(strong)} (frame {int(np.argmax(strong))})")
    print(f"playback: frame {got} after 2 s (expected ~{want})")
    print("page errors:", errors or "none")

    if args.gif:
        s = args.gif_scale
        frames = [to_gif_frame(im).resize((im.width * s, im.height * s), Image.NEAREST) for im in shots]
        frames[0].save(args.gif, save_all=True, append_images=frames[1:], duration=data["durs"],
                       loop=0, disposal=1, optimize=False)
        g = Image.open(args.gif)
        worst = 0
        for f in range(g.n_frames):
            g.seek(f)
            a = np.asarray(g.convert("RGB").resize((data["w"], data["h"]), Image.NEAREST), np.float32)
            worst = max(worst, int(np.abs(a - np.asarray(shots[f], np.float32)).sum(-1).max()))
        print(f"gif: {args.gif} ({args.gif.stat().st_size / 1e6:.1f} MB, {g.n_frames} frames, "
              f"largest colour shift from the 256-colour limit: {worst})")

    drift = min(abs(got - want), n - abs(got - want))
    ok = not errors and np.mean(strong) <= 5 and drift <= max(3, n // 20)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
