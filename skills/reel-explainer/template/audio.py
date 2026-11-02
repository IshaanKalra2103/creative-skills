# /// script
# dependencies = ["numpy", "scipy"]
# ///
"""Film audio: synthesise the SFX cue list, duck the music under the VO, mix -> build/mix.wav

uv run render.py cues     # first: dumps window.SFX -> build/sfx_cues.json and window.FILM -> build/film.json
uv run audio.py [music_tag]
Works with whatever exists: no build/vo.wav -> no voice, no build/music_<tag>.mp3 -> no music (SFX only).
Mix settings (music gain, duck depth, end-card bass cut, fade) live in FILM.audio in film.js.
"""
import json, pathlib, subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
B = pathlib.Path(__file__).resolve().parent / "build"
FILM = json.loads((B / "film.json").read_text())
DUR = float(FILM["dur"])
AUD = {"musicGain": 0.3, "duck": 0.5, "bassCut": [], "fadeOut": [DUR - 1.9, DUR - 0.1], **FILM.get("audio", {})}
N = int(DUR * SR)
rng = np.random.default_rng(7)


def load(path):
    if not pathlib.Path(path).exists():
        print(f"(no {pathlib.Path(path).name}: silent)", file=sys.stderr); return np.zeros((N, 2), np.float32)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()
    out = np.zeros((N, 2), np.float32); out[:min(N, len(a))] = a[:N]
    return out


def env(n, a=0.002, d=0.08):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def sweep(f0, f1, dur, curve=1.0):
    n = int(dur * SR); k = np.linspace(0, 1, n) ** curve
    f = f0 * (f1 / f0) ** k
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def swish(dur, f0, f1, q=0.5):
    """noise through a moving band-pass (block-wise), sin envelope"""
    n = int(dur * SR); x = noise(dur); out = np.zeros(n); blk = 512
    for i in range(0, n, blk):
        k = i / n; fc = f0 * (f1 / f0) ** k
        seg = x[max(0, i - 2048):i + blk]
        y = bp(seg, max(40, fc * (1 - q)), min(SR / 2 - 100, fc * (1 + q)))
        out[i:i + blk] = y[-len(out[i:i + blk]):]
    return out * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5


def thud(f0=110, f1=45, dur=0.22, d=0.08):
    return sweep(f0, f1, dur, 0.5) * env(int(dur * SR), 0.001, d)


def click(f=2600, dur=0.03):
    n = int(dur * SR)
    return (np.sin(2 * np.pi * f * np.arange(n) / SR) * env(n, 0.0005, 0.006) * 0.7 + hp(noise(dur), 2000) * env(n, 0.0002, 0.003) * 0.6)


def add(*xs):
    out = np.zeros(max(len(x) for x in xs))
    for x in xs: out[:len(x)] += x
    return out


def synth(kind, dur=None):
    if kind == "pop":
        n = int(0.12 * SR); return add(sweep(1150, 360, 0.12, 0.6) * env(n, 0.001, 0.045), click(3000, 0.12) * 0.3)
    if kind == "blip":
        n = int(0.07 * SR); return sweep(1500, 1250, 0.07) * env(n, 0.001, 0.025) * 0.8
    if kind == "tick":
        return click(3400, 0.03) * 0.8
    if kind == "click":
        return add(click(2400, 0.05), thud(220, 120, 0.05, 0.015) * 0.5)
    if kind == "key":
        return add(click(2900, 0.05) * 0.9, thud(160, 90, 0.07, 0.02) * 0.7, bp(noise(0.05), 1500, 5000) * env(int(0.05 * SR), 0.0005, 0.01) * 0.4)
    if kind == "type":
        d = dur or 0.6; out = np.zeros(int((d + 0.1) * SR)); t = 0.0
        while t < d:
            k = click(2600 + rng.uniform(-500, 600), 0.03) * rng.uniform(0.4, 0.8); i = int(t * SR); out[i:i + len(k)] += k; t += rng.uniform(0.045, 0.08)
        return out
    if kind == "whoosh":
        return swish(0.42, 300, 3200) * 1.2
    if kind == "whoosh_down":
        return swish(0.45, 3200, 260) * 1.2
    if kind == "swoosh":
        return swish(0.24, 900, 4200) * 1.0
    if kind == "wipe":
        w = swish(0.34, 400, 3600) * 1.1; t = thud(90, 50, 0.3, 0.1) * 0.5; out = np.zeros(len(w)); out += w; out[:len(t)] += t; return out
    if kind == "flip":
        a = swish(0.12, 1500, 3500); out = np.zeros(int(0.3 * SR)); out[:len(a)] += a; out[int(0.13 * SR):int(0.13 * SR) + len(a)] += a * 0.7; return out
    if kind == "stamp":
        n = int(0.4 * SR); out = thud(130, 55, 0.4, 0.09) * 1.2
        out[:int(0.06 * SR)] += lp(noise(0.06), 1800) * env(int(0.06 * SR), 0.0005, 0.02) * 0.9; return out
    if kind == "fall":
        n = int(0.35 * SR); return sweep(1300, 260, 0.35, 0.7) * np.sin(np.pi * np.linspace(0, 1, n)) * 0.35
    if kind == "land":
        return add(thud(120, 42, 0.32, 0.1) * 1.3, click(1800, 0.32) * 0.3)
    if kind == "impact":
        n = int(1.2 * SR); b = sweep(140, 38, 1.2, 0.35) * env(n, 0.001, 0.35) * 1.4
        b[:int(0.08 * SR)] += lp(noise(0.08), 3000) * env(int(0.08 * SR), 0.0005, 0.03) * 0.8; return b
    if kind == "toggle":
        out = np.zeros(int(0.12 * SR)); a = click(1900, 0.04); c = click(2600, 0.04)
        out[:len(a)] += a; out[int(0.05 * SR):int(0.05 * SR) + len(c)] += c; return out
    if kind == "send":
        n = int(0.2 * SR); return add(sweep(480, 1500, 0.2, 1.4) * np.sin(np.pi * np.linspace(0, 1, n)) * 0.55, swish(0.2, 1200, 5000) * 0.5)
    if kind == "ding":
        n = int(1.0 * SR); t = np.arange(n) / SR
        return sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / dd) for f, a, dd in [(1318.5, 0.6, 0.5), (2637, 0.25, 0.3), (3955, 0.1, 0.15)]) * env(n, 0.002, 10)
    if kind == "shutter":
        out = np.zeros(int(0.15 * SR)); a = bp(noise(0.03), 2500, 7000) * env(int(0.03 * SR), 0.0005, 0.008)
        out[:len(a)] += a; out[int(0.07 * SR):int(0.07 * SR) + len(a)] += a * 0.8; return out * 1.3
    if kind == "riser":
        d = dur or 0.8; n = int(d * SR); k = np.linspace(0, 1, n)
        return add(sweep(220, 1400, d, 1.6) * 0.25 * k ** 2, swish(d, 600, 6000) * 0.8 * k[:int(d * SR)] ** 2)
    raise ValueError(kind)


