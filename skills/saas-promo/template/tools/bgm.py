# /// script
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""An original, royalty-free "pumpy" promo bed synthesized from scratch, cut to the spec:
four-on-the-floor kick, claps, hats, a side-chained supersaw pad, sub bass and a pluck, a
noise riser into every `drop` and a whoosh on every scene cut, an impact on the end card.

    uv run tools/bgm.py examples/lumen/video.toml                # -> audio/bgm.wav, length = film
    uv run tools/bgm.py examples/lumen/video.toml --bpm 124 --key A --minor

Uses the spec's `video.bpm` (or --bpm) and scene layout (durations / beats, `at`). Scenes with
`drop = true` get a riser before them and the full beat from there on; before the first drop
the beat is filtered (intro)."""
import argparse, os, tomllib
import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter

SR = 48000
ap = argparse.ArgumentParser()
ap.add_argument("spec")
ap.add_argument("--bpm", type=float)
ap.add_argument("--key", default="A")
ap.add_argument("--minor", action="store_true")
ap.add_argument("--out", default=None)
ap.add_argument("--seed", type=int, default=7)
a = ap.parse_args()
spec = tomllib.load(open(a.spec, "rb"))
v = spec.get("video", {})
bpm = a.bpm or v.get("bpm", 0) or 120.0
beat = 60.0 / bpm
# scene layout (the engine's rules, without snapping)
t, cuts, drops, ends = 0.0, [], [], []
for i, s in enumerate(spec.get("scene", [])):
    at = s.get("at")   # a scene start; caption scenes use a list `at` for word times
    t0 = at if isinstance(at, (int, float)) else t
    dur = s["beats"] * beat if "beats" in s else s.get("dur", 2.0)
    if i:
        cuts.append(t0)
    if s.get("drop"):
        drops.append(t0)
    if s.get("kind") == "end":
        ends.append(t0)
    t = t0 + dur
length = v.get("end", t)
N = int(length * SR) + SR
rng = np.random.default_rng(a.seed)
L = np.zeros(N); R = np.zeros(N)

def lp(x, f, o=2):
    b, aa = butter(o, min(f / (SR / 2), 0.99)); return lfilter(b, aa, x)
def hp(x, f, o=2):
    b, aa = butter(o, min(f / (SR / 2), 0.99), "high"); return lfilter(b, aa, x)
def bp(x, lo, hi):
    b, aa = butter(2, [lo / (SR / 2), hi / (SR / 2)], "band"); return lfilter(b, aa, x)
def add(buf, x, at, g=1.0):
    i = int(at * SR)
    if i >= N or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), N - i); buf[i:i + n] += x[:n] * g

NOTES = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
root = 45 + NOTES.get(a.key.upper(), 9) - 9          # A2 = 45
prog = [0, -4, 3, -2] if a.minor else [0, 5, -3, 4]  # i-VI-III-VII / I-IV-vi-V-ish
def hz(m): return 440 * 2 ** ((m - 69) / 12)

first_drop = drops[0] if drops else 0.0
nbeats = int(length / beat) + 2
# side-chain envelope (ducks pad + bass on every kick)
duck = np.ones(N)
for b in range(nbeats):
    i = int(b * beat * SR); n = int(0.22 * SR)
    if i < N:
        e = 1 - 0.75 * np.exp(-np.linspace(0, 1, min(n, N - i)) * 4)
        duck[i:i + len(e)] = np.minimum(duck[i:i + len(e)], e)

# drums
tk = np.linspace(0, 0.35, int(0.35 * SR))
kick = np.sin(2 * np.pi * (45 * tk + 60 * (1 - np.exp(-tk * 30)) / 30)) * np.exp(-tk * 9)
clap = bp(rng.standard_normal(int(0.2 * SR)), 900, 3200) * np.exp(-np.linspace(0, 1, int(0.2 * SR)) * 14)
hat = hp(rng.standard_normal(int(0.05 * SR)), 7000) * np.exp(-np.linspace(0, 1, int(0.05 * SR)) * 30)
ohat = hp(rng.standard_normal(int(0.25 * SR)), 6000) * np.exp(-np.linspace(0, 1, int(0.25 * SR)) * 9)
for b in range(nbeats):
    tb = b * beat
    full = tb >= first_drop
    add(L, kick, tb, 0.9 if full else 0.45); add(R, kick, tb, 0.9 if full else 0.45)
    if full and b % 2 == 1:
        add(L, clap, tb, 0.35); add(R, clap, tb + 0.004, 0.35)
    for s16 in range(4):
        g = (0.10 if s16 % 2 else 0.06) * (1 if full else 0.5)
        add(L if s16 % 2 else R, hat, tb + s16 * beat / 4, g)
    if full:
        add(L, ohat, tb + beat / 2, 0.07); add(R, ohat, tb + beat / 2, 0.07)

# pad (detuned saws), sub bass, pluck arpeggio: one chord per bar
bar = 4 * beat
nbars = int(length / bar) + 2
pad_l = np.zeros(N); pad_r = np.zeros(N); bass = np.zeros(N); pluck = np.zeros(N)
for k in range(nbars):
    t0 = k * bar; n = int(bar * SR) + 1; tt = np.arange(n) / SR
    deg = prog[k % 4]
    chord = [root + 12 + deg, root + 12 + deg + (3 if a.minor else 4), root + 12 + deg + 7, root + 24 + deg]
    sl = np.zeros(n); sr_ = np.zeros(n)
    for j, m in enumerate(chord):
        for d in (-0.12, 0.0, 0.11):
            f = hz(m + d)
            saw = 2 * ((tt * f + rng.random()) % 1) - 1
            (sl if d <= 0 else sr_)[:] += saw / 9
    env = np.minimum(1, tt / 0.03) * np.minimum(1, (bar - tt) / 0.05)
    add(pad_l, sl * env, t0); add(pad_r, sr_ * env, t0)
    fb = hz(root - 12 + deg)
    add(bass, np.sin(2 * np.pi * fb * tt) * env, t0)
    for s8 in range(8):
        m = chord[[0, 1, 2, 3, 2, 1, 2, 3][s8]] + 12
        tp = np.arange(int(0.18 * SR)) / SR
        note = (2 * ((tp * hz(m)) % 1) - 1) * np.exp(-tp * 18)
        add(pluck, note, t0 + s8 * beat / 2)
cut_lp = np.where(np.arange(N) / SR < first_drop, 900.0, 4200.0)
pad_l = lp(pad_l, 2600) * duck; pad_r = lp(pad_r, 2600) * duck
intro = (np.arange(N) / SR) < first_drop
pad_l[intro] = lp(pad_l, 700)[intro]; pad_r[intro] = lp(pad_r, 700)[intro]
bass = lp(bass, 220) * duck
pluck = lp(pluck, 3800)
L += pad_l * 0.35 + bass * 0.45 + pluck * 0.08
R += pad_r * 0.35 + bass * 0.45 + pluck * 0.08

# risers into drops, whooshes on cuts, an impact on the end card
for d in drops:
    n = int(min(2 * bar, d) * SR)
    if n > 0:
        noise = rng.standard_normal(n)
        ramp = np.linspace(0, 1, n) ** 2
        rise = np.zeros(n)
        for c in range(8):
            seg_ = slice(c * n // 8, (c + 1) * n // 8)
            rise[seg_] = hp(noise[seg_], 300 + 900 * c)
        add(L, rise * ramp, d - n / SR, 0.18); add(R, rise[::-1][::-1] * ramp, d - n / SR, 0.18)
for c in cuts:
    n = int(0.35 * SR)
    w = bp(rng.standard_normal(n), 600, 5000) * np.sin(np.linspace(0, np.pi, n)) ** 2
    add(L, w, c - 0.2, 0.10); add(R, w, c - 0.19, 0.10)
for e in ends:
    ti = np.arange(int(1.5 * SR)) / SR
    boom = np.sin(2 * np.pi * (38 * ti + 40 * (1 - np.exp(-ti * 8)) / 8)) * np.exp(-ti * 3)
    add(L, boom, e, 0.8); add(R, boom, e, 0.8)

# fade out, normalise to about -14 LUFS-ish (RMS) with a -1 dB peak ceiling
fade = int(1.2 * SR)
end_i = int(length * SR)
for buf in (L, R):
    buf[end_i - fade:end_i] *= np.linspace(1, 0, fade)
    buf[end_i:] = 0
st = np.stack([L[:end_i], R[:end_i]], axis=1)
rms = np.sqrt(np.mean(st ** 2)) + 1e-9
st *= 10 ** (-16 / 20) / rms
st = np.tanh(st * 1.2) / 1.2
st *= 10 ** (-1 / 20) / max(np.abs(st).max(), 1e-9)
out = a.out or os.path.join(os.path.dirname(os.path.abspath(a.spec)), "audio", "bgm.wav")
os.makedirs(os.path.dirname(out), exist_ok=True)
sf.write(out, st, SR)
print(f"wrote {out}: {length:.2f} s at {bpm:g} bpm, {len(cuts)} cut whooshes, drops at {', '.join(f'{d:.2f}' for d in drops) or 'none'}")
