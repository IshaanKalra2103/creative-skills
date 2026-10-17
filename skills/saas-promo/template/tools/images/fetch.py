# /// script
# dependencies = ["pillow", "requests"]
# ///
"""Find and download photos for screens, with credits.

    uv run tools/images/fetch.py OUT_DIR name "street tacos" [-n 8]            # Openverse (default)
    uv run tools/images/fetch.py OUT_DIR name "street tacos" --source bing      # Bing image search

Writes OUT_DIR/name_1.jpg ..., OUT_DIR/name.credits.md (title, creator, licence, source page
per file: copy the lines you use into the example's SOURCES.md) and OUT_DIR/name_sheet.png.

Openverse (openverse.org: Flickr, Wikimedia and more) is relevant and comes with licences and
creators. By default only licences that allow edits are returned (CC0, BY, BY-SA, BY-NC...),
because cut-outs, crops into shapes and recolours are adaptations; `--any-license` adds the
no-derivatives ones (fine for an unedited thumbnail). Bing finds more, but it is noisy: unrelated photos, people, fan art, watermarks.
Either way, LOOK at the sheet and use only images you checked: no people you didn't ask for,
no characters, no watermarks."""
import argparse, json, os, re, sys, urllib.parse
import requests
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("out"); ap.add_argument("name"); ap.add_argument("query")
ap.add_argument("-n", type=int, default=8)
ap.add_argument("--source", choices=["openverse", "bing"], default="openverse")
ap.add_argument("--min", type=int, default=600, help="minimum width or height (px)")
ap.add_argument("--any-license", action="store_true", help="Openverse: include no-derivatives licences (fine for a plain thumbnail, not for cut-outs or recolours)")
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"}
SKIP = re.compile(r"dreamstime|alamy|shutterstock|istock|gettyimages|123rf|depositphotos|vecteezy|adobe", re.I)

items = []
if a.source == "openverse":
    r = requests.get("https://api.openverse.org/v1/images/", params=dict({"q": a.query, "page_size": 20, "mature": "false"}, **({} if a.any_license else {"license_type": "modification"})), headers=UA, timeout=30)
    r.raise_for_status()
    for it in r.json().get("results", []):
        if (it.get("width") or 0) < a.min and (it.get("height") or 0) < a.min:
            continue
        lic = f"CC {it.get('license', '').upper()} {it.get('license_version', '')}".replace("CC CC0", "CC0").replace("CC PDM", "Public domain")
        items.append({"url": it["url"], "title": it.get("title") or "", "creator": it.get("creator") or "unknown",
                      "license": lic.strip(), "page": it.get("foreign_landing_url") or it["url"]})
else:
    html = requests.get("https://www.bing.com/images/search", params={"q": a.query, "qft": "+filterui:imagesize-large", "form": "IRFLTR"}, headers=UA, timeout=30).text
    for m in re.findall(r"murl&quot;:&quot;([^&]+)", html):
        if not SKIP.search(m):
            items.append({"url": m, "title": "", "creator": "", "license": "unknown (web image search)", "page": m})

credits, k = [], 0
for it in items:
    if k >= a.n:
        break
    try:
        resp = requests.get(it["url"], headers=UA, timeout=25)
        if resp.status_code != 200 or len(resp.content) < 20000:
            continue
        ext = os.path.splitext(urllib.parse.urlparse(it["url"]).path)[1].lower()
        ext = ext if ext in (".jpg", ".jpeg", ".png", ".webp") else ".jpg"
        k += 1
        path = os.path.join(a.out, f"{a.name}_{k}{ext}")
        open(path, "wb").write(resp.content)
        Image.open(path).verify()
        credits.append(f"- `{os.path.basename(path)}`: {it['title'] or 'untitled'} by {it['creator'] or 'unknown'}, {it['license']}, {it['page']}")
    except Exception:
        continue
open(os.path.join(a.out, f"{a.name}.credits.md"), "w").write("\n".join(credits) + "\n")

tiles = []
for line in credits:
    f = os.path.join(a.out, line.split("`")[1])
    im = Image.open(f).convert("RGB"); im.thumbnail((220, 220))
    t = Image.new("RGB", (224, 238), (40, 40, 40)); t.paste(im, (2, 16))
    ImageDraw.Draw(t).text((4, 2), os.path.basename(f), fill=(255, 255, 0)); tiles.append(t)
if tiles:
    S = Image.new("RGB", (224 * min(len(tiles), 6), 238 * ((len(tiles) + 5) // 6)), (20, 20, 20))
    for i, t in enumerate(tiles):
        S.paste(t, ((i % 6) * 224, (i // 6) * 238))
    S.save(os.path.join(a.out, f"{a.name}_sheet.png"))
print(f"{k} images, credits in {a.name}.credits.md, sheet {os.path.join(a.out, a.name + '_sheet.png')}")
