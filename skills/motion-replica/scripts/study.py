# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""Measure a reference video before rebuilding it.

    uv run study.py ref.mp4 --grid 2x2                 # summary + contact sheets into ./study/
    uv run study.py ref.mp4 --grid 2x2 --burst tl 1.25 1.95 --fps 20
                                                        # one frame strip for reading a curve

For every cell of the grid it finds:
  * the loop period — the lag with the lowest mean frame difference (cells in a grid
    ad usually loop independently, at different lengths);
  * hard cuts — frames whose difference from the previous frame spikes far above the
    cell's typical motion;
and writes a contact sheet of one loop per cell (read these to write the beat table),
plus a whole-frame overview sheet. Everything lands in --out (default ./study).
"""
import argparse
import json
import math
import pathlib
import subprocess

import numpy as np


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                          "stream=codec_type,width,height,r_frame_rate,nb_frames,duration:format=duration",
                          "-of", "json", path], capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    num, den = map(int, v["r_frame_rate"].split("/"))
    return {"width": v["width"], "height": v["height"], "fps": num / den,
            "frames": int(v.get("nb_frames", 0)) or None,
            "duration": float(d["format"]["duration"]),
            "audio": any(s["codec_type"] == "audio" for s in d["streams"])}


def cells_for(grid):
    cols, rows = map(int, grid.lower().split("x"))
    names = {(2, 2): ["tl", "tr", "bl", "br"], (1, 1): ["full"], (2, 1): ["left", "right"], (1, 2): ["top", "bottom"]}
    labels = names.get((cols, rows)) or [f"r{r}c{c}" for r in range(rows) for c in range(cols)]
    return cols, rows, [(labels[r * cols + c], c, r) for r in range(rows) for c in range(cols)]


def gray_frames(path, cols, rows, cw=192):
    """Decode the whole video to small grayscale frames: shape (n, rows*ch, cols*cw)."""
    info = probe(path)
    ch = round(cw * (info["height"] / rows) / (info["width"] / cols))
    W, H = cw * cols, ch * rows
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H},format=gray",
                          "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32), cw, ch


def loop_period(q, fps):
    n = len(q)
    lo, hi = max(2, int(0.5 * fps)), int(n * 0.7)
    if hi <= lo:
        return None
    scores = np.array([np.abs(q[:-lag] - q[lag:]).mean() for lag in range(lo, hi)])
    best = int(scores.argmin())
    lag = lo + best
    # a real loop is a sharp dip: much lower than the typical difference at other lags
    confident = scores[best] < 0.35 * float(np.median(scores))
    return {"frames": lag, "seconds": round(lag / fps, 3), "diff": round(float(scores[best]), 2),
            "median_diff": round(float(np.median(scores)), 2), "confident": bool(confident)}


def cuts(q, fps):
    d = np.abs(np.diff(q, axis=0)).mean(axis=(1, 2))
    thr = max(8.0, 4.0 * float(np.median(d)))
    out, prev = [], -10
    for i, v in enumerate(d):
        if v > thr:
            if i - prev > 3:  # collapse a burst of fast motion into its first frame
                out.append({"frame": i + 1, "t": round((i + 1) / fps, 3), "diff": round(float(v), 1)})
            prev = i
    return out


def sheet(path, out, crop, seconds, fps=8, width=400, cols=6, start=0.0):
    n = max(1, math.ceil(seconds * fps))
    rows = math.ceil(n / cols)
    vf = (f"crop={crop}," if crop else "") + f"fps={fps},scale={width}:-1,tile={cols}x{rows}:padding=4:color=red"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-t", str(seconds), "-i", path,
                    "-vf", vf, "-frames:v", "1", str(out)], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--grid", default="1x1", help="COLSxROWS of independent cells, e.g. 2x2")
    ap.add_argument("--out", default="study")
    ap.add_argument("--burst", nargs=3, metavar=("CELL", "START", "END"), help="frame strip of one cell between two times")
    ap.add_argument("--fps", type=float, default=20, help="frame rate for --burst strips")
    a = ap.parse_args()

    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    info = probe(a.video)
    cols, rows, cells = cells_for(a.grid)
    cw_px, ch_px = info["width"] // cols, info["height"] // rows
    crop_of = {name: f"{cw_px}:{ch_px}:{c * cw_px}:{r * ch_px}" for name, c, r in cells}

    if a.burst:
        name, s, e = a.burst[0], float(a.burst[1]), float(a.burst[2])
        dst = out / f"burst_{name}_{s:.2f}-{e:.2f}.png"
        sheet(a.video, dst, crop_of[name], e - s, fps=a.fps, width=240, cols=min(14, math.ceil((e - s) * a.fps)), start=s)
        print(f"strip: {dst}  ({a.fps:g} fps, frame k = {s:.2f}s + k/{a.fps:g})")
        return

    print(f"{a.video}: {info['width']}x{info['height']} @ {info['fps']:.3f} fps, {info['duration']:.3f}s, "
          f"{info['frames']} frames, audio={'yes' if info['audio'] else 'no'}")
    frames, cw, ch = gray_frames(a.video, cols, rows)
    summary = {"video": a.video, **info, "grid": a.grid, "cells": {}}
    for name, c, r in cells:
        q = frames[:, r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]
        lp, cs = loop_period(q, info["fps"]), cuts(q, info["fps"])
        period = lp["seconds"] if lp and lp["confident"] else info["duration"]
        sheet(a.video, out / f"cell_{name}.png", crop_of[name] if len(cells) > 1 else None, min(period, info["duration"]))
        summary["cells"][name] = {"crop": crop_of[name], "loop": lp, "cuts": cs}
        loop_txt = f"loops every {lp['seconds']}s" if lp and lp["confident"] else "no clear loop"
        print(f"  [{name}] {loop_txt}  (diff {lp['diff'] if lp else '-'} vs median {lp['median_diff'] if lp else '-'})")
        print(f"         cuts at: {', '.join(str(x['t']) for x in cs) or 'none'}")
    sheet(a.video, out / "overview.png", None, info["duration"], fps=2, width=480, cols=5)
    (out / "summary.json").write_text(json.dumps(summary, indent=2))
    print(f"wrote {out}/overview.png, cell_*.png, summary.json")


if __name__ == "__main__":
    main()
