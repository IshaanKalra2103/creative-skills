# /// script
# dependencies = ["playwright==1.64.0"]
# ///
"""Render an HTML mock-up (an app window, a site, a card thumbnail) to PNG for the film.

    uv run tools/screens/render.py page.html out.png                     # the whole page, 2x
    uv run tools/screens/render.py page.html out.png --size 1440x900 --scale 2 --select "#win"
    uv run tools/screens/render.py page.html out_{layer}.png --select "#win" --layers base,side,hero,all
    uv run tools/screens/render.py site.html site.png --size 1200x800 --full   # tall page for `screen` scrolling
    uv run tools/screens/render.py site.html move.png --query part=move --transparent

Layers: elements with `data-layer="name"` are shown one name at a time (plus "all"), each
saved with a transparent background, which is what the `window` scene's `layers` stack
expects. The page is served over http from its own folder so relative images and fonts load;
the page can set `document.body.dataset.ready = '1'` when it has finished drawing.
Chromium: Playwright's own build; set CHROMIUM=/path/to/chrome to use another one."""
import argparse, functools, glob, http.server, os, socketserver, threading
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("html")
ap.add_argument("out")
ap.add_argument("--size", default="1440x900")
ap.add_argument("--scale", type=float, default=2.0)
ap.add_argument("--select", help="CSS selector of the element to capture (default: the page)")
ap.add_argument("--layers", help="comma list of data-layer names to render one by one (use {layer} in out)")
ap.add_argument("--full", action="store_true", help="capture the full scroll height")
ap.add_argument("--transparent", action="store_true")
ap.add_argument("--query", default="", help="query string for the page, e.g. part=move")
a = ap.parse_args()
w, h = (int(x) for x in a.size.split("x"))
page_dir = os.path.dirname(os.path.abspath(a.html))
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=page_dir)
handler.log_message = lambda *x, **k: None
srv = socketserver.TCPServer(("127.0.0.1", 0), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_address[1]}/{os.path.basename(a.html)}" + (f"?{a.query}" if a.query else "")

def chromium():
    if os.environ.get("CHROMIUM"):
        return os.environ["CHROMIUM"]
    found = sorted(glob.glob(os.path.expanduser("~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell")))
    found += sorted(glob.glob(os.path.expanduser("~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell")))
    return found[-1] if found else None

with sync_playwright() as p:
    exe = chromium()
    b = p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()
    pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=a.scale)
    pg.goto(url)
    try:
        pg.wait_for_function("document.body.dataset.ready == '1'", timeout=3000)
    except Exception:
        pass
    pg.evaluate("document.fonts.ready")
    pg.wait_for_timeout(300)
    names = a.layers.split(",") if a.layers else [None]
    for L in names:
        if L:
            pg.evaluate("(L) => document.querySelectorAll('[data-layer]').forEach(e => e.style.visibility = (L == 'all' || e.dataset.layer == L) ? '' : 'hidden')", L)
        out = a.out.replace("{layer}", L) if L else a.out
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        opts = dict(path=out, omit_background=a.transparent or bool(L))
        if a.select:
            pg.locator(a.select).screenshot(**opts)
        else:
            pg.screenshot(full_page=a.full, **opts)
        print("wrote", out)
    b.close()
srv.shutdown()
