# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow"]
# ///
"""Source real images from Google Images through the user's Chrome (browser-harness), for placing as objects in the 3D set.

  uv run web_images.py "<query>" <name> [--n 12] [--min 500] [--out assets/img]

Run it from the reel folder. It opens a Google Images tab, reads the original image URLs out of the page, closes the tab,
downloads up to --n originals (long side >= --min px) into <out>/<name>/NN.jpg (re-encoded to JPEG, max 2048 px), writes a
numbered contact sheet <out>/<name>/_sheet.jpg to pick from, and logs every file with its source URL in assets/SOURCES.md.
Look at the sheet, keep the one(s) you use, delete the rest, and credit the source on screen if it's someone's photo.
"""
import argparse, io, json, os, re, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("query"); ap.add_argument("name")
ap.add_argument("--n", type=int, default=12); ap.add_argument("--min", type=int, default=500)
ap.add_argument("--out", default="assets/img")
a = ap.parse_args()

# 1. Google Images in the user's Chrome: the page carries ["<original url>", height, width] triples for every result
HARNESS = r'''
import os, re, json, time, urllib.parse
q = os.environ["WEBIMG_Q"]
tab = new_tab("https://www.google.com/search?udm=2&q=" + urllib.parse.quote(q))
wait_for_load(); time.sleep(2)
for _ in range(2):  # a little scroll loads more results
    js("window.scrollBy(0, 3000)"); time.sleep(1.2)
html = js("document.documentElement.outerHTML")
hits = re.findall(r'\["(https?://[^"]+?)",(\d+),(\d+)\]', html)
try: close_tab(tab) if tab else close_tab()
except Exception:
    try: close_tab()
    except Exception: pass
print("WEBIMG" + json.dumps(hits))
'''
r = subprocess.run(["browser-harness"], input=HARNESS, text=True, capture_output=True, env={**os.environ, "WEBIMG_Q": a.query})
line = next((l for l in r.stdout.splitlines() if l.startswith("WEBIMG")), None)
if not line:
    sys.exit("browser-harness gave no results:\n" + r.stdout[-2000:] + r.stderr[-2000:])
seen, cands = set(), []
for u, h, w in json.loads(line[6:]):
    u = u.encode().decode("unicode_escape") if "\\u" in u else u
    if "gstatic.com" in u or "encrypted-tbn" in u or "google." in urllib.parse.urlparse(u).netloc or u in seen: continue
    seen.add(u)
    if max(int(h), int(w)) >= a.min: cands.append((u, int(w), int(h)))
print(f"{len(cands)} candidates >= {a.min}px for {a.query!r}")

# 2. download originals (untrusted bytes: decoded by Pillow, re-encoded, never executed)
d = Path(a.out) / a.name; d.mkdir(parents=True, exist_ok=True)
got = []
for u, w, h in cands:
    if len(got) >= a.n: break
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
                                                 "Accept": "image/avif,image/webp,image/*,*/*;q=0.8"})
        data = urllib.request.urlopen(req, timeout=15).read(25_000_000)
        im = Image.open(io.BytesIO(data)); im.load()
        if max(im.size) < a.min: continue
        im = im.convert("RGB"); im.thumbnail((2048, 2048))
        f = d / f"{len(got) + 1:02d}.jpg"; im.save(f, quality=92)
        got.append((f, u, im.size)); print(f"  {f.name}  {im.size[0]}x{im.size[1]}  {u}")
    except Exception as e:
        print(f"  skip ({type(e).__name__}) {u[:90]}")
if not got: sys.exit("nothing downloaded")

# 3. numbered contact sheet to pick from
cols, cw, ch = 4, 360, 270
sheet = Image.new("RGB", (cols * cw, ((len(got) + cols - 1) // cols) * ch), (20, 20, 20))
dr = ImageDraw.Draw(sheet)
for i, (f, u, _) in enumerate(got):
    im = Image.open(f); im.thumbnail((cw - 10, ch - 10))
    x, y = (i % cols) * cw, (i // cols) * ch
    sheet.paste(im, (x + (cw - im.width) // 2, y + (ch - im.height) // 2))
    dr.rectangle([x + 4, y + 4, x + 40, y + 28], fill=(255, 0, 255)); dr.text((x + 10, y + 9), f.stem, fill=(255, 255, 255))
sheet.save(d / "_sheet.jpg", quality=88); print(d / "_sheet.jpg")

# 4. provenance
src = Path("assets/SOURCES.md")
with src.open("a") as fh:
    if src.stat().st_size == 0: fh.write("# Sources\n\n")
    fh.write(f"\n## img/{a.name} (Google Images: {a.query!r})\n")
    for f, u, (w, h) in got: fh.write(f"- `{f.relative_to('assets')}` {w}x{h} <{u}>\n")
