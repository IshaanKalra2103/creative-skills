# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "pillow"]
# ///
"""Synthesize the ad's score on its beat grid (numpy, no samples): parts (intro, build, gap,
drop, outro, silence) placed on the timeline, an ambience bed, and sound effects tied to the
edit: a whoosh on every whip and zoom-through, an impact on every smash, flash and hit with
`flash` or `pop`, plus the ones listed in `score.sfx` (thump, net, studs, impact, whoosh,
subdrop, riser, swell, whistle). Cuts sit on beats when shot lengths are in beats, so the
music and the edit line up by construction. With `score.music` it lays a real track (Suno,
licensed) under the effects instead of synthesizing parts: `in` is the second of the track at
the ad's first frame (track.py --at prints it), `gain` in dB, `mute` drops it out for a beat.
Writes the WAV that ad.json `audio` names.
usage: uv run tools/score.py AD_DIR [--out score.wav] [--stems]
"""
import argparse, json, math, os, subprocess, sys, wave
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from adlib import Ad

SR = 48000
RNG = np.random.default_rng(7)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def env(n, attack, decay):
    t = np.arange(n) / SR
    a = np.minimum(1, t / max(attack, 1e-4))
    return a * np.exp(-t / max(decay, 1e-4))


def noise(n):
    return RNG.standard_normal(n).astype(np.float32)


def band(x, lo, hi, soft=0.15):
    """Band-pass by FFT mask with soft edges (hz)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        m *= 1 / (1 + np.exp(-(np.log(f + 1) - np.log(lo)) / soft))
    if hi < SR / 2:
        m *= 1 / (1 + np.exp((np.log(f + 1) - np.log(hi)) / soft))
    return np.fft.irfft(X * m, len(x)).astype(np.float32)


def sweep_band(x, lo0, lo1, hi0, hi1, frame=2048, hop=512):
    """Time-varying band-pass (STFT): the band moves from (lo0, hi0) to (lo1, hi1)."""
    win = np.hanning(frame).astype(np.float32)
    n = len(x)
    pad = np.concatenate([np.zeros(frame), x, np.zeros(frame)]).astype(np.float32)
    out = np.zeros_like(pad)
    norm = np.zeros_like(pad)
    f = np.fft.rfftfreq(frame, 1 / SR)
    starts = range(0, len(pad) - frame, hop)
    for i, st in enumerate(starts):
        t = min(1, max(0, (st - frame) / max(1, n)))
        lo, hi = lo0 * (lo1 / lo0) ** t, hi0 * (hi1 / hi0) ** t
        m = 1 / (1 + np.exp(-(np.log(f + 1) - np.log(lo)) / 0.12)) / (1 + np.exp((np.log(f + 1) - np.log(hi)) / 0.12))
        seg = np.fft.irfft(np.fft.rfft(pad[st:st + frame] * win) * m, frame)
        out[st:st + frame] += seg * win
        norm[st:st + frame] += win ** 2
    out = out / np.maximum(norm, 1e-3)
    return out[frame:frame + n]


def tone(freqs, n, wave_="sine"):
    """An oscillator following a per-sample frequency array (or a constant)."""
    f = np.broadcast_to(np.asarray(freqs, np.float64), (n,))
    ph = 2 * np.pi * np.cumsum(f) / SR
    if wave_ == "saw":
        return (2 * ((ph / (2 * np.pi)) % 1) - 1).astype(np.float32)
    return np.sin(ph).astype(np.float32)


# ---------------------------------------------------------------- instruments

def kick(level=1.0):
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    body = tone(42 + 120 * np.exp(-t * 28), n) * env(n, 0.001, 0.32)
    click = band(noise(n), 1500, 9000) * env(n, 0.0005, 0.004) * 0.6
    return np.tanh(1.6 * (body + click)) * level


def clap(level=0.6):
    n = int(0.45 * SR)
    x = np.zeros(n, np.float32)
    for d in (0, 0.011, 0.023):
        k = int(d * SR)
        x[k:] += noise(n - k) * env(n - k, 0.0005, 0.012 if d < 0.02 else 0.12)
    return band(x, 900, 5000) * level


def hat(open_=False, level=0.25):
    n = int((0.25 if open_ else 0.06) * SR)
    return band(noise(n), 7000, 18000) * env(n, 0.0005, 0.09 if open_ else 0.018) * level


def bass(note, dur, level=0.55):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(note) * (1 + 0.9 * np.exp(-t * 40))
    x = tone(f, n) + 0.25 * tone(2 * f, n)
    return np.tanh(2.2 * x * env(n, 0.003, dur * 0.9)) * level


def pad(notes, dur, level=0.18, bright=900):
    n = int(dur * SR)
    x = np.zeros((2, n), np.float32)
    for note in notes:
        for ch, det in enumerate((-0.07, 0.07)):
            for d in (det, -det / 2):
                x[ch] += tone(midi(note + d), n, "saw")
    a = np.minimum(1, np.arange(n) / (0.35 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.2 * SR))
    return np.stack([band(c, 60, bright) for c in x]) * a * level / len(notes)


def stab(notes, level=0.22):
    n = int(0.35 * SR)
    x = sum(tone(midi(m), n, "saw") for m in notes) / len(notes)
    return band(np.tanh(3 * x), 120, 3500) * env(n, 0.002, 0.09) * level


# ---------------------------------------------------------------- effects

def impact(level=0.9):
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    boom = tone(30 + 55 * np.exp(-t * 6), n) * env(n, 0.002, 0.7)
    crack = band(noise(n), 300, 6000) * env(n, 0.001, 0.05) * 0.7
    return np.tanh(1.8 * (boom + crack)) * level


def whoosh(dur=0.45, level=0.5):
    n = int(dur * SR)
    x = sweep_band(noise(n), 300, 2500, 1200, 9000)
    bell = np.sin(np.linspace(0, np.pi, n)) ** 2
    return x * bell * level


def thump(level=0.9):
    """A ball struck clean: a short low punch and a leather slap."""
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    body = tone(70 + 90 * np.exp(-t * 60), n) * env(n, 0.0005, 0.07)
    slap = band(noise(n), 800, 4000) * env(n, 0.0003, 0.012) * 0.8
    return np.tanh(2.5 * (body + slap)) * level


def net(level=0.5):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    rustle = band(noise(n), 1800, 9000) * env(n, 0.01, 0.28)
    flutter = 0.6 + 0.4 * np.sin(2 * np.pi * 26 * t) * np.exp(-t * 4)
    return rustle * flutter * level


def studs(dur, rate=6.0, level=0.35):
    """Studs biting wet turf, `rate` steps a second."""
    n = int(dur * SR)
    x = np.zeros(n, np.float32)
    step = int(SR / rate)
    for k in range(0, n, step):
        m = min(n - k, int(0.09 * SR))
        x[k:k + m] += band(noise(m), 400, 3500) * env(m, 0.001, 0.025) * RNG.uniform(0.6, 1.0)
    return x * level


def riser(dur, level=0.35):
    n = int(dur * SR)
    x = sweep_band(noise(n), 200, 3000, 1200, 14000)
    t = np.linspace(0, 1, n)
    sine = tone(180 * 7 ** t, n) * 0.25
    return (x + sine) * t ** 2.2 * level


def swell(dur, level=0.4):
    """Reverse cymbal into a hit."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    return band(noise(n), 4000, 16000) * t ** 3 * level


