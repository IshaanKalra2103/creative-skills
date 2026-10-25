# /// script
# requires-python = ">=3.10"
# dependencies = ["typesafe-sdk", "pillow", "numpy"]
# ///
"""Visual QA with Jev (TypeSafe's System One model): judge frames of our cut and the reference,
and score each section's match with the reference.

Per frame: is it a framed snap cut (an inset card on a plain backdrop or thin outline boxes),
how real the main subject looks, plus any yes/no questions in spot.json `qa.questions` (for
example "is a countdown visible?"). Per section in `qa.sections`: how closely our frames match
the reference's in editing device and in look. The reference frames get the same per-frame
questions, as the control: a question that fires as often on the reference as on ours measures
nothing. Jev's image support is a preview, so treat the numbers as a second opinion next to
your own eyes on the contact sheets.
The TypeSafe key comes from $TYPESAFE_API_KEY or the macOS keychain (service TYPESAFE_API_KEY).
usage: uv run tools/qa.py SPOT OURS.mp4 [--out qa.json]
"""
import json, os, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typesafe_sdk import Image, Noul, NoulCriteria, Score, TypeSafeClient
from spotlib import Spot

args = sys.argv[1:]
out = None
if "--out" in args:
    i = args.index("--out")
    out = args[i + 1]
    del args[i:i + 2]
spot = Spot(args[0])
ours = args[1]
qa = spot.data["qa"]
ref = spot.path(qa["ref"])
out = out or spot.path("qa.json")

FRAME_QS = {
    "framed": Noul(
        instructions="Is `frame` a framed snap-cut composition?",
        criteria=NoulCriteria(
            true="A smaller picture card sits inset on a plain gradient background, or thin white rectangular "
                 "outline boxes are drawn around the product or the person.",
            false="A single full-bleed picture with no inset card and no outline boxes; small text in the "
                  "corners does not count.",
        ),
    ),
    "real": Score(
        instructions="How real does the main subject of `frame` look?",
        criteria=[
            "Obviously computer graphics: plastic surfaces, flat or blobby shading, a video-game look.",
            "Mostly convincing, with some CG tells such as uniform blur, smeared detail or missing texture.",
            "Looks like a high-end product photograph: real material texture, real reflections, crisp detail.",
        ],
    ),
}
for name, text in qa.get("questions", {}).items():
    FRAME_QS[name] = Noul(instructions=text)
PAIR_QS = {
    "device_match": Score(
        instructions="How closely do the frames in `ours` match the frames in `ref` in editing device: "
                     "snap cuts, inset picture cards on a gradient, thin outline frame boxes, whips?",
        criteria=[
            "A different device: `ours` uses none of what `ref` uses.",
            "Partly the same: some of the devices in `ref` appear in `ours`.",
            "The same device used the same way.",
        ],
    ),
    "look_match": Score(
        instructions="How closely do the frames in `ours` match the frames in `ref` in look: colour, lighting and realism?",
        criteria=[
            "Clearly different looks.",
            "Similar palette, but the realism or lighting differs noticeably.",
            "Could be shots from the same film.",
        ],
    ),
}


def grab(video, frames, d, tag):
    paths = []
    for n in frames:
        p = os.path.join(d, f"{tag}_{n:04d}.jpg")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vf", f"select=eq(n\\,{n}),scale=540:-2",
                        "-frames:v", "1", "-fps_mode", "passthrough", "-q:v", "3", p], check=True)
        paths.append(p)
    return paths


key = os.environ.get("TYPESAFE_API_KEY") or subprocess.run(
    ["security", "find-generic-password", "-s", "TYPESAFE_API_KEY", "-w"], capture_output=True, text=True).stdout.strip()
if not key:
    raise SystemExit("no TypeSafe key: set TYPESAFE_API_KEY or add it to the keychain")
client = TypeSafeClient(api_key=key, model="jev-latest", headers={"TypeSafe-Danger-Zone-Images": "true"})
tmp = tempfile.mkdtemp()
report = {"ours": ours, "ref": ref, "frames": {}, "sections": {}}


def judge(item):
    tag, n, path = item
    a = client.system_one(state={"frame": Image(Path(path))}, questions=FRAME_QS).answers
    return tag, n, {k: (a[k].score if k == "real" else a[k].noul) for k in FRAME_QS}


def compare(item):
    name, ours_p, ref_p = item
    a = client.system_one(state={"ours": [Image(Path(p)) for p in ours_p], "ref": [Image(Path(p)) for p in ref_p]},
                          questions=PAIR_QS).answers
    return name, {"device_match": a["device_match"].score, "look_match": a["look_match"].score}


jobs, pairs = [], []
for sec in qa["sections"]:
    name = sec["name"]
    op, rp = grab(ours, sec["ours"], tmp, f"ours_{name}"), grab(ref, sec["ref"], tmp, f"ref_{name}")
    jobs += [(f"ours/{name}", n, p) for n, p in zip(sec["ours"], op)] + [(f"ref/{name}", n, p) for n, p in zip(sec["ref"], rp)]
    pairs.append((name, op, rp))
with ThreadPoolExecutor(8) as ex:
    for tag, n, r in ex.map(judge, jobs):
        report["frames"].setdefault(tag, {})[n] = r
    for name, r in ex.map(compare, pairs):
        report["sections"][name] = r

cols = list(FRAME_QS)
print("per frame  (yes/no questions: probability of yes; real: 0 CG .. 2 photo)")
print(f"{'clip/section':18} {'frame':>5} " + " ".join(f"{c[:8]:>8}" for c in cols))
for tag in sorted(report["frames"], key=lambda t: (t.split("/")[1], t)):
    for n, r in sorted(report["frames"][tag].items()):
        print(f"{tag:18} {n:5d} " + " ".join(f"{r[c]:8.2f}" for c in cols))
print("\nsection match with the ref  (0 different .. 2 same)")
for name, r in report["sections"].items():
    print(f"{name:10} device {r['device_match']:.2f}  look {r['look_match']:.2f}")
json.dump(report, open(out, "w"), indent=1)
print(f"\nwrote {out}")
