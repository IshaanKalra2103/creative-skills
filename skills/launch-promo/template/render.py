# /// script
# dependencies = ["playwright", "pillow", "numpy"]
# ///
"""Render the film (index.html; seek(t) is pure) with headless Chromium. Size, fps and length come from window.FILM.

uv run render.py at 1.5 3.2 ...            stills -> build/at/t<T>.png
uv run render.py sheet A B [fps] [cols]    labelled contact sheet of [A, B] -> build/sheet_A_B.png
uv run render.py cues                      SFX cue list + film settings -> build/sfx_cues.json, build/film.json (audio.py reads both)
uv run render.py full [--workers 8] [--sub 4] [--a 0 --b DUR]   motion-blurred frames -> build/video.mp4 (big, near-lossless)
uv run render.py mux                       build/video.mp4 + build/mix.wav -> build/final.mp4 (x264 crf 20, -14 LUFS)
Add --hud to draw the corner HUD.
"""
import argparse, base64, functools, http.server, io, json, multiprocessing as mp, os, pathlib, socketserver, subprocess, sys, threading

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
B = HERE / "build"


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a, **k): pass
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(HERE)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, srv.server_address[1]


class Page:
    def __init__(self, port, hud=False):
        from playwright.sync_api import sync_playwright
        self.pw = sync_playwright().start()
        self.b = self.pw.chromium.launch(args=["--disable-gpu-vsync", "--force-color-profile=srgb", "--font-render-hinting=none"])
        self.p = self.b.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        self.p.on("console", lambda m: m.type in ("error", "warning") and print("[page]", m.text, file=sys.stderr))
        self.p.on("pageerror", lambda e: print("[pageerror]", e, file=sys.stderr))
        self.p.goto(f"http://127.0.0.1:{port}/index.html?render=1{'&hud=1' if hud else ''}")
        self.p.wait_for_function("window.READY === true", timeout=60000)
        self.film = self.p.evaluate("window.FILM")
        self.W, self.H, self.FPS, self.DUR = self.film["w"], self.film["h"], self.film["fps"], self.film["dur"]
        if (self.W, self.H) != (1920, 1080):
            self.p.set_viewport_size({"width": self.W, "height": self.H})
        self.cdp = self.p.context.new_cdp_session(self.p)

    def shot(self, t, frame, fmt="png"):
        self.p.evaluate("([t, f]) => seek(t, f)", [t, frame])
        opts = {"format": fmt, "optimizeForSpeed": True}
        if fmt == "jpeg": opts["quality"] = 96
        return base64.b64decode(self.cdp.send("Page.captureScreenshot", opts)["data"])

    def close(self):
        self.b.close(); self.pw.stop()


def cmd_at(ts, hud):
    srv, port = serve(); pg = Page(port, hud)
    (B / "at").mkdir(parents=True, exist_ok=True)
    for t in ts:
        p = B / "at" / f"t{t:.2f}.png"; p.write_bytes(pg.shot(t, round(t * pg.FPS))); print(p)
    pg.close(); srv.shutdown()