def subdrop(level=0.7):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    return np.tanh(1.5 * tone(28 + 50 * np.exp(-t * 2.5), n) * env(n, 0.005, 0.9)) * level


def whistle(level=0.25):
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    trill = 1 + 0.02 * np.sign(np.sin(2 * np.pi * 32 * t))
    return tone(2900 * trill, n) * env(n, 0.01, 0.5) * level


def bed(kind, n):
    """Ambience under everything: rain, crowd, city, room, wind, or none."""
    if kind == "rain":
        x = np.stack([band(noise(n), 900, 9000) for _ in range(2)]) * 0.05
        for k in RNG.integers(0, n - 2000, int(n / SR * 14)):
            x[:, k:k + 2000] += band(noise(2000), 2500, 12000) * env(2000, 0.0002, 0.004) * RNG.uniform(0.05, 0.18)
        return x
    if kind == "crowd":
        t = np.arange(n) / SR
        swell_ = 0.7 + 0.3 * np.sin(2 * np.pi * 0.11 * t)
        return np.stack([band(noise(n), 250, 2500) for _ in range(2)]) * 0.06 * swell_
    if kind in ("wind", "city", "room"):
        lo, hi, lv = {"wind": (80, 900, 0.07), "city": (60, 1500, 0.05), "room": (100, 600, 0.03)}[kind]
        return np.stack([band(noise(n), lo, hi) for _ in range(2)]) * lv
    return np.zeros((2, n), np.float32)


def reverb(x, secs=1.8, decay=0.45):
    """Stereo reverb: FFT convolution with decaying noise."""
    n = int(secs * SR)
    t = np.arange(n) / SR
    out = []
    for ch in range(2):
        ir = noise(n) * np.exp(-t / decay)
        ir = band(ir, 200, 7000)
        ir /= np.sqrt((ir ** 2).sum())
        L = len(x) + n
        out.append(np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[:len(x)])
    return np.stack(out).astype(np.float32)


