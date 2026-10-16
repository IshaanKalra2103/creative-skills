#!/usr/bin/env python3
"""Screenshot every station of a 3D explainer at several viewport sizes, and report console errors + fps.

  uv run --no-project --with playwright python scripts/shoot.py <path/to/index.html> [--out DIR]
        [--sizes 1920x1080,1280x800,390x844] [--wait 7] [--query "extra=1&foo=bar"] [--stations 1,3]

Uses your installed Google Chrome (channel="chrome") in a PRIVATE headless instance with the Metal/ANGLE GPU path,
so it never touches a shared Playwright/MCP browser and needs no `playwright install`. Exit code 1 on console errors.
"""
import argparse, pathlib, sys, time
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("page")
ap.add_argument("--out", default=None)
ap.add_argument("--sizes", default="1920x1080,1280x800,390x844")
ap.add_argument("--wait", type=float, default=7.0, help="seconds to let the camera fly + station intro finish")
ap.add_argument("--query", default="", help="extra URL params, e.g. 'mode=hard'")
ap.add_argument("--stations", default="", help="comma list (1-based); default = all")
ap.add_argument("--dpr", type=float, default=1.0)
a = ap.parse_args()

page_path = pathlib.Path(a.page).resolve()
url = page_path.as_uri()
out = pathlib.Path(a.out or page_path.parent / "shots")
out.mkdir(parents=True, exist_ok=True)
ARGS = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl", "--hide-scrollbars"]
if sys.platform != "darwin":
    ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"]

errors, shots = [], []
with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True, args=ARGS)
    for size in a.sizes.split(","):
        w, h = map(int, size.lower().split("x"))
        ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=a.dpr)
        pg = ctx.new_page()
        pg.on("console", lambda m: errors.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errors.append(f"[pageerror] {e}"))
        pg.goto(url + ("?" + a.query if a.query else ""))
        pg.wait_for_function("window.__ready === true", timeout=60000)
        # dx engine exposes __dx.stations; older pages (e.g. the Next-Word Machine example) only have the filmstrip
        names = pg.evaluate("window.__dx ? window.__dx.stations : [...document.querySelectorAll('#film .frame span')].map(e => e.textContent)")
        which = [int(s) for s in a.stations.split(",")] if a.stations else list(range(1, len(names) + 1))
        for st in which:
            q = f"stage={st}" + ("&" + a.query if a.query else "")
            pg.goto(f"{url}?{q}")
            pg.wait_for_function("window.__ready === true", timeout=60000)
            time.sleep(a.wait)
            fps = pg.evaluate("""() => new Promise(res => { let n = 0; const t0 = performance.now();
                const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); })""")
            f = out / f"{w}x{h}-s{st:02d}.png"
            pg.screenshot(path=str(f))
            shots.append(f)
            print(f"{w}x{h} station {st:2d} {names[st-1]!r:34} fps~{fps:3d}  {f}")
        gl = pg.evaluate("""() => { const c = document.querySelector('#stage canvas'); const g = c && c.getContext('webgl2');
            const d = g && g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?'; }""")
        ctx.close()
    browser.close()
print("GPU:", gl)
print(f"{len(shots)} screenshots in {out}")
if errors:
    print("CONSOLE ERRORS/WARNINGS:"); [print("  " + e) for e in dict.fromkeys(errors)]
    sys.exit(1)
print("console errors: 0")
