# /// script
# requires-python = ">=3.10"
# ///
"""Put the replica next to the reference so differences are obvious.

    # reference | replica at the same timestamps (replica stills from render.py --stills)
    uv run compare.py stills ref.mp4 stills/ --times 0.5,1.8,3.4 --out cmp/

    # per-cell motion sheets: reference row on top, replica row underneath, N fps
    uv run compare.py motion ref.mp4 out.mp4 --grid 2x2 --fps 4 --out cmp/

Single stills catch layout, colour and size errors; motion sheets catch timing
drift (a beat that lands a few frames early, a curve that settles too slowly),
which stills hide. Look at both before calling a pass done.
"""
import argparse
import math
import pathlib
import subprocess


def run(*cmd):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *cmd], check=True)


def duration(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                                capture_output=True, text=True, check=True).stdout)


def stills(a):
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    crop = f"crop={a.crop}," if a.crop else ""
    for t in (float(x) for x in a.times.split(",")):
        mine = pathlib.Path(a.stills) / f"t{t:05.2f}.png"
        if not mine.exists():
            print(f"missing {mine} — render it with: render.py <page> --stills {t}")
            continue
        dst = out / f"cmp_{t:05.2f}.png"
        # the replica still may be at a different pixel size; scale both to the same width
        run("-ss", str(t), "-i", a.ref, "-i", str(mine), "-filter_complex",
            f"[0:v]{crop}scale={a.width}:-2[o];[1:v]{crop}scale={a.width}:-2[m];[o][m]hstack",
            "-frames:v", "1", str(dst))
        print(dst)


def motion(a):
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    cols, rows = map(int, a.grid.lower().split("x"))
    names = ["tl", "tr", "bl", "br"] if (cols, rows) == (2, 2) else [f"r{r}c{c}" for r in range(rows) for c in range(cols)]
    n = math.floor(min(duration(a.ref), duration(a.replica)) * a.fps)  # container duration can include a longer audio track
    per_row = 10
    for i, name in enumerate(names):
        r, c = divmod(i, cols)
        crop = f"crop=iw/{cols}:ih/{rows}:iw/{cols}*{c}:ih/{rows}*{r}"
        dst = out / f"motion_{name}.png"
        run("-i", a.ref, "-i", a.replica, "-filter_complex",
            f"[0:v]{crop},scale={a.width}:-2,fps={a.fps}[o];[1:v]{crop},scale={a.width}:-2,fps={a.fps}[m];"
            f"[o][m]vstack,pad=iw+4:ih+4:2:2:red,tile={per_row}x{math.ceil(n / per_row)}",
            "-frames:v", "1", str(dst))
        print(dst)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="mode", required=True)
    s = sub.add_parser("stills"); s.add_argument("ref"); s.add_argument("stills")
    s.add_argument("--times", required=True); s.add_argument("--crop", help="ffmpeg crop w:h:x:y in each image's own pixels")
    s.add_argument("--width", type=int, default=1280); s.add_argument("--out", default="cmp")
    m = sub.add_parser("motion"); m.add_argument("ref"); m.add_argument("replica")
    m.add_argument("--grid", default="1x1"); m.add_argument("--fps", type=float, default=4)
    m.add_argument("--width", type=int, default=240); m.add_argument("--out", default="cmp")
    a = ap.parse_args()
    stills(a) if a.mode == "stills" else motion(a)


if __name__ == "__main__":
    main()
