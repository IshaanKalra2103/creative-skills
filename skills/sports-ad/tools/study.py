# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow", "numpy"]
# ///
"""Study a reference ad's editing with numbers: every cut and how long each shot holds, flash
and black frames, motion inside each shot, the pace (cuts per second over time), the
soundtrack's tempo and beat grid, and how many cuts land on a beat. Writes cuts.json and
cuts.jpg (each shot's first frame, labelled with frame, hold and beat). Then run label.py for
what each shot is (size, angle, camera move, subject, transition).
usage: uv run tools/study.py REF.mp4 OUT_DIR [--fps 30] [--k 3.5]
"""
import argparse, json, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument("ref")
ap.add_argument("out")
ap.add_argument("--fps", type=float, default=30)
ap.add_argument("--k", type=float, default=3.5, help="cut threshold over the local motion level")
ap.add_argument("--bpm", type=float, help="the tempo, if known: short excerpts can read as 2/3 or 3/2 of it")
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
fps = a.fps

# ---- picture
w, h = 48, 60
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", a.ref, "-vf", f"fps={fps},scale={w}:{h},format=gray",
                      "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
v = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
N = len(v)
d = np.abs(np.diff(v, axis=0)).mean((1, 2))
lum = v.mean((1, 2))
cuts = [0]
for i, x in enumerate(d):
    local = np.median(d[max(0, i - 8):i + 9])
    if x > max(6.0, a.k * local) and i + 1 - cuts[-1] >= 2:
        cuts.append(i + 1)
holds = [b - c for c, b in zip(cuts, cuts[1:] + [N])]
motion = [float(np.median(d[c:c + hl - 1])) if hl > 2 else 0.0 for c, hl in zip(cuts, holds)]
# sharpness per frame: whips and zoom-throughs blur, flashes go white, snaps stay sharp
g = np.abs(np.diff(v, axis=1)).mean((1, 2)) + np.abs(np.diff(v, axis=2)).mean((1, 2))
kinds = []
for c, hl in zip(cuts, holds):
    sl = slice(c, c + hl)
    around = np.median(g[max(0, c - 15):c + hl + 15])
    if v[sl].mean() > 200:
        kinds.append("flash")
    elif v[sl].mean() < 8:
        kinds.append("black")
    elif g[sl].mean() < 0.55 * around:
        kinds.append("blur")
    elif hl <= 4:
        kinds.append("snap")
    else:
        kinds.append("")
med_lum = float(np.median(lum))
flash = [i for i in range(1, N - 1) if lum[i] > 200 and lum[i] > lum[i - 1] + 40]
black = [i for i in range(N) if lum[i] < 8]

# ---- sound: onset envelope, tempo by autocorrelation, beat phase
bpm, beat0, on_beat = None, None, []
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", a.ref, "-vn", "-ac", "1", "-ar", "22050", "-f", "s16le", "-"],
                     capture_output=True).stdout
if len(pcm) > 22050 * 2:
    x = np.frombuffer(pcm, "<i2").astype(np.float32) / 32768
    hop, win = 512, 2048
    frames = np.lib.stride_tricks.sliding_window_view(x, win)[::hop] * np.hanning(win)
    mag = np.log1p(np.abs(np.fft.rfft(frames, axis=1)))
    flux = np.maximum(0, np.diff(mag, axis=0)).sum(1)
    flux = (flux - flux.mean()) / (flux.std() + 1e-9)
    sr_env = 22050 / hop
    ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
    lags = np.arange(len(ac))
    ok = (lags >= sr_env * 60 / 180) & (lags <= sr_env * 60 / 70)
    lag = lags[ok][np.argmax(ac[ok])]
    rough = 60 * sr_env / lag
    pos = np.arange(len(flux))

    def comb(b):
        """Best (mean onset strength on the grid, phase in s) for tempo b."""
        period = sr_env * 60 / b
        best = (-1e9, 0.0)
        for p in np.linspace(0, period, 64, endpoint=False):
            m = float(np.interp(np.arange(p, len(flux) - 1, period), pos, flux).mean())
            best = max(best, (m, p / sr_env))
        return best

    # refine the autocorrelation's tempo on a fine grid (or only find the phase of a given tempo)
    cands = [(comb(b), b) for b in ([a.bpm] if a.bpm else np.arange(rough * 0.96, rough * 1.04, 0.1))]
    (_, beat0), bpm = max(cands)
    bpm = round(float(bpm), 1)
    spb = 60 / bpm
    # flux at index i compares windows i and i+1: an onset shows about half a window plus a hop early
    beat0 = (beat0 + (win / 2 + hop) / 22050) % spb
    for c in cuts[1:]:
        t = c / fps
        off = (t - beat0) / spb
        on_beat.append(round((off - round(off)) * spb * fps, 1))  # frames off the nearest beat