def cmd_sheet(a, b, fps, cols, hud, width=480):
    srv, port = serve(); pg = Page(port, hud)
    n = int(round((b - a) * fps)) + 1
    font = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 18) if pathlib.Path("/System/Library/Fonts/Menlo.ttc").exists() else ImageFont.load_default()
    ims = []
    for i in range(n):
        t = a + i / fps
        im = Image.open(io.BytesIO(pg.shot(t, round(t * pg.FPS), "jpeg"))).convert("RGB").resize((width, width * pg.H // pg.W), Image.LANCZOS)
        d = ImageDraw.Draw(im); d.rectangle([0, 0, 84, 24], fill=(255, 255, 255)); d.text((4, 2), f"{t:6.2f}", fill=(220, 0, 0), font=font)
        ims.append(im)
    pg.close(); srv.shutdown()
    rows = (len(ims) + cols - 1) // cols; fw, fh = ims[0].size
    S = Image.new("RGB", (cols * fw + (cols - 1) * 4, rows * fh + (rows - 1) * 4), (255, 0, 255))
    for i, im in enumerate(ims): S.paste(im, ((i % cols) * (fw + 4), (i // cols) * (fh + 4)))
    out = B / f"sheet_{a:.2f}_{b:.2f}.png"; S.save(out); print(out)


def worker(args):
    wid, f0, f1, sub, port, hud, seg = args
    pg = Page(port, hud)
    W, H, FPS, DUR = pg.W, pg.H, pg.FPS, pg.DUR
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "13", "-pix_fmt", "yuv420p", str(seg)], stdin=subprocess.PIPE)
    dec = lambda b: np.asarray(Image.open(io.BytesIO(b)).convert("RGB"), dtype=np.float32)
    for f in range(f0, f1):
        t = f / FPS
        if sub <= 1:
            ff.stdin.write(dec(pg.shot(t, f)).astype(np.uint8).tobytes()); continue
        # 180-degree shutter: sub-frames spread over [t - 1/4 frame, t + 1/4 frame]; still frames cost 2 shots, not `sub`
        offs = [(-0.25 + 0.5 * (i + 0.5) / sub) / FPS for i in range(sub)]
        first = pg.shot(max(0, t + offs[0]), f); last = pg.shot(min(DUR, t + offs[-1]), f)
        if first == last:
            acc = dec(first)
        else:
            acc = dec(first) + dec(last)
            for o in offs[1:-1]: acc += dec(pg.shot(t + o, f))
            acc /= sub
        ff.stdin.write(np.clip(acc + 0.5, 0, 255).astype(np.uint8).tobytes())
        if (f - f0) % 120 == 0: print(f"[w{wid}] {f - f0}/{f1 - f0}", file=sys.stderr, flush=True)
    ff.stdin.close(); ff.wait(); pg.close()
    return str(seg)


def cmd_full(a, b, workers, sub, hud):
    srv, port = serve()
    probe = Page(port, hud); FPS, DUR = probe.FPS, probe.DUR; probe.close()
    b = DUR if b is None else b
    f0, f1 = int(round(a * FPS)), int(round(b * FPS))
    step = (f1 - f0 + workers - 1) // workers
    jobs = [(i, f0 + i * step, min(f1, f0 + (i + 1) * step), sub, port, hud, B / f"seg_{i:02d}.mp4") for i in range(workers) if f0 + i * step < f1]
    with mp.get_context("spawn").Pool(len(jobs)) as pool:
        segs = pool.map(worker, jobs)
    srv.shutdown()
    lst = B / "segs.txt"; lst.write_text("".join(f"file '{s}'\n" for s in segs))
    out = B / "video.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(out)], check=True)
    for s in segs: os.unlink(s)
    print(out)


def cmd_cues():
    srv, port = serve(); pg = Page(port)
    cues = pg.p.evaluate("window.SFX"); scenes = pg.p.evaluate("window.SCENES")
    (B / "sfx_cues.json").write_text(json.dumps(cues, indent=0))
    (B / "film.json").write_text(json.dumps({**pg.film, "scenes": scenes}, indent=1))
    print(len(cues), "cues;", json.dumps(scenes))
    pg.close(); srv.shutdown()


def cmd_mux(crf=20):
    out = B / "final.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(B / "video.mp4"), "-i", str(B / "mix.wav"), "-c:v", "libx264", "-preset", "slow",
                    "-crf", str(crf), "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-af", "loudnorm=I=-14:TP=-1.0:LRA=11",
                    "-ar", "48000", "-shortest", "-movflags", "+faststart", str(out)], check=True)
    print(out, f"{out.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("cmd"); ap.add_argument("rest", nargs="*")
    ap.add_argument("--workers", type=int, default=min(8, os.cpu_count() or 4)); ap.add_argument("--sub", type=int, default=4)
    ap.add_argument("--a", type=float, default=0); ap.add_argument("--b", type=float, default=None); ap.add_argument("--hud", action="store_true")
    ap.add_argument("--crf", type=int, default=20)
    o = ap.parse_args(); B.mkdir(exist_ok=True)
    if o.cmd == "at": cmd_at([float(x) for x in o.rest], o.hud)
    elif o.cmd == "sheet":
        r = [float(x) for x in o.rest]; cmd_sheet(r[0], r[1], r[2] if len(r) > 2 else 10, int(r[3]) if len(r) > 3 else 6, o.hud)
    elif o.cmd == "full": cmd_full(o.a, o.b, o.workers, o.sub, o.hud)
    elif o.cmd == "cues": cmd_cues()
    elif o.cmd == "mux": cmd_mux(o.crf)
    else: sys.exit(__doc__)