GAIN = {"pop": 0.32, "blip": 0.22, "tick": 0.16, "click": 0.32, "key": 0.34, "type": 0.22, "whoosh": 0.3, "whoosh_down": 0.3,
        "swoosh": 0.26, "wipe": 0.32, "flip": 0.26, "stamp": 0.5, "fall": 0.3, "land": 0.5, "impact": 0.36, "toggle": 0.32,
        "send": 0.3, "ding": 0.22, "shutter": 0.3, "riser": 0.24}


def main(tag="a"):
    cues = json.loads((B / "sfx_cues.json").read_text())
    sfx = np.zeros((N, 2), np.float32)
    for i, c in enumerate(cues):
        y = synth(c["type"], c.get("dur")) * GAIN[c["type"]] * c.get("gain", 1)
        s = int(c["t"] * SR); y = y[:max(0, N - s)]
        pan = 0.5 + 0.18 * np.sin(i * 2.4)  # gentle stereo spread
        sfx[s:s + len(y), 0] += y * np.sqrt(1 - pan) * 1.41
        sfx[s:s + len(y), 1] += y * np.sqrt(pan) * 1.41
    vo = load(B / "vo.wav")
    mus = load(B / f"music_{tag}.mp3")
    # end card: bass + kick drop out under the tagline and come back on the final hit
    if AUD["bassCut"]:
        a, b = int(AUD["bassCut"][0] * SR), int(AUD["bassCut"][1] * SR)
        seg = mus[a:b].copy()
        for ch in range(2): seg[:, ch] = hp(hp(seg[:, ch], 420, 4), 420, 4)
        fade = int(0.06 * SR); w = np.ones(b - a); w[:fade] = np.linspace(0, 1, fade); w[-fade:] = np.linspace(1, 0, fade)
        mus[a:b] = mus[a:b] * (1 - w[:, None]) + seg * 0.8 * w[:, None]
    # tail: let the music ring out after the final hit, then fade
    tf = np.ones(N); f0, f1 = int(AUD["fadeOut"][0] * SR), int(AUD["fadeOut"][1] * SR); tf[f0:f1] = np.linspace(1, 0, f1 - f0) ** 1.5; tf[f1:] = 0
    mus *= tf[:, None]
    # duck under the VO: envelope follower (attack 25 ms, release 260 ms)
    lvl = np.abs(vo).mean(1); win = int(0.02 * SR)
    lvl = np.convolve(lvl, np.ones(win) / win, mode="same")
    gate = (lvl > 0.01).astype(np.float32)
    g = np.zeros(N, np.float32); x = 0.0; att, rel = 1 - np.exp(-1 / (0.025 * SR)), 1 - np.exp(-1 / (0.26 * SR))
    for i in range(0, N, 32):  # block-rate smoothing
        tgt = gate[i]; x += (tgt - x) * (att if tgt > x else rel) * 32; x = min(1, max(0, x)); g[i:i + 32] = x
    duck = 1 - AUD["duck"] * g  # 0.5 ≈ -6 dB under speech
    musd = mus * (AUD["musicGain"] * duck)[:, None]
    mix = vo * 1.0 + musd + sfx
    np.save(B / "stems.npy", np.stack([vo.mean(1), musd.mean(1), sfx.mean(1)]).astype(np.float32))
    # soft limit + normalise
    peak = max(1e-6, float(np.abs(mix).max()))
    mix = np.tanh(mix / peak * 1.2) / np.tanh(1.2) * 0.89
    out = B / "mix.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s16le", str(out)],
                   input=mix.astype(np.float32).tobytes(), check=True)
    print(json.dumps({"ok": True, "out": str(out), "cues": len(cues), "peak_in": float(peak)}))


if __name__ == "__main__":
    main(*(sys.argv[1:2] or ["a"]))
