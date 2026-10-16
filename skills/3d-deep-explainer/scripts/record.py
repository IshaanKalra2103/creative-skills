#!/usr/bin/env python3
"""Record the guided Tour of a 3D explainer to an mp4, frame-stepped (deterministic, no dropped frames).

  uv run --no-project --with playwright python scripts/record.py <path/to/index.html> <out.mp4>
        [--fps 30] [--size 1920x1080] [--crf 23] [--seconds N] [--frames 0,90,300 --dir stills/]

How: opens the page with ?record&fps=F. The engine then stops its own clock and exposes window.__frame(i), which
advances the tour by exactly 1/F s per frame and renders. We screenshot the whole page (so the HTML overlay is in
the video) and pipe JPEGs into ffmpeg (libx264, yuv420p, +faststart). --frames grabs individual stills instead.
"""
import argparse, math, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("page"); ap.add_argument("out", nargs="?", default="tour.mp4")
ap.add_argument("--fps", type=int, default=30)
ap.add_argument("--size", default="1920x1080")
ap.add_argument("--crf", type=int, default=23, help="higher = smaller file; 23-24 keeps ~75 s at 1080p under ~30 MB")
ap.add_argument("--seconds", type=float, default=0, help="cap the length (0 = whole tour)")
ap.add_argument("--frames", default="", help="comma list of frame indices to save as stills instead of a video")
ap.add_argument("--dir", default="stills")
a = ap.parse_args()
w, h = map(int, a.size.split("x"))
pathlib.Path(a.out).resolve().parent.mkdir(parents=True, exist_ok=True)
url = pathlib.Path(a.page).resolve().as_uri() + f"?record&fps={a.fps}"
ARGS = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars"] if sys.platform == "darwin" \
    else ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"]
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True, args=ARGS)
    pg = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
    pg.on("console", lambda m: errors.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errors.append(f"[pageerror] {e}"))
    pg.goto(url)
    pg.wait_for_function("window.__ready === true && typeof window.__frame === 'function'", timeout=60000)
    time.sleep(0.8)
    length = pg.evaluate("window.__tourLength")
    total = math.ceil((min(length, a.seconds) if a.seconds else length) * a.fps)
    print(f"tour {length:.1f} s -> {total} frames @ {a.fps} fps ({w}x{h})")
    t0 = time.time()
    if a.frames:
        d = pathlib.Path(a.dir); d.mkdir(parents=True, exist_ok=True)
        for i in sorted(int(x) for x in a.frames.split(",")):
            info = pg.evaluate("i => window.__frame(i)", i)
            pg.screenshot(path=str(d / f"f{i:05d}.jpg"), type="jpeg", quality=90)
            print("frame", i, info)
    else:
        ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(a.fps), "-c:v", "mjpeg", "-i", "-",
                               "-c:v", "libx264", "-preset", "slow", "-crf", str(a.crf), "-pix_fmt", "yuv420p", "-profile:v", "high",
                               "-movflags", "+faststart", a.out], stdin=subprocess.PIPE)
        for i in range(total):
            pg.evaluate("i => window.__frame(i)", i)
            try:
                ff.stdin.write(pg.screenshot(type="jpeg", quality=93))
            except BrokenPipeError:
                sys.exit("ffmpeg exited early (bad output path or codec?) - run the ffmpeg command by hand to see why")
            if i % 150 == 0:
                print(f"frame {i}/{total}  {time.time() - t0:.0f} s", flush=True)
        ff.stdin.close(); ff.wait()
        size = pathlib.Path(a.out).stat().st_size / 1e6
        print(f"wrote {a.out}  {total / a.fps:.1f} s  {size:.1f} MB  in {time.time() - t0:.0f} s")
    browser.close()
if errors:
    print("CONSOLE ERRORS/WARNINGS:"); [print("  " + e) for e in dict.fromkeys(errors)]
    sys.exit(1)
print("console errors: 0")
