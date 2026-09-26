# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright>=1.45"]
# ///
"""Render a replica page to MP4 frame by frame — deterministic, never drops a frame.

The page must define  window.renderAt(t)  (draw the frame at t seconds) and set
window.__ready = true  once fonts and assets are loaded. It should scale its stage to
fit the viewport (the template does). Optional: window.DURATION (seconds).

    uv run render.py page.html --probe                     # is WebGL on the real GPU?
    uv run render.py page.html --stills 0.5,1.8,3.4        # PNG stills → stills/ beside the page
    uv run render.py page.html --audio ref.mp4             # 1920x1080 @ 60 fps → out.mp4
    uv run render.py page.html --width 3840 --height 2160 --audio ref.mp4 --out out-4k.mp4

Playwright's Chromium is needed once:  uvx playwright install chromium
"""
import argparse
import pathlib
import subprocess
import sys

from playwright.sync_api import sync_playwright

# Headless Chromium falls back to SwiftShader (software GL): WebGL layers render slowly
# and some materials (transmission, big shadow maps) look wrong or time out.
GPU_ARGS = ["--enable-gpu", "--ignore-gpu-blocklist"] + (["--use-angle=metal"] if sys.platform == "darwin" else [])
PROBE_JS = """() => { const gl = document.createElement('canvas').getContext('webgl2'); if (!gl) return 'no webgl2';
  const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); }"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("page")
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--height", type=int, default=1080)
    ap.add_argument("--fps", type=int, default=60)
    ap.add_argument("--seconds", type=float, help="default: window.DURATION, else 10")
    ap.add_argument("--audio", default="", help="file whose audio track to mux in (e.g. the reference)")
    ap.add_argument("--out", default="out.mp4")
    ap.add_argument("--stills", default="", help="comma-separated times; writes stills/ beside the page")
    ap.add_argument("--crf", type=int, default=15)
    ap.add_argument("--probe", action="store_true", help="print the WebGL renderer and exit")
    a = ap.parse_args()

    page_path = pathlib.Path(a.page).resolve()
    dsf = 2 if a.width > 2560 else 1  # 4K = a 1920x1080 viewport at device scale 2
    with sync_playwright() as p:
        browser = p.chromium.launch(args=GPU_ARGS)
        page = browser.new_page(viewport={"width": a.width // dsf, "height": a.height // dsf}, device_scale_factor=dsf)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: m.type == "error" and errors.append(m.text))
        if a.probe:
            page.goto("about:blank")
            gl = page.evaluate(PROBE_JS)
            print("WebGL renderer:", gl)
            if "SwiftShader" in gl:
                print("warning: software GL — WebGL layers will be slow; check GPU_ARGS for this platform")
            browser.close(); return

        page.goto(page_path.as_uri() + "?export=1")
        try:
            page.wait_for_function("window.__ready === true", timeout=120_000)
        except Exception:
            print("page never set window.__ready — errors:", *errors[:10], sep="\n  "); raise
        for e in errors[:10]:
            print("page error:", e)

        if a.stills:
            out = page_path.parent / "stills"; out.mkdir(exist_ok=True)
            for t in (float(x) for x in a.stills.split(",")):
                page.evaluate("t => renderAt(t)", t)
                page.screenshot(path=str(out / f"t{t:05.2f}.png"))
                print("still", out / f"t{t:05.2f}.png")
            browser.close(); return

        seconds = a.seconds or page.evaluate("window.DURATION || 10")
        n = round(seconds * a.fps)
        cmd = ["ffmpeg", "-y", "-v", "error", "-f", "image2pipe", "-framerate", str(a.fps), "-i", "-"]
        if a.audio and pathlib.Path(a.audio).exists():
            cmd += ["-i", a.audio, "-map", "0:v", "-map", "1:a?", "-c:a", "copy", "-shortest"]
        cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", str(a.crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", a.out]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        for i in range(n):
            page.evaluate("t => renderAt(t)", i / a.fps)
            ff.stdin.write(page.screenshot(type="png") if dsf == 1 else page.screenshot(type="jpeg", quality=94))
            if i % a.fps == 0:
                print(f"frame {i}/{n}", flush=True)
        ff.stdin.close(); ff.wait()
        browser.close()
    print("wrote", a.out)


if __name__ == "__main__":
    main()
