# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "pillow"]
# ///
"""Read a music track for the edit: its tempo, beat grid, bars (downbeats), the energy of every
bar, and the drops (a bar whose low end jumps after a quieter stretch, often right after a
beat of near silence). Prints the drops with their times, and with --at, where to start the
track so a drop lands on a given moment of the ad (for example the strike's contact frame):
`score.music.in` for ad.json. Writes track.json and track.png (energy per beat, drops marked).
usage: uv run tools/track.py MUSIC.mp3 [--out DIR] [--at 6.0] [--fps 30]
"""
import argparse, json, os, subprocess
import numpy as np
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("music")
ap.add_argument("--out", default=None)
ap.add_argument("--at", type=float, help="seconds into the ad where the drop should land")
ap.add_argument("--fps", type=float, default=30)
a = ap.parse_args()
out = a.out or os.path.dirname(os.path.abspath(a.music))
SR = 22050
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", a.music, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(pcm, "<i2").astype(np.float32) / 32768
dur = len(x) / SR
hop, win = 512, 2048
fr = np.lib.stride_tricks.sliding_window_view(x, win)[::hop] * np.hanning(win)
spec = np.abs(np.fft.rfft(fr, axis=1))
freqs = np.fft.rfftfreq(win, 1 / SR)
mag = np.log1p(spec)
flux = np.maximum(0, np.diff(mag, axis=0)).sum(1)
low_flux = np.maximum(0, np.diff(mag[:, freqs < 150], axis=0)).sum(1)
flux = (flux - flux.mean()) / (flux.std() + 1e-9)
env_sr = SR / hop
lat = (win / 2 + hop) / SR  # flux at frame i shows an onset about this early
pos = np.arange(len(flux))

# tempo: autocorrelation, refined by a comb over phase
ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
lags = np.arange(len(ac))
ok = (lags >= env_sr * 60 / 190) & (lags <= env_sr * 60 / 70)
rough = 60 * env_sr / lags[ok][np.argmax(ac[ok])]


def comb(b):
    period = env_sr * 60 / b
    best = (-1e9, 0.0)
    for p in np.linspace(0, period, 64, endpoint=False):
        best = max(best, (float(np.interp(np.arange(p, len(flux) - 1, period), pos, flux).mean()), p))
    return best


(_, ph), bpm = max((comb(b), b) for b in np.arange(rough * 0.96, rough * 1.04, 0.05))
spb = 60 / bpm
beat0 = (ph / env_sr + lat) % spb
beats = np.arange(beat0, dur, spb)

# downbeats: the beat phase (mod 4) with the strongest low-end onsets
lf = np.interp((beats - lat) * env_sr, pos, low_flux)
bar_off = int(np.argmax([lf[k::4].sum() for k in range(4)]))

# energy per beat: full band and low end (rms in dB)
rms = np.sqrt(np.mean(fr ** 2, axis=1)) + 1e-9
low = np.sqrt(np.mean(spec[:, freqs < 150] ** 2, axis=1)) + 1e-9
t_fr = (np.arange(len(fr)) * hop + win / 2) / SR


def per_beat(v):
    out = []
    for b in beats:
        m = (t_fr >= b) & (t_fr < b + spb)
        out.append(20 * np.log10(v[m].mean()) if m.any() else -120)
    return np.array(out)


e_all, e_low = per_beat(rms), per_beat(low)
# drops: on a downbeat, the next bar's low end well above the previous bar's
drops = []
for i in range(bar_off, len(beats) - 4, 4):
    if i < 4:
        continue
    before, after = e_low[i - 4:i].mean(), e_low[i:i + 4].mean()
    gap = e_low[i - 1] < np.median(e_low) - 15  # the bass out for the beat before (claps may keep going)
    jump = after - before
    if jump > 4 and after > np.median(e_low):
        drops.append({"t": round(float(beats[i]), 3), "beat": i, "jump_db": round(float(jump), 1), "gap_before": bool(gap)})
drops.sort(key=lambda d: -(d["jump_db"] + (4 if d["gap_before"] else 0)))

print(f"{a.music}: {dur:.1f} s, ~{bpm:.2f} bpm (a beat is {spb:.3f} s = {spb * a.fps:.2f} frames at {a.fps:g} fps), "
      f"first beat {beat0:.3f} s, downbeats every 4 from beat {bar_off}")
print("\ndrops (strongest first):")
for d in drops[:8]:
    line = f"  {d['t']:7.2f} s  beat {d['beat']:4d}  low end +{d['jump_db']:.1f} dB" + ("  after a gap" if d["gap_before"] else "")
    if a.at is not None:
        line += f"   -> score.music.in = {d['t'] - a.at:.3f}"
    print(line)
json.dump({"bpm": round(float(bpm), 3), "beat0": round(float(beat0), 4), "spb": spb, "bar_offset": bar_off,
           "beats": [round(float(b), 4) for b in beats], "energy_db": [round(float(v), 1) for v in e_all],
           "low_db": [round(float(v), 1) for v in e_low], "drops": drops},
          open(os.path.join(out, "track.json"), "w"), indent=1)

# picture: energy per beat, downbeats ticked, drops in orange
W, H = max(800, len(beats) * 5), 240
im = Image.new("RGB", (W, H), (16, 16, 16))
d = ImageDraw.Draw(im)
rng = {k: (np.percentile(v, 2), v.max()) for k, v in (("all", e_all), ("low", e_low))}
for i, (ea, el) in enumerate(zip(e_all, e_low)):
    x0 = i * W / len(beats)
    for v, k, c, off in ((ea, "all", (120, 120, 120), 0), (el, "low", (90, 140, 255), 1.5)):
        lo, hi = rng[k]
        hgt = (v - lo) / max(1e-6, hi - lo) * (H - 40)
        d.line((x0 + off, H - 20, x0 + off, H - 20 - max(0, hgt)), fill=c, width=1)
    if (i - bar_off) % 16 == 0:
        d.text((x0, H - 16), f"{beats[i]:.0f}s", fill=(160, 160, 160))
for dr in drops[:8]:
    x0 = dr["beat"] * W / len(beats)
    d.line((x0, 0, x0, H - 20), fill=(255, 122, 26), width=2)
im.save(os.path.join(out, "track.png"))
print(f"\nwrote {out}/track.json and track.png")
