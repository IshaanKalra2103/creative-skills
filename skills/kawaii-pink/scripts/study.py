"""Measurements for scripts/study.sh: palette, ink coverage and bounds per frame, frame-to-frame
change (alternating big/small = animated on twos), and the audio loudness envelope.

uv run --with pillow python -I study.py <out-dir>
"""

import math
import struct
import sys
import wave
from collections import Counter
from pathlib import Path

from PIL import Image, ImageChops


def pixels(im):
    return im.get_flattened_data() if hasattr(im, "get_flattened_data") else im.getdata()


out = Path(sys.argv[1])
frames = sorted((out / "f").glob("*.png"))
fps = 30.0
for line in (out / "probe.txt").read_text().splitlines():
    if "codec_type=video" in line and "r_frame_rate=" in line:
        num, den = line.split("r_frame_rate=")[1].split("|")[0].split("/")
        fps = float(num) / float(den)

# palette of a frame in the middle
mid = Image.open(frames[len(frames) // 2]).convert("RGB")
print("palette (middle frame, most common):")
for col, n in Counter(pixels(mid)).most_common(10):
    print(f"  #{col[0]:02x}{col[1]:02x}{col[2]:02x}  {n}")

# ink = the most saturated common colour
def sat(c):
    return max(c) - min(c)

ink = max(Counter(pixels(mid)).most_common(40), key=lambda kv: sat(kv[0]) * math.log(kv[1] + 1))[0]
print(f"ink guess: #{ink[0]:02x}{ink[1]:02x}{ink[2]:02x}\n")

print("per frame (every 3rd): ink pixels at 270px, bounds in full-res coords")
scale = mid.width / 270
for i in range(0, len(frames), 3):
    im = Image.open(frames[i]).convert("RGB").resize((270, 270))
    px = im.load()
    xs, ys = [], []
    for y in range(270):
        for x in range(270):
            r, g, b = px[x, y]
            if abs(r - ink[0]) + abs(g - ink[1]) + abs(b - ink[2]) < 120:
                xs.append(x)
                ys.append(y)
    bb = tuple(int(v * scale) for v in (min(xs), min(ys), max(xs), max(ys))) if xs else None
    print(f"  f{i + 1:03d} {i / fps:5.2f}s ink={len(xs):5d} bbox={bb}")

print("\nchange from the previous frame (pixels > 40 at 360px); big/small alternating = on twos")
prev = None
row = []
for i, f in enumerate(frames):
    im = Image.open(f).convert("L").resize((360, 360))
    if prev is not None:
        d = ImageChops.difference(im, prev).point(lambda v: 255 if v > 40 else 0)
        row.append(f"{i + 1}:{sum(1 for v in pixels(d) if v)}")
    prev = im
for k in range(0, len(row), 12):
    print("  " + " ".join(row[k : k + 12]))

wav = out / "audio.wav"
if wav.exists():
    print("\naudio envelope (50 ms): dB and zero-crossing pitch guess")
    w = wave.open(str(wav))
    n, sr = w.getnframes(), w.getframerate()
    d = struct.unpack(f"<{n}h", w.readframes(n))
    hop = sr // 20
    for i in range(0, n, hop):
        blk = d[i : i + hop]
        rms = math.sqrt(sum(x * x for x in blk) / max(1, len(blk))) / 32768
        db = 20 * math.log10(rms + 1e-9)
        zc = sum(1 for a, b in zip(blk, blk[1:]) if (a < 0) != (b < 0)) / max(1, len(blk)) * sr / 2
        print(f"  {i / sr:5.2f}s {db:6.1f} dB {zc:5.0f} Hz " + "#" * max(0, int((db + 60) / 1.5)))
