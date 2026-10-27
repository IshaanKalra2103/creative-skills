# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow", "numpy", "typesafe-sdk"]
# ///
"""Label every shot of a reference ad with Jev (TypeSafe's System One model), after study.py
found the cuts: shot size, camera angle, camera move, subject and light from three frames of
the shot, and whether the cut into it is a match cut. The way in (flash, blur for a whip or
zoom-through, black for a dip, snap) comes from study.py's numbers. Writes shotlog.json,
shotlog.md (one row per shot, then counts: which sizes, angles and moves the ad uses, how long
each size holds) and shotlog.jpg (the frames with their labels).
Read the log against the contact sheet: Jev's image support is a preview, and the camera move
from three frames is a guess when the subject also moves. Fix what is wrong by hand.
usage: uv run tools/label.py REF.mp4 STUDY_DIR [--min-hold 4]
"""
import argparse, json, os, subprocess, sys, tempfile
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from adlib import jev, jpeg

ap = argparse.ArgumentParser()
ap.add_argument("ref")
ap.add_argument("study")
ap.add_argument("--min-hold", type=int, default=4, help="shorter holds are transition frames, not shots")
a = ap.parse_args()
cj = json.load(open(os.path.join(a.study, "cuts.json")))
fps = cj["fps"]
import typesafe_sdk as ts

SIZE = {
    "macro": "An extreme close-up: a detail fills the frame, such as a boot's texture, studs, a ball's seams, an eye.",
    "close-up": "One body part or the product fills most of the frame: the feet and boots, the hands, the face, the ball.",
    "medium": "The athlete from about the knees or waist up.",
    "full": "The whole athlete from head to toe, with a little space around.",
    "wide": "The athlete is small in a large space: the pitch, court, track, stadium or street.",
    "none": "No athlete and no product: type, a logo, or only the place.",
}
ANGLE = {
    "ground": "The camera sits on the ground or just above it, looking along the surface.",
    "low": "Below the subject, looking up at it.",
    "eye": "At about the subject's eye or chest height, level.",
    "high": "Above the subject, looking down at an angle.",
    "overhead": "Straight down from above, top-down.",
    "pov": "From the athlete's own eyes.",
    "through": "Through or from behind an object: a net, a fence, a hoop, glass, between legs.",
}
MOVE = {
    "static": "The camera does not move; only the subject moves, if anything.",
    "push": "The camera moves or zooms toward the subject; it grows in frame.",
    "pull": "The camera moves or zooms away; the subject shrinks in frame.",
    "track": "The camera travels sideways alongside a moving subject at its speed; the background streams past.",
    "lead": "The camera moves backward ahead of a subject coming toward it.",
    "follow": "The camera moves forward behind the subject.",
    "orbit": "The camera arcs around the subject; the background swings behind it.",
    "crane": "The camera rises or drops vertically.",
    "pan": "The camera turns in place, left-right or up-down, to follow or reveal.",
    "handheld": "Shaky, unsteady framing that wanders.",
}
SUBJECT = {
    "product": "The product on its own or clearly dominant: a hero or packshot.",
    "action": "An athlete performing the sport's movement: striking, dribbling, jumping, sprinting, swinging.",
    "prep": "An athlete not in play: walking, lacing up, breathing, waiting, celebrating.",
    "prop": "The ball or another piece of equipment in flight or at contact, without the athlete as the subject.",
    "place": "The setting itself: the stadium, the crowd, the court, the city, the weather.",
    "type": "Words or a logo on screen as the main content.",
}
LIGHT = {
    "night": "Dark, low-key: night or a black space, hard rim or back light, deep shadows.",
    "day": "Natural daylight.",
    "studio": "Controlled studio light on a plain backdrop.",
    "colour": "Strongly coloured light: neon, a single saturated colour washing the scene.",
    "soft": "Soft, even, overcast or diffuse light.",
}


def choice(text, crit):
    return ts.Choice(instructions=text, criteria=crit)


SHOT_QS = {
    "size": choice("`frames` are the first, middle and last frame of one shot of an ad. How big is the main subject in frame?", SIZE),
    "angle": choice("`frames` are the first, middle and last frame of one shot of an ad. Where is the camera relative to the subject?", ANGLE),
    "move": choice("`frames` are the first, middle and last frame of one shot of an ad, in order. Compare them: how does the camera move during the shot? Judge the camera by the background and framing, not the subject's own motion.", MOVE),
    "subject": choice("`frames` are the first, middle and last frame of one shot of an ad. What is the shot about?", SUBJECT),
    "light": choice("`frames` are the first, middle and last frame of one shot of an ad. What is the light like?", LIGHT),
}
MATCH_Q = {"same": ts.Noul(instructions="`a` and `b` are two frames from an ad. Are they from the same continuous shot "
                           "(the same scene, camera and moment, perhaps with a flash or a jolt between), rather than two "
                           "different shots?"),
           "match": ts.Noul(instructions="`a` is the last frame of one shot and `b` the first frame of the next. Is this a "
                            "match cut: a subject of the same shape or motion (a ball, a boot, a circle, a swing) sits at "
                            "about the same place and size in both, so the eye carries across the cut?")}


