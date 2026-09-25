# /// script
# dependencies = ["pillow", "numpy"]
# ///
"""Public-domain images for stamps: search Wikimedia Commons, fetch, and print-treat.

Everything is driven by <page>/recipes.json:
  { "sources": { "pearl": "File:1665 Girl with a Pearl Earring.jpg", ... },
    "recipes": { "pearl_bw": {"src": "pearl", "crop": [l,t,r,b], "mode": "bw", "contrast": 1.35}, ... } }

    uv run images.py search "vermeer astronomer"          # candidate File: titles with sizes
    uv run images.py fetch  <page>                        # download missing sources → <page>/assets/raw/<key>.jpg
    uv run images.py prep   <page> [key ...]              # build <page>/assets/<key>.jpg from recipes
    uv run images.py sheet  <page>                        # contact sheet of assets/*.jpg → <page>/shots/assets.png

Modes: color (grain + slight contrast), bw (autocontrast, crush, midtone grain), ink (inverted bw: dark
plate on light, for multiply onto paper). Tinting is NOT done here — do duotones in CSS with blend modes.
Options per recipe: crop, contrast, gamma, grain, sat, size (long side, default 1200).
Commons rate-limits hard (HTTP 429 after ~12 quick calls): requests are spaced 4 s and back off on 429.
"""
import io, json, sys, time, urllib.parse, urllib.request
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

UA = "postage-collage/1.0 (personal design tool)"
API = "https://commons.wikimedia.org/w/api.php?"

def get(url, tries=5):
    for k in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == tries - 1: raise
            wait = 30 * (k + 1); print(f"  429 — waiting {wait}s", file=sys.stderr); time.sleep(wait)

def api(**p):
    return json.loads(get(API + urllib.parse.urlencode(p | {"format": "json"})))

def search(q):
    r = api(action="query", generator="search", gsrsearch=q + " filetype:bitmap", gsrnamespace=6, gsrlimit=10, prop="imageinfo", iiprop="size")
    for pg in sorted(r.get("query", {}).get("pages", {}).values(), key=lambda p: p["index"]):
        ii = pg["imageinfo"][0]; print(f'{ii["width"]:>6}x{ii["height"]:<6} {pg["title"]}')

def fetch(page: Path):
    cfg = json.loads((page / "recipes.json").read_text()); raw = page / "assets/raw"; raw.mkdir(parents=True, exist_ok=True)
    for key, title in cfg.get("sources", {}).items():
        out = raw / f"{key}.jpg"
        if out.exists(): continue
        if title.startswith("http"): url = title
        else:
            r = api(action="query", titles=title, prop="imageinfo", iiprop="url", iiurlwidth=1800)
            ii = next(iter(r["query"]["pages"].values()))["imageinfo"][0]; url = ii.get("thumburl") or ii["url"]
        out.write_bytes(get(url)); print(f"{key:14s} ← {title}"); time.sleep(4)

def grain(a, amt, seed=7):
    rng = np.random.default_rng(seed); mid = 4 * a * (1 - a)
    return np.clip(a + rng.normal(0, amt / 255, a.shape) * (.45 + mid), 0, 1)

def build(page: Path, key: str, r: dict):
    im = ImageOps.exif_transpose(Image.open(page / "assets/raw" / f"{r['src']}.jpg"))
    l, t, rr, b = r.get("crop", [0, 0, 1, 1]); w, h = im.size
    im = im.crop((int(l * w), int(t * h), int(rr * w), int(b * h))); im.thumbnail((r.get("size", 1200),) * 2, Image.LANCZOS)
    mode = r.get("mode", "color")
    if mode == "color":
        im = ImageEnhance.Color(im.convert("RGB")).enhance(r.get("sat", 1.0))
        a = np.clip((np.asarray(im, np.float32) / 255 - .5) * r.get("contrast", 1.08) + .5, 0, 1)
        a = grain(a, r.get("grain", 12))
    else:
        g = ImageOps.autocontrast(im.convert("L"), cutoff=1)
        if mode == "ink": g = ImageOps.invert(g)
        a = np.clip((np.asarray(g, np.float32) / 255 - .5) * r.get("contrast", 1.3) + .5, 0, 1) ** r.get("gamma", 1.0)
        a = grain(a, r.get("grain", 20))
    out = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.UnsharpMask(1.1, 50, 2))
    out.save(page / "assets" / f"{key}.jpg", quality=82, optimize=True, progressive=True)
    print(f"{key:14s} {out.size[0]}x{out.size[1]}  {mode}")

def prep(page: Path, keys):
    rec = json.loads((page / "recipes.json").read_text())["recipes"]
    for k in keys or rec: build(page, k, rec[k])

def sheet(page: Path):
    fs = sorted((page / "assets").glob("*.jpg")); W = 260; cols = 6
    s = Image.new("RGB", (W * cols, W * ((len(fs) + cols - 1) // cols)), "#777")
    for i, f in enumerate(fs):
        im = Image.open(f).convert("RGB"); im.thumbnail((W - 8, W - 22)); x, y = (i % cols) * W, (i // cols) * W
        s.paste(im, (x + 4, y + 4)); ImageDraw.Draw(s).text((x + 5, y + W - 16), f.stem, fill="yellow")
    (page / "shots").mkdir(exist_ok=True); s.save(page / "shots/assets.png"); print(page / "shots/assets.png")

if __name__ == "__main__":
    cmd, *rest = sys.argv[1:] or ["-h"]
    if cmd == "search": search(" ".join(rest))
    elif cmd == "fetch": fetch(Path(rest[0]))
    elif cmd == "prep": prep(Path(rest[0]), rest[1:])
    elif cmd == "sheet": sheet(Path(rest[0]))
    else: print(__doc__)
