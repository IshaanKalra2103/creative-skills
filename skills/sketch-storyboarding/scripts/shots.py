# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=10.1"]
# ///
"""Break a trailer or gameplay clip into shots so it can be read before it is re-directed.

    uv run shots.py clip.mp4                        # -> shots/contact-01.jpg ... + shots/shots.json
    uv run shots.py clip.mp4 --threshold 0.25       # more sensitive cut detection
    uv run shots.py clip.mp4 --long 2 --out redo/   # sample long takes every 2 s

Cuts come from ffmpeg's scene score. Shots shorter than --min (flash frames, white pops)
merge into the shot before them. Every shot gets a frame from its middle; takes longer
than --long get one frame per --long seconds (07, 07b, 07c...) so camera moves inside a
long gameplay take are visible. Contact sheets hold 36 frames each, numbered with
timecodes; shots.json holds the same table plus the frame paths.
"""
import argparse
import json
import math
import pathlib
import re
import subprocess

from PIL import Image, ImageDraw, ImageFont

COLS, PER_SHEET, THUMB_W = 6, 36, 320


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height,r_frame_rate:format=duration", "-of", "json", str(path)],
                         capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    s = d["streams"][0]
    num, den = map(int, s["r_frame_rate"].split("/"))
    return {"width": s["width"], "height": s["height"], "fps": round(num / den, 3),
            "duration": float(d["format"]["duration"])}


def detect_cuts(path, threshold):
    # scale down first: the scene score barely changes and it runs several times faster
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-an",
                        "-vf", f"scale=320:-2,select='gt(scene,{threshold})',showinfo", "-f", "null", "-"],
                       capture_output=True, text=True)
    return sorted({round(float(m), 3) for m in re.findall(r"pts_time:([\d.]+)", r.stderr)})


def build_shots(cuts, duration, min_len):
    edges = [0.0] + [c for c in cuts if 0 < c < duration] + [duration]
    shots = []
    for a, b in zip(edges, edges[1:]):
        if shots and b - a < min_len:
            shots[-1]["end"] = b  # a flash or a one-frame pop: fold it into the shot before
        else:
            shots.append({"start": a, "end": b})
    if len(shots) > 1 and shots[0]["end"] - shots[0]["start"] < min_len:
        shots[1]["start"] = shots.pop(0)["start"]
    for i, s in enumerate(shots, 1):
        s["n"], s["dur"] = i, round(s["end"] - s["start"], 3)
    return shots


def tc(t):
    return f"{int(t // 60)}:{t % 60:04.1f}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("clip")
    ap.add_argument("--out", default="shots")
    ap.add_argument("--threshold", type=float, default=0.3, help="ffmpeg scene score for a cut (0-1, default 0.3)")
    ap.add_argument("--min", type=float, default=0.35, help="shots shorter than this merge into the previous one (s)")
    ap.add_argument("--long", type=float, default=3.0, help="sample takes longer than this every N seconds")
    a = ap.parse_args()

    clip, out = pathlib.Path(a.clip), pathlib.Path(a.out)
    (out / "frames").mkdir(parents=True, exist_ok=True)
    info = probe(clip)
    shots = build_shots(detect_cuts(clip, a.threshold), info["duration"], a.min)

    samples = []
    for s in shots:
        k = max(1, math.ceil(s["dur"] / a.long))
        s["frames"] = []
        for j in range(k):
            t = s["start"] + (j + 0.5) * s["dur"] / k
            tag = f"{s['n']:02d}" + ("" if j == 0 else chr(ord("a") + j))
            f = out / "frames" / f"{tag}.jpg"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(clip), "-frames:v", "1",
                            "-vf", f"scale={THUMB_W * 2}:-2", "-q:v", "3", str(f)], check=True)
            s["frames"].append(str(f))
            samples.append((tag, t, s, f))

    th = round(THUMB_W * info["height"] / info["width"])
    font, small = ImageFont.load_default(size=17), ImageFont.load_default(size=14)
    sheets = []
    for p in range(0, len(samples), PER_SHEET):
        page = samples[p:p + PER_SHEET]
        rows = math.ceil(len(page) / COLS)
        sheet = Image.new("RGB", (COLS * (THUMB_W + 12) + 12, rows * (th + 52) + 12), "#f4f1ea")
        d = ImageDraw.Draw(sheet)
        for i, (tag, t, s, f) in enumerate(page):
            x, y = 12 + (i % COLS) * (THUMB_W + 12), 12 + (i // COLS) * (th + 52)
            sheet.paste(Image.open(f).resize((THUMB_W, th)), (x, y))
            d.text((x, y + th + 5), tag, font=font, fill="#1a1a1a")
            rng = f"{tc(s['start'])}-{tc(s['end'])}  {s['dur']:.1f}s" if len(tag) == 2 else f"@ {tc(t)}"
            d.text((x + 34, y + th + 8), rng, font=small, fill="#555")
        name = out / f"contact-{p // PER_SHEET + 1:02d}.jpg"
        sheet.save(name, quality=88)
        sheets.append(str(name))

    (out / "shots.json").write_text(json.dumps({"clip": str(clip), **info, "threshold": a.threshold,
                                                "shots": shots, "sheets": sheets}, indent=1))
    durs = [s["dur"] for s in shots]
    print(f"{clip.name}: {info['duration']:.1f}s, {len(shots)} shots, "
          f"median {sorted(durs)[len(durs) // 2]:.1f}s, shortest {min(durs):.1f}s, longest {max(durs):.1f}s")
    for s in shots:
        print(f"  {s['n']:02d}  {tc(s['start'])}-{tc(s['end'])}  {s['dur']:5.1f}s")
    print("\n".join(sheets))
    print(out / "shots.json")


if __name__ == "__main__":
    main()