# ---------------------------------------------------------------- arrangement

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ad")
    ap.add_argument("--out")
    ap.add_argument("--stems", action="store_true", help="also write each bus")
    a = ap.parse_args()
    ad = Ad(a.ad)
    sc = ad.data.get("score", {})
    if not ad.bpm:
        raise SystemExit("score.py needs `bpm` in ad.json")
    beat = 60 / ad.bpm
    total = ad.N / ad.fps + float(sc.get("tail", 0.5))
    n = int(total * SR)
    bus = {k: np.zeros((2, n), np.float32) for k in ("drums", "bass", "music", "fx", "bed", "send")}

    def put(name, x, t, pan=0.0, send=0.0):
        k = int(t * SR)
        if k >= n or k + (x.shape[-1]) <= 0:
            return
        x = np.asarray(x, np.float32)
        st = x if x.ndim == 2 else np.stack([x * math.sqrt(0.5 - pan / 2) * 1.41, x * math.sqrt(0.5 + pan / 2) * 1.41])
        st = st[:, max(0, -k): n - k] if k < 0 else st[:, : n - k]
        k = max(0, k)
        bus[name][:, k:k + st.shape[1]] += st
        if send:
            bus["send"][:, k:k + st.shape[1]] += st * send

    music = sc.get("music")
    if music:
        # a real track (licensed, or made in Suno): `in` is where the ad's first frame falls in it
        pcm = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(max(0.0, float(music.get("in", 0)))), "-i", ad.path(music["file"]),
                              "-t", f"{total:.3f}", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(pcm, "<f4").reshape(-1, 2).T * 10 ** (music.get("gain", 0) / 20)
        lead = int(max(0.0, -float(music.get("in", 0))) * SR)  # a negative `in` starts the track after the first frame
        m = min(n - lead, x.shape[1])
        bus["music"][:, lead:lead + m] += x[:, :m]
        for cut_ in music.get("mute", []):  # drop the track out, e.g. a beat of silence before the drop
            i0, i1 = (int(ad.when(cut_["at"]) / ad.fps * SR), int((ad.when(cut_["at"]) + ad.frames(cut_["len"])) / ad.fps * SR))
            r = int(0.006 * SR)
            g = np.ones(n, np.float32)
            g[i0:i1] = 0
            g[max(0, i0 - r):i0] = np.linspace(1, 0, min(r, i0))
            g[i1:i1 + r] = np.linspace(0, 1, len(g[i1:i1 + r]))
            bus["music"] *= g
    root = sc.get("root", 38)  # D2
    minor = [0, 3, 7, 10]
    prog = [(0, minor), (8, [0, 4, 7, 11])]  # i, bVI
    parts = sorted(({"t": ad.when(p["at"]) / ad.fps, **p}
                    for p in sc.get("parts", [] if music else [{"at": 0, "kind": "drop"}])), key=lambda p: p["t"])
    kicks = []
    for i, p in enumerate(parts):
        t0 = p["t"]
        t1 = parts[i + 1]["t"] if i + 1 < len(parts) else ad.N / ad.fps
        kind = p["kind"]
        b0 = math.ceil(t0 / beat - 1e-6)
        beats = [b for b in range(b0, int(t1 / beat + 1e-6) + 1) if b * beat < t1 - 1e-6]
        if kind == "intro":
            put("music", pad([root + 12 + m for m in minor], t1 - t0 + 0.4, 0.16, 700), t0, send=0.3)
            for b in beats:
                if b % 2 == 0:
                    put("drums", kick(0.75), b * beat)
                    kicks.append(b * beat)
        elif kind == "build":
            put("music", pad([root + 12 + m for m in minor], t1 - t0, 0.14, 1400), t0, send=0.2)
            for b in beats:
                put("drums", kick(0.9), b * beat)
                kicks.append(b * beat)
                put("drums", hat(level=0.18), (b + 0.5) * beat, pan=0.3)
            last = [b for b in beats if b * beat >= t1 - 4 * beat]
            for b in last:
                for s16 in range(4):
                    put("drums", clap(0.18 + 0.25 * (b * beat - (t1 - 4 * beat)) / (4 * beat)), (b + s16 / 4) * beat, send=0.2)
            put("fx", riser(t1 - t0), t0, send=0.3)
        elif kind == "gap":
            put("fx", swell(t1 - t0 + 0.02), t0, send=0.5)
        elif kind == "drop":
            for b in beats:
                bar = (b - b0) // 4
                off, chord = prog[bar % 2]
                put("drums", kick(1.0), b * beat)
                kicks.append(b * beat)
                if b % 2 == 1:
                    put("drums", clap(0.6), b * beat, send=0.35)
                for s16 in range(4):
                    put("drums", hat(open_=(s16 == 2), level=0.22 if s16 % 2 == 0 else 0.13), (b + s16 / 4) * beat, pan=0.25)
                patt = (1, 0, 0, 1, 0, 0, 1, 0)  # 808 on eighths across the bar
                for half in (0, 1):
                    if patt[(b - b0) % 4 * 2 + half]:
                        put("bass", bass(root + off, beat * 0.9), (b + half / 2) * beat)
                if (b - b0) % 4 == 0:
                    put("music", stab([root + 24 + off + m for m in chord]), b * beat, send=0.4)
            put("music", pad([root + 12 + m for m in minor], t1 - t0, 0.1, 1800), t0, send=0.2)
            put("fx", impact(0.8), t0, send=0.4)
        elif kind == "outro":
            put("music", pad([root + 12 + m for m in minor] + [root + 26], t1 - t0 + 1.5, 0.17, 1100), t0, send=0.5)
            put("fx", subdrop(0.7), t0)
        # "silence": nothing
    # sound effects from the edit
    if sc.get("auto", True):
        for i, s in enumerate(ad.shots[:-1]):
            o = s.get("out", {})
            tc = (s["_start"] + s["_len"]) / ad.fps
            if o.get("type") in ("whip", "zoom"):
                d = ad.frames(o.get("len", 4)) / ad.fps
                put("fx", whoosh(max(0.25, d * 2.2), 0.45), tc - max(0.25, d * 2.2) / 2,
                    pan=-0.5 if o.get("dir", "left") == "left" else 0.5, send=0.2)
            if o.get("type") in ("smash", "flash"):
                put("fx", impact(0.55), tc, send=0.4)
            for h in s.get("hits", []):
                if set(h["fx"].split()) & {"flash", "pop"}:
                    put("fx", impact(0.6 * h.get("amt", 1)), (s["_start"] + ad.local(s, h["at"])) / ad.fps, send=0.4)
    fx = {"thump": thump, "net": net, "impact": impact, "subdrop": subdrop, "whistle": whistle}
    for e in sc.get("sfx", []):
        t = ad.when(e["at"]) / ad.fps
        kind = e["kind"]
        lv = e.get("level")
        if kind in fx:
            put("fx", fx[kind]() * (lv or 1), t, pan=e.get("pan", 0), send=e.get("send", 0.25))
        elif kind == "studs":
            put("fx", studs(ad.frames(e.get("len", "1b")) / ad.fps, e.get("rate", 6)) * (lv or 1), t, pan=e.get("pan", 0))
        elif kind == "whoosh":
            put("fx", whoosh(e.get("dur", 0.45), lv or 0.5), t - e.get("dur", 0.45) / 2, pan=e.get("pan", 0), send=0.2)
        elif kind in ("riser", "swell"):
            d = ad.frames(e["len"]) / ad.fps
            put("fx", (riser if kind == "riser" else swell)(d) * (lv or 1), t - d, send=0.3)
    bus["bed"] += bed(sc.get("bed", "none"), n) * sc.get("bed_level", 1.0)

    # sidechain: music and bass duck under each kick
    duck = np.ones(n, np.float32)
    rel = np.exp(-np.arange(int(0.22 * SR)) / (0.07 * SR))
    for k in kicks:
        i = int(k * SR)
        m = min(n - i, len(rel))
        if m > 0:
            duck[i:i + m] = np.minimum(duck[i:i + m], 1 - 0.65 * rel[:m])
    if not music:
        bus["music"] *= duck
    bus["bass"] *= duck
    wet = reverb(bus["send"].mean(0), 2.2, 0.55) * 0.5
    fx_gain = 10 ** (sc.get("fx_gain", -4 if music else 0) / 20)  # effects sit under a full track
    mix = bus["drums"] + bus["bass"] + bus["music"] + (bus["fx"] + wet) * fx_gain + bus["bed"]
    # fade the tail, soft clip, -1 dBFS
    fade = int(float(sc.get("tail", 0.5)) * SR)
    if fade:
        mix[:, -fade:] *= np.linspace(1, 0, fade)
    if music:  # a mastered track: just catch the peaks the effects add
        mix *= 0.89 / max(0.89, np.abs(mix).max())
    else:
        mix = np.tanh(1.3 * mix) / np.tanh(1.3)
        mix *= 0.89 / max(1e-6, np.abs(mix).max())
    out = ad.path(a.out or ad.data.get("audio", "score.wav"))
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    write(out, mix)
    if a.stems:
        for k, v in bus.items():
            write(out.replace(".wav", f"_{k}.wav"), v / max(1e-6, np.abs(v).max()) * 0.8)
    print(f"wrote {out}: {total:.2f} s at {ad.bpm} bpm, {len(parts)} parts, {len(kicks)} kicks")


def write(path, x):
    pcm = (np.clip(x.T, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main()
