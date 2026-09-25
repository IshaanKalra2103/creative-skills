# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright>=1.45", "pillow>=10"]
# ///
"""Contact sheet + error check for an isometric-svg page.

Freezes the page's clock at a series of times (via a JS hook, default `freeze({t})`),
screenshots an element at each, and tiles them into one PNG with the time stamped on
each cell. Page errors and console errors fail the run. Optionally evaluates a JS
expression (e.g. a scripted collision check) and prints the result as JSON.

Uses the Chrome you already have installed (channel="chrome"), so there is no
browser download. Run with uv:

  uv run scripts/shoot.py page.html --times 0:4.8:0.3 --out /tmp/sheet.png
  uv run scripts/shoot.py page.html --times 0,1.9,2.6 --selector '#pit svg' --cols 3
  uv run scripts/shoot.py page.html --check 'JSON.stringify(myChecks())' --times none
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright


def parse_times(spec: str) -> list[float]:
    if spec in ("", "none"):
        return []
    if ":" in spec:
        a, b, step = (float(x) for x in spec.split(":"))
        out, t = [], a
        while t <= b + 1e-9:
            out.append(round(t, 4))
            t += step
        return out
    return [float(x) for x in spec.split(",")]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("page", help="path to an .html file or a URL")
    ap.add_argument("--times", default="0:4:0.5", help="a:b:step, comma list, or none")
    ap.add_argument("--js", default="freeze({t})", help="JS run per frame; {t} is replaced")
    ap.add_argument("--selector", default="svg", help="element to screenshot")
    ap.add_argument("--width", type=int, default=1440)
    ap.add_argument("--height", type=int, default=900)
    ap.add_argument("--settle", type=int, default=60, help="ms to wait after each freeze")
    ap.add_argument("--cols", type=int, default=5)
    ap.add_argument("--cell", type=int, default=480, help="cell width in the sheet")
    ap.add_argument("--check", default="", help="JS expression evaluated once; result printed")
    ap.add_argument("--out", default="/tmp/iso-sheet.png")
    a = ap.parse_args()

    url = a.page if "://" in a.page else Path(a.page).resolve().as_uri()
    errors: list[str] = []
    shots: list[tuple[float, Image.Image]] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": a.width, "height": a.height})
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}")
                if m.type == "error" and "favicon" not in m.text else None)
        page.goto(url)
        page.wait_for_timeout(400)
        if a.check:
            print(json.dumps(page.evaluate(a.check), indent=2) if not a.check.startswith("JSON.")
                  else page.evaluate(a.check))
        tmp = Path(a.out).with_suffix("")
        for i, t in enumerate(parse_times(a.times)):
            page.evaluate(a.js.replace("{t}", repr(t)))
            page.wait_for_timeout(a.settle)
            f = f"{tmp}_{i:03d}.png"
            page.locator(a.selector).first.screenshot(path=f)
            shots.append((t, Image.open(f).convert("RGB")))
            Path(f).unlink()
        browser.close()

    if shots:
        w0, h0 = shots[0][1].size
        cw, ch = a.cell, round(a.cell * h0 / w0)
        rows = (len(shots) + a.cols - 1) // a.cols
        sheet = Image.new("RGB", (cw * min(a.cols, len(shots)), ch * rows), (0, 0, 0))
        draw = ImageDraw.Draw(sheet)
        for i, (t, im) in enumerate(shots):
            x, y = (i % a.cols) * cw, (i // a.cols) * ch
            sheet.paste(im.resize((cw, ch)), (x, y))
            draw.rectangle([x, y, x + 58, y + 16], fill=(0, 0, 0))
            draw.text((x + 4, y + 3), f"t={t:.2f}", fill=(255, 255, 255))
        sheet.save(a.out)
        print(f"sheet: {a.out}  ({len(shots)} frames)")

    for e in errors:
        print(e, file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
