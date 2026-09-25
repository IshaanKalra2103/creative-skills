# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright", "pillow"]
# ///
"""Screenshot a dither-diorama page at each step and tile them into one sheet.

  uv run scripts/shot.py <page.html> <out.png> [--steps 0,1,2,3] [--warm 8] [--speed 5] [--times 2.5,5,7]

Serves the page's folder over HTTP (ES modules won't load from file://), runs
the sim at --speed for --warm seconds, pins each step with ?step=, and prints
page errors plus the crowd stats so a stuck sim shows up as numbers.
Uses software WebGL, so it is slow; that is fine for stills.
"""
import argparse, asyncio, functools, http.server, json, pathlib, threading
from PIL import Image
from playwright.async_api import async_playwright


def serve(root: pathlib.Path) -> int:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
    handler.log_message = lambda *a: None
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]


async def main(a):
    page_path = pathlib.Path(a.page).resolve()
    # serve from the skill root when the page lives inside it, so ../assets/engine.js resolves
    root = page_path.parent.parent if (page_path.parent.parent / "assets" / "engine.js").exists() else page_path.parent
    port = serve(root)
    url = f"http://127.0.0.1:{port}/{page_path.relative_to(root).as_posix()}?speed={a.speed}&step=0"
    steps = [float(s) for s in a.steps.split(",")]
    times = [float(x) for x in a.times.split(",")] if a.times else []
    shots, errors = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = await b.new_page(viewport={"width": a.width, "height": a.height})
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        if times:                      # freeze the sim clock at each time (?t=) instead of stepping
            for tt in times:
                await pg.goto(url.replace("step=0", f"step={steps[0]:g}") + f"&t={tt}")
                await pg.wait_for_timeout(int(a.settle * 1000))
                out = pathlib.Path(a.out).with_name(f"{pathlib.Path(a.out).stem}_t{tt:g}.png")
                await pg.screenshot(path=str(out)); print(f"t={tt:g}"); shots.append(out)
            steps = []
        else:
            await pg.goto(url)
            await pg.wait_for_timeout(int(a.warm * 1000))
        for s in steps:
            await pg.evaluate(f"window.__diorama && __diorama.setStep({s})")
            await pg.wait_for_timeout(int(a.settle * 1000))
            out = pathlib.Path(a.out).with_name(f"{pathlib.Path(a.out).stem}_step{s:g}.png")
            await pg.screenshot(path=str(out))
            stats = await pg.evaluate("window.__diorama ? JSON.stringify({T: +__diorama.T.toFixed(1), ...__diorama.stats()}) : 'no __diorama'")
            print(f"step {s:g}: {stats}")
            shots.append(out)
        await b.close()
    ims = [Image.open(s) for s in shots]
    w, h = ims[0].size
    cols = 2 if len(ims) > 1 else 1
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (w * cols // 2, h * rows // 2), "white")
    for i, im in enumerate(ims):
        sheet.paste(im.resize((w // 2, h // 2)), ((i % cols) * w // 2, (i // cols) * h // 2))
    sheet.save(a.out)
    print("sheet:", a.out)
    for e in errors[:20]:
        print("PAGE ERROR:", e)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("page"); ap.add_argument("out")
    ap.add_argument("--steps", default="0,1,2,3")
    ap.add_argument("--times", default="", help="comma list of sim seconds to freeze at (?t=), shot at the first --steps value")
    ap.add_argument("--warm", type=float, default=8)
    ap.add_argument("--settle", type=float, default=4)
    ap.add_argument("--speed", type=float, default=5)
    ap.add_argument("--width", type=int, default=1400)
    ap.add_argument("--height", type=int, default=900)
    asyncio.run(main(ap.parse_args()))
