# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow", "requests"]
# ///
"""Reference images from a web image search: the product (every angle of the exact model and
colourway), the sport's movements and props, and the look of ads you want to learn from.
Downloads into OUT_DIR as <name>_<n>.<ext>, writes <name>.sources.md (the page each file came
from) and <name>_sheet.jpg (a labelled contact sheet). LOOK at the sheet and keep only
images you checked: the right model and colourway, no watermarks.

These are references for the image model and for your own study. They belong to their owners:
don't publish them, and don't put them in a repo.
Image search results drift (a long query can come back as generic catalogue tiles), so pass
--must with a word every right result has in its title or URL, such as the model name.
Sources: google (Google Images in your Chrome through the browser-harness CLI; the most
relevant), bing (Bing's image endpoint, no browser; good with --must, poor on generic queries),
openverse (openly licensed photos, with creators).
usage: uv run tools/refs.py OUT_DIR NAME "query" [-n 12] [--must word] [--source google|bing|openverse] [--min 600]
"""
import argparse, json, os, re, subprocess, urllib.parse
import requests
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("out"); ap.add_argument("name"); ap.add_argument("query")
ap.add_argument("-n", type=int, default=12)
ap.add_argument("--source", choices=["google", "bing", "openverse"], default="google")
ap.add_argument("--min", type=int, default=600, help="minimum width or height (px)")
ap.add_argument("--must", action="append", default=[], help="keep only results whose title or URL contains this word")
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"}
# stock sites watermark their previews
SKIP = re.compile(r"dreamstime|alamy|shutterstock|istock|gettyimages|123rf|depositphotos|vecteezy|adobe|freepik", re.I)

GOOGLE = """
import json, re, time, urllib.parse
new_tab("https://www.google.com/search?udm=2&q=" + urllib.parse.quote_plus(QUERY))
time.sleep(3)
html = js("document.documentElement.outerHTML")
seen, out = set(), []
# full-size results sit in the page data as ["url", height, width]
for u, h, w in re.findall(r'\\["(https?://[^"\\\\]+?\\.(?:jpg|jpeg|png|webp)[^"\\\\]*)",(\\d+),(\\d+)\\]', html):
    if "gstatic.com" in u or "google.com" in u or u in seen:
        continue
    seen.add(u)
    out.append({"url": u, "page": u, "title": "", "w": int(w), "h": int(h)})
close_tab()
print("RESULTS" + json.dumps(out))
"""

items = []
if a.source == "google":
    r = subprocess.run(["browser-harness"], input=GOOGLE.replace("QUERY", json.dumps(a.query)), capture_output=True, text=True, timeout=120)
    m = re.search(r"RESULTS(\[.*\])", r.stdout)
    if not m:
        raise SystemExit("browser-harness gave no results (is Chrome running with remote debugging allowed?)\n" + r.stdout[-800:] + r.stderr[-800:])
    items = [it for it in json.loads(m.group(1)) if max(it["w"], it["h"]) >= a.min and not SKIP.search(it["url"])]
elif a.source == "bing":
    # the async endpoint honours the query; the full results page can fall back to sponsored tiles
    html = requests.get("https://www.bing.com/images/async",
                        params={"q": a.query, "first": 0, "count": 50, "mmasync": 1, "qft": "+filterui:imagesize-large"},
                        headers=UA, timeout=30).text
    for m in re.findall(r'm="(\{[^"]+\})"', html):
        meta = m.replace("&quot;", '"').replace("&amp;", "&")
        u = re.search(r'"murl":"([^"]+)"', meta)
        if u and not SKIP.search(u.group(1)):
            p = re.search(r'"purl":"([^"]+)"', meta)
            t = re.search(r'"t":"([^"]*)"', meta)
            items.append({"url": u.group(1), "page": p.group(1) if p else u.group(1), "title": t.group(1) if t else ""})
else:
    r = requests.get("https://api.openverse.org/v1/images/", params={"q": a.query, "page_size": 30, "mature": "false"}, headers=UA, timeout=30)
    r.raise_for_status()
    for it in r.json().get("results", []):
        items.append({"url": it["url"], "page": it.get("foreign_landing_url") or it["url"], "title": it.get("title") or ""})

items = [it for it in items if all(w.lower() in (it["title"] + it["url"] + it["page"]).lower() for w in a.must)]
sources, k = [], 0
for it in items:
    if k >= a.n:
        break
    try:
        resp = requests.get(it["url"], headers=UA, timeout=25)
        if resp.status_code != 200 or len(resp.content) < 20000:
            continue
        ext = os.path.splitext(urllib.parse.urlparse(it["url"]).path)[1].lower()
        ext = ext if ext in (".jpg", ".jpeg", ".png", ".webp") else ".jpg"
        path = os.path.join(a.out, f"{a.name}_{k + 1}{ext}")
        open(path, "wb").write(resp.content)
        with Image.open(path) as im:
            im.verify()
        with Image.open(path) as im:
            if max(im.size) < a.min:
                os.remove(path)
                continue
        k += 1
        sources.append((os.path.basename(path), it["page"], it["title"]))
    except Exception:
        continue
with open(os.path.join(a.out, f"{a.name}.sources.md"), "w") as f:
    f.write(f"query: {a.query} ({a.source})\n\n" + "".join(f"- `{n}`: {t} {p}\n" for n, p, t in sources))

tiles = []
for n, _, _ in sources:
    im = Image.open(os.path.join(a.out, n)).convert("RGB")
    im.thumbnail((240, 240))
    t = Image.new("RGB", (244, 262), (30, 30, 30))
    t.paste(im, ((244 - im.width) // 2, 20))
    ImageDraw.Draw(t).text((4, 4), n, fill=(255, 230, 0))
    tiles.append(t)
if tiles:
    cols = min(len(tiles), 6)
    sheet = Image.new("RGB", (244 * cols, 262 * ((len(tiles) + cols - 1) // cols)), (15, 15, 15))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * 244, (i // cols) * 262))
    sheet.save(os.path.join(a.out, f"{a.name}_sheet.jpg"), quality=85)
print(f"{k} images in {a.out}, sources in {a.name}.sources.md, sheet {a.name}_sheet.jpg")
