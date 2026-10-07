"""Synthesizes the MOCHI sting's sounds into media/ (all original, nothing sampled).

uv run --with numpy python tools/gen_audio.py media
"""

import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def write(path: Path, x: np.ndarray, peak_db: float = -3.0) -> None:
    x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)
    data = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def t_axis(sec: float) -> np.ndarray:
    return np.arange(int(sec * SR)) / SR


def env(n: int, attack: float, release: float) -> np.ndarray:
    a = max(1, int(attack * SR))
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    e *= np.exp(-np.arange(n) / SR / release)
    e[-64:] *= np.linspace(1, 0, 64)
    return e


def chirp(f0: float, f1: float, sec: float, curve: float = 3.0) -> np.ndarray:
    t = t_axis(sec)
    f = f1 + (f0 - f1) * np.exp(-t * curve / sec * 3)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def bandnoise(sec: float, lo_hz: np.ndarray, hi_hz: np.ndarray) -> np.ndarray:
    """Noise through a time-varying one-pole band (cheap, good enough for whooshes)."""
    n = int(sec * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    lp = hp = 0.0
    a_lo = 1 - np.exp(-2 * np.pi * lo_hz / SR)
    a_hi = 1 - np.exp(-2 * np.pi * hi_hz / SR)
    for i in range(n):
        lp += a_hi[i] * (x[i] - lp)  # low-pass at hi
        hp += a_lo[i] * (lp - hp)  # subtract a low-pass at lo -> band
        out[i] = lp - hp
    return out


def pluck(freq: float, sec: float, bright: float = 0.5) -> np.ndarray:
    """Karplus-Strong pluck."""
    n = int(sec * SR)
    p = int(SR / freq)
    buf = rng.uniform(-1, 1, p)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        nxt = buf[(i + 1) % p]
        buf[i % p] = 0.996 * (bright * buf[i % p] + (1 - bright) * 0.5 * (buf[i % p] + nxt))
    return out * env(n, 0.002, sec * 0.6)


def note(midi: int) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def main(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)

    # whoosh: band sweeping up, swelling then cut
    sec = 0.4
    t = t_axis(sec)
    lo = 300 + 1500 * (t / sec) ** 1.5
    hi = 1200 + 5000 * (t / sec) ** 1.2
    w = bandnoise(sec, lo, hi) * np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 1.5
    write(out / "whoosh.wav", w, -4)

    # pop: a quick pitch drop blip
    sec = 0.09
    x = chirp(1600, 500, sec, 4) * env(int(sec * SR), 0.001, 0.025)
    write(out / "pop.wav", x, -4)

    # bloops: one per letter, rising pentatonic, a rubbery pitch bend up
    for i, m in enumerate([67, 69, 72, 74, 76]):
        sec = 0.22
        t = t_axis(sec)
        f = note(m) * (0.6 + 0.4 * (1 - np.exp(-t * 40)))
        x = np.sin(2 * np.pi * np.cumsum(f) / SR)
        x += 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
        write(out / f"bloop{i}.wav", x * env(len(t), 0.003, 0.07), -4)

    # splat: low thud with a wet noise tail
    sec = 0.25
    t = t_axis(sec)
    thud = chirp(220, 70, sec, 5) * env(len(t), 0.001, 0.06)
    wet = bandnoise(sec, np.full(len(t), 400.0), np.full(len(t), 2500.0)) * env(len(t), 0.001, 0.04)
    write(out / "splat.wav", thud + 0.5 * wet, -4)

    # slurp: a long rising, wobbling suction
    sec = 1.05
    t = t_axis(sec)
    wob = 1 + 0.25 * np.sin(2 * np.pi * 9 * t)
    lo = (250 + 900 * (t / sec) ** 2) * wob
    hi = (900 + 3500 * (t / sec) ** 2) * wob
    x = bandnoise(sec, lo, hi)
    tone = np.sin(2 * np.pi * np.cumsum(180 + 500 * (t / sec) ** 2) / SR) * 0.25
    shape = np.clip(t / 0.15, 0, 1) * np.clip((sec - t) / 0.05, 0, 1) * (0.5 + 0.5 * t / sec)
    write(out / "slurp.wav", (x + tone) * shape, -4)

    # gulp: two low bubbles
    sec = 0.2
    t = t_axis(sec)
    g = chirp(160, 320, 0.1, 2)
    x = np.concatenate([g, 0.8 * g])[: len(t)] * env(len(t), 0.002, 0.08)
    write(out / "gulp.wav", x, -4)

    # boing: a spring with vibrato
    sec = 0.6
    t = t_axis(sec)
    f = 140 + 260 * (1 - np.exp(-t * 8)) + 40 * np.sin(2 * np.pi * 14 * t) * np.exp(-t * 4)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.2)
    write(out / "boing.wav", x, -4)

    # sparkle: a quick bell arpeggio
    sec = 0.9
    t = t_axis(sec)
    x = np.zeros(len(t))
    for k, m in enumerate([84, 88, 91, 96]):
        s0 = int(k * 0.06 * SR)
        n = len(t) - s0
        tt = np.arange(n) / SR
        bell = np.sin(2 * np.pi * note(m) * tt) + 0.4 * np.sin(2 * np.pi * note(m) * 2.76 * tt)
        x[s0:] += bell * np.exp(-tt / 0.18)
    write(out / "sparkle.wav", x, -4)

    # music bed: 5.5 s of plucked arpeggios, I - vi - IV - V at 120 bpm, light kick on beats
    sec = 5.6
    n = int(sec * SR)
    bed = np.zeros(n)
    chords = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]]
    eighth = 0.25
    for step in range(int(sec / eighth)):
        chord = chords[(step // 6) % 4]
        m = chord[[0, 1, 2, 3, 2, 1][step % 6]] + 12
        s0 = int(step * eighth * SR)
        p = pluck(note(m), 0.6, 0.35)
        bed[s0 : s0 + len(p)] += p[: n - s0] * (0.8 if step % 2 else 1.0)
        if step % 2 == 0:
            k = chirp(120, 45, 0.18, 4) * env(int(0.18 * SR), 0.001, 0.05)
            bed[s0 : s0 + len(k)] += 0.7 * k[: n - s0]
    write(out / "bed.wav", bed, -3)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