print(f"{a.ref}: {N} frames ({N / fps:.2f} s), {len(cuts)} shots, average hold {np.mean(holds):.1f} frames "
      f"({np.mean(holds) / fps:.2f} s)")
if bpm:
    near = sum(abs(o) <= 2 for o in on_beat)
    print(f"tempo ~{bpm} bpm (a beat every {fps * 60 / bpm:.1f} frames), beats at {beat0:.2f} s + n x {60 / bpm:.3f} s; "
          f"{near}/{len(on_beat)} cuts within 2 frames of a beat")
print(f"flash frames: {flash or 'none'}   black frames: {len(black)}")
print("\n  cut  hold  motion  beat-off  kind")
for i, (c, hl, m, kd) in enumerate(zip(cuts, holds, motion, kinds)):
    bo = f"{on_beat[i - 1]:+5.1f}" if bpm and i else "     "
    print(f"{c:5d} {hl:5d} {m:7.1f}  {bo}    {kd:6} {'#' * min(hl, 50)}")
print("\npace (cuts per second):")
for sec in range(int(np.ceil(N / fps))):
    k = sum(sec * fps <= c < (sec + 1) * fps for c in cuts[1:])
    print(f"  {sec:3d}s {'|' * k}")
json.dump({"fps": fps, "frames": N, "cuts": cuts, "holds": holds, "kinds": kinds, "motion": motion, "flash": flash,
           "black": len(black), "bpm": bpm, "beat0": beat0, "cut_beat_offsets": on_beat},
          open(os.path.join(a.out, "cuts.json"), "w"), indent=1)

# ---- contact sheet of each shot's first frame
tmp = os.path.join(a.out, "cut_frames")
os.makedirs(tmp, exist_ok=True)
for f in os.listdir(tmp):
    os.remove(os.path.join(tmp, f))
sel = "+".join(f"eq(n\\,{c})" for c in cuts)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.ref, "-vf", f"fps={fps},select='{sel}',scale=240:-2",
                "-fps_mode", "passthrough", os.path.join(tmp, "%04d.jpg")], check=True)
tiles = [Image.open(os.path.join(tmp, f)).convert("RGB") for f in sorted(os.listdir(tmp))]
tw, th = tiles[0].size
cols = 10
sheet = Image.new("RGB", (cols * (tw + 4) + 4, -(-len(tiles) // cols) * (th + 4) + 4), (34, 34, 34))
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default(size=15)
for i, (c, hl, im) in enumerate(zip(cuts, holds, tiles)):
    x, y = 4 + (i % cols) * (tw + 4), 4 + (i // cols) * (th + 4)
    sheet.paste(im, (x, y))
    lab = f"{c} +{hl}" + (f"  b{on_beat[i - 1]:+.0f}" if bpm and i else "")
    draw.text((x + 6, y + 4), lab, fill="white", font=font, stroke_width=2, stroke_fill="black")
sheet.save(os.path.join(a.out, "cuts.jpg"), quality=88)
print(f"\nwrote {a.out}/cuts.json and {a.out}/cuts.jpg")