cuts, holds, kinds = cj["cuts"], cj["holds"], cj.get("kinds", [""] * len(cj["cuts"]))
shots = [i for i, h in enumerate(holds) if h >= a.min_hold]
need = sorted({n for i in shots for n in (cuts[i] + 1, cuts[i] + holds[i] // 2, cuts[i] + holds[i] - 2,
                                          cuts[i] + holds[i] - 1)})
tmp = tempfile.mkdtemp()
sel = "+".join(f"eq(n\\,{n})" for n in need)
subprocess.run(["ffmpeg", "-v", "error", "-i", a.ref, "-vf", f"fps={fps},select='{sel}',scale=384:-2",
                "-fps_mode", "passthrough", os.path.join(tmp, "%05d.png")], check=True)
files = dict(zip(need, sorted(os.listdir(tmp))))


def grab(n):
    return Image.open(os.path.join(tmp, files[n])).convert("RGB")


def way_in(i):
    """How shot i is entered: from the short holds right before it, else a plain cut."""
    j = i - 1
    seen = []
    while j >= 0 and holds[j] < a.min_hold:
        seen.append(kinds[j] or "snap")
        j -= 1
    if not seen:
        return "cut"
    for k in ("flash", "black", "blur"):
        if k in seen:
            return {"flash": "flash", "black": "dip", "blur": "whip/zoom"}[k]
    return f"snap x{len(seen)}"


def label(i):
    c, h = cuts[i], holds[i]
    fr = [grab(c + 1), grab(c + h // 2), grab(c + h - 2)]
    ans = jev().system_one(state={"frames": [ts.Image(jpeg(f)) for f in fr]}, questions=SHOT_QS).answers
    row = {"shot": i, "frame": c, "hold": h, "sec": round(c / fps, 2), "in": way_in(i)}
    for k in SHOT_QS:
        row[k], row[k + "_conf"] = ans[k].choice, round(ans[k].confidence, 2)
    prev = [j for j in shots if j < i]
    if prev:
        p = prev[-1]
        ans = jev().system_one(state={"a": ts.Image(jpeg(grab(cuts[p] + holds[p] - 1))), "b": ts.Image(jpeg(fr[0]))},
                               questions=MATCH_Q).answers
        row["same"], row["match"] = round(ans["same"].noul, 2), round(ans["match"].noul, 2)
        if row["same"] > 0.6:
            row["in"] = "hit (same shot)"
        elif row["match"] > 0.6:
            row["in"] = "match"
    return row, fr[1]


with ThreadPoolExecutor(8) as ex:
    res = list(ex.map(label, shots))
rows = [r for r, _ in res]
json.dump(rows, open(os.path.join(a.study, "shotlog.json"), "w"), indent=1)

md = [f"# Shot log: {os.path.basename(a.ref)}", "",
      f"{len(rows)} shots over {cj['frames'] / fps:.1f} s" + (f", {cj['bpm']} bpm" if cj.get("bpm") else "") +
      f". Holds under {a.min_hold} frames are counted as transition frames.", "",
      "| # | time | hold | in | size | angle | move | subject | light |", "|---|---|---|---|---|---|---|---|---|"]
for r in rows:
    md.append(f"| {r['shot']} | {r['sec']:.2f} | {r['hold']} | {r['in']} | {r['size']} | {r['angle']} | {r['move']} "
              f"| {r['subject']} | {r['light']} |")
md += ["", "## Grammar", ""]
for k in ("size", "angle", "move", "subject", "in"):
    cnt = Counter(r[k] for r in rows)
    md.append(f"- {k}: " + ", ".join(f"{v} {n}" for v, n in cnt.most_common()))
hold_by = defaultdict(list)
for r in rows:
    hold_by[r["size"]].append(r["hold"])
md.append("- average hold by size: " + ", ".join(f"{k} {sum(v) / len(v):.0f}f" for k, v in hold_by.items()))
seq = " > ".join(r["size"] for r in rows)
md.append(f"- size sequence: {seq}")
open(os.path.join(a.study, "shotlog.md"), "w").write("\n".join(md) + "\n")

# sheet: middle frame of each shot with its labels
tw = 240
tiles = []
font = ImageFont.load_default(size=13)
for r, im in res:
    im = im.resize((tw, round(im.height * tw / im.width)))
    t = Image.new("RGB", (tw, im.height + 58), (20, 20, 20))
    t.paste(im, (0, 0))
    d = ImageDraw.Draw(t)
    d.text((4, im.height + 2), f"#{r['shot']} {r['sec']:.2f}s +{r['hold']}f  in: {r['in']}", font=font, fill="white")
    d.text((4, im.height + 20), f"{r['size']} / {r['angle']} / {r['move']}", font=font, fill=(255, 170, 80))
    d.text((4, im.height + 38), f"{r['subject']} / {r['light']}", font=font, fill=(170, 170, 170))
    tiles.append(t)
cols = 8
th = max(t.height for t in tiles)
sheet = Image.new("RGB", (cols * (tw + 4), -(-len(tiles) // cols) * (th + 4)), (10, 10, 10))
for i, t in enumerate(tiles):
    sheet.paste(t, ((i % cols) * (tw + 4), (i // cols) * (th + 4)))
sheet.save(os.path.join(a.study, "shotlog.jpg"), quality=88)
print("\n".join(md))
print(f"\nwrote {a.study}/shotlog.md, shotlog.json, shotlog.jpg")
