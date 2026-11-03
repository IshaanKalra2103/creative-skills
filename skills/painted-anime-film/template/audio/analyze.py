"""Measure every generated clip and the score, so place() offsets land transients on event frames.

usage: uv run analyze.py
For each sfx/*.mp3: length, peak, LUFS, onset (first 50 ms window within 25 dB of the max), time of max,
and a 10-bin envelope. For the score: RMS per section, using SHOTS from mix.py.
"""
import numpy as np, soundfile as sf, pyloudnorm as pyln
from pathlib import Path
from mix import SHOTS, DUR

def load(p):
    x, sr = sf.read(p, always_2d=True); return x.astype(np.float32), sr

def env(x, sr, win=0.05):
    m = x.mean(1); n = int(sr * win); k = len(m) // n
    return 20 * np.log10(np.sqrt((m[:k * n].reshape(k, n) ** 2).mean(1)) + 1e-9)

for p in sorted(Path('sfx').glob('*.mp3')):
    x, sr = load(p); e = env(x, sr); pk = e.max()
    on = np.argmax(e > pk - 25) * 0.05; tmax = e.argmax() * 0.05
    lufs = pyln.Meter(sr).integrated_loudness(x) if len(x) > sr * 0.5 else float('nan')
    sk = ' '.join(f'{b.max():4.0f}' for b in np.array_split(e, 10))
    print(f'{p.stem:16s} {len(x)/sr:5.2f}s peak {20*np.log10(np.abs(x).max()):5.1f}dBFS lufs {lufs:6.1f} onset {on:4.2f} max@{tmax:4.2f} | {sk}')
for sc in sorted(Path('.').glob('score_t*.mp3')):
    x, sr = load(sc); e = env(x, sr, 0.1)
    print(sc.name, 'LUFS', round(pyln.Meter(sr).integrated_loudness(x), 1), f'length {len(x)/sr:.2f}s (film {DUR:.2f}s)')
    bounds = [s for _, s in SHOTS] + [DUR]
    for (n, a), b in zip(SHOTS, bounds[1:]):
        s = e[int(a * 10):int(b * 10)]
        if len(s): print(f'  {n:10s} {a:5.1f}-{b:5.1f}  rms mean {s.mean():6.1f}  max {s.max():6.1f}')
