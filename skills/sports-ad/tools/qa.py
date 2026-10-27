# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow", "numpy", "typesafe-sdk"]
# ///
"""Check every shot with Jev (TypeSafe's System One model) before and after spending credits:
- product: is the product there, and how faithful is it to the product photos in ad.json
  qa.product (0 a different product or colourway .. 2 the same model in every visible detail)
- real: 0 obviously CG .. 2 a high-end photograph
- anatomy: probability that a body is malformed (extra, missing or merged limbs, impossible bends)
- form: for shots with qa.movement, how correct the technique is (0 wrong .. 2 textbook)
- the yes/no questions in ad.json qa.questions (every shot) and in each shot's qa.questions
By default it judges each shot's source (the still, or the middle of the clip); --video judges
the middle frame of each shot in a render. --control runs the same questions on real photos
(the movement references), so you can see what a real photo scores: a question that flags real
photos as often as ours measures nothing. Writes qa.json next to ad.json.
usage: uv run tools/qa.py AD_DIR [--video out/ad.mp4] [--control refs/movement/*.jpg] [--out qa.json]
"""
import argparse, io, json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from adlib import Ad, jev, jpeg
import typesafe_sdk as ts

ap = argparse.ArgumentParser()
ap.add_argument("ad")
ap.add_argument("--video")
ap.add_argument("--control", nargs="*", default=[])
ap.add_argument("--out")
a = ap.parse_args()
ad = Ad(a.ad)
qa = ad.data.get("qa", {})
product = [Image.open(ad.path(p)).convert("RGB") for p in qa.get("product", [])]
for im in product:
    im.thumbnail((640, 640))

BASE = {
    "real": ts.Score(instructions="How real does `frame` look?", criteria=[
        "Obviously computer graphics: plastic surfaces, flat or blobby shading, a video-game look.",
        "Mostly convincing, with tells such as smeared detail, melted shapes, uniform blur or missing texture.",
        "Looks like a high-end photograph: real material texture, real light and reflections, crisp detail."]),
    "anatomy": ts.Noul(instructions="Does any person in `frame` have a malformed body: an extra, missing or merged leg, "
                                    "foot, arm or hand, two left or two right feet, or a joint bent in a way a body cannot "
                                    "bend? No person in frame means no."),
}
if product:
    BASE["present"] = ts.Noul(instructions="`product` shows one product from several angles. Does `frame` show that "
                                           "kind of product (it may be worn or used)?")
    BASE["product"] = ts.Score(instructions="`product` shows the real product from several angles. Compare the product "
                                            "in `frame` with it, on what is visible.", criteria=[
        "A different product or colourway.",
        "The same kind of product and colours, but details differ: panel shapes, texture, logo placement or size, "
        "sole or stud layout.",
        "The same model and colourway in every visible detail."])
for k, text in qa.get("questions", {}).items():
    BASE[k] = ts.Noul(instructions=text.replace("the frame", "`frame`"))


def questions(shot):
    q = dict(BASE)
    sq = shot.get("qa", {}) if shot else {}
    if sq.get("movement"):
        q["form"] = ts.Score(instructions=f"The athlete in `frame` should be shown {sq['movement']}. "
                                          "How correct is the technique as shown?", criteria=[
            "Wrong or impossible: a coach would not recognise the movement, or the body could not do it.",
            "Roughly right, but a coach would correct it: balance, foot placement or body shape is off.",
            "Textbook: it looks like a frame from real footage of a good player doing it."])
    for k, text in sq.get("questions", {}).items():
        q[k] = ts.Noul(instructions=text)
    return q


def frame_of(shot):
    if a.video:
        g = shot["_start"] + shot["_len"] // 2
        png = subprocess.run(["ffmpeg", "-v", "error", "-i", ad.path(a.video), "-vf", f"select=eq(n\\,{g})",
                              "-frames:v", "1", "-fps_mode", "passthrough", "-f", "image2pipe", "-vcodec", "png", "-"],
                             capture_output=True, check=True).stdout
        return Image.open(io.BytesIO(png)).convert("RGB")
    src = ad.source(shot)
    return src.frame(src.n // 2)


def judge(item):
    name, img, shot = item
    img = img.copy()
    img.thumbnail((768, 768))
    state = {"frame": ts.Image(jpeg(img))}
    if product:
        state["product"] = [ts.Image(jpeg(p)) for p in product]
    q = questions(shot)
    ans = jev().system_one(state=state, questions=q).answers
    return name, {k: round(ans[k].score if isinstance(q[k], ts.Score) else ans[k].noul, 2) for k in q}


items = [(s["id"], frame_of(s), s) for s in ad.shots if "src" in s]
items += [(f"control:{os.path.basename(p)}", Image.open(p).convert("RGB"), None) for p in a.control]
with ThreadPoolExecutor(8) as ex:
    res = dict(ex.map(judge, items))

cols = sorted({k for r in res.values() for k in r}, key=lambda k: (k not in ("present", "product", "real", "form", "anatomy"), k))
ctrl = [r for n, r in res.items() if n.startswith("control:")]
# flag levels: from the control photos when there are any (a real photo is the bar), else defaults
# measured on the Hypervenom example (real photos scored real 0.94-1.25, anatomy 0.29-0.90)
lv = {"real": 0.9, "product": 1.1, "form": 0.8, "anatomy": 0.6}
if ctrl:
    lv["real"] = min(r["real"] for r in ctrl) - 0.05
    lv["anatomy"] = max(r["anatomy"] for r in ctrl) + 0.05
print("yes/no columns: probability of yes; product, real, form: 0 .. 2")
print(f"{'shot':28}" + "".join(f"{c[:9]:>10}" for c in cols) + "   flags")
for name, r in res.items():
    flags = []
    if r.get("present", 1) > 0.5 and r.get("product", 2) < lv["product"]:
        flags.append("product")
    if r["real"] < lv["real"]:
        flags.append("real")
    if r["anatomy"] > lv["anatomy"]:
        flags.append("anatomy")
    if r.get("form", 2) < lv["form"]:
        flags.append("form")
    flags += [k for k in qa.get("questions", {}) if r.get(k, 0) > 0.5 and not name.startswith("control:")]
    print(f"{name[:28]:28}" + "".join(f"{r[c]:10.2f}" if c in r else f"{'':>10}" for c in cols) + "   " + " ".join(flags))
if ctrl:
    print("control means: " + ", ".join(f"{c} {sum(r[c] for r in ctrl if c in r) / max(1, sum(c in r for r in ctrl)):.2f}"
                                        for c in cols if any(c in r for r in ctrl)))
out = a.out or ad.path("qa.json")
json.dump({"video": a.video, "results": res}, open(out, "w"), indent=1)
print(f"\nwrote {out}")
