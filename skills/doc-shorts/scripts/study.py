# /// script
# dependencies = ["numpy", "pillow"]
# ///
"""Study a reference reel before rebuilding or borrowing from it.

uv run scripts/study.py <url-or-file> <out-dir>

Writes to <out-dir>:
  pin.mp4            the video (yt-dlp handles Pinterest, YouTube, X, Instagram...)
  f10/NNN.png        one frame per tick (10 per second), NNN = tick + 1, on the reel's own cadence phase
  sheets/t10_N.png   contact sheets, 3 s each (10 x 3 ticks)
  cuts.txt           hard cuts as ticks and seconds
  words.json         narration word timings (mlx-whisper)
  study.json         size, fps, duration, cadence (frames per drawing) and phase
The f10 frames are what `REF=<out>/f10 template/tools/cmp.sh` compares against.
"""
import json, pathlib, shutil, subprocess, sys, tempfile

import numpy as np
from PIL import Image


def run(*a, **k):
    return subprocess.run([str(x) for x in a], check=True, **k)


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    src, out = sys.argv[1], pathlib.Path(sys.argv[2]).resolve()
    out.mkdir(parents=True, exist_ok=True)
    vid = out / "pin.mp4"
    if not vid.exists():
        if pathlib.Path(src).exists():
            shutil.copy(src, vid)
        else:
            run("yt-dlp", "-q", "-o", out / "pin.%(ext)s", "--merge-output-format", "mp4", src)
    probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                       "stream=width,height,r_frame_rate,nb_frames", "-show_entries", "format=duration",
                                       "-of", "json", str(vid)], capture_output=True, text=True, check=True).stdout)
    st = probe["streams"][0]
    num, den = map(int, st["r_frame_rate"].split("/"))
    fps = num / den
    dur = float(probe["format"]["duration"])

    # cadence: luma difference between consecutive frames; on threes => changes on one phase of 3
    ydif = subprocess.run(["ffmpeg", "-i", str(vid), "-vf", "signalstats,metadata=print:key=lavfi.signalstats.YDIF:file=-",
                           "-an", "-f", "null", "-"], capture_output=True, text=True).stdout
    d = np.array([float(l.split("=")[1]) for l in ydif.splitlines() if "YDIF" in l])
    # frames per drawing = the most common gap between frames that change (the phase can drift
    # between sections of an edit, so count gaps rather than one global phase)
    idx = np.flatnonzero(d > 1.0)
    gaps = np.diff(idx)
    cadence = int(np.bincount(gaps[(gaps > 0) & (gaps < 6)]).argmax()) if len(gaps) else 1
    phase = int(np.bincount(idx % cadence).argmax()) if cadence > 1 else 0

    # one frame per tick: frame index phase + 3k on a 30 fps on-threes reel; generic: every fps/10
    step = max(1, round(fps / 10))
    first = 0  # tick k = frame 3k: inside the k-th drawing whatever the phase
    f10 = out / "f10"
    f10.mkdir(exist_ok=True)
    run("ffmpeg", "-v", "error", "-y", "-i", vid, "-vf", f"select='gte(n\\,{first})*not(mod(n-{first}\\,{step}))'",
        "-fps_mode", "vfr", f10 / "%03d.png")
    frames = sorted(f10.glob("*.png"))

    sheets = out / "sheets"
    sheets.mkdir(exist_ok=True)
    for i in range(0, len(frames), 30):
        run("ffmpeg", "-v", "error", "-y", "-start_number", i + 1, "-i", f10 / "%03d.png", "-vf",
            "scale=240:-1,tile=10x3:padding=4:color=white", "-frames:v", 1, "-update", 1, sheets / f"t10_{i // 30}.png")

    # likely hard cuts between consecutive tick frames (fast zooms show up too: it's a hint)
    cuts, prev = [], None
    for k, f in enumerate(frames):
        a = np.asarray(Image.open(f).convert("L").resize((90, 160))).astype(float)
        if prev is not None and np.abs(a - prev).mean() > 28:
            cuts.append(k)
        prev = a
    (out / "cuts.txt").write_text("\n".join(f"tick {k:4d}  {k / 10:6.1f}s" for k in cuts) + "\n")

    # narration
    words = []
    with tempfile.TemporaryDirectory() as tmp:
        wav = pathlib.Path(tmp) / "a.wav"
        if subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(vid), "-vn", "-ac", "1", "-ar", "16000", str(wav)]).returncode == 0:
            r = subprocess.run(["uvx", "--from", "mlx-whisper", "mlx_whisper", str(wav), "--model", "mlx-community/whisper-large-v3-turbo",
                                "--language", "en", "--word-timestamps", "True", "--output-format", "json", "--output-dir", tmp],
                               capture_output=True)
            if r.returncode == 0:
                j = json.loads((pathlib.Path(tmp) / "a.json").read_text())
                words = [{"w": w["word"].strip(), "s": round(w["start"], 3), "e": round(w["end"], 3)} for s in j["segments"] for w in s["words"]]
    (out / "words.json").write_text(json.dumps(words, indent=0))

    info = {"width": st["width"], "height": st["height"], "fps": fps, "duration": dur, "cadence": cadence, "phase": phase,
            "ticks": len(frames), "cuts": len(cuts), "words": len(words)}
    (out / "study.json").write_text(json.dumps(info, indent=1))
    print(json.dumps(info))
    print("narration:", " ".join(w["w"] for w in words))


if __name__ == "__main__":
    main()
