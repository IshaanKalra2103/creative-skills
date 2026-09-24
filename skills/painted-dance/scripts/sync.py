# /// script
# dependencies = ["librosa", "numpy"]
# ///
"""Find the beat grid of a local track and print the ?bpm=&offset= for a painted-dance page.

    uv run sync.py track.mp3 [start_seconds]

Grid-searches beat period and phase to maximise kick-drum onset energy (low band) on the grid,
which is steadier than librosa's tempo estimate on four-on-the-floor pop. start_seconds starts the
film at the first beat after that point (e.g. the chorus).
"""
import sys
import warnings

import librosa
import numpy as np

warnings.filterwarnings("ignore")
path = sys.argv[1]
start = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
y, sr = librosa.load(path, sr=22050, mono=True, offset=0, duration=start + 80)
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=128))
f = librosa.fft_frequencies(sr=sr, n_fft=2048)
kick = np.r_[0, np.maximum(0, np.diff(np.log1p(S[f < 120].sum(0))))]
tm = librosa.frames_to_time(np.arange(len(kick)), sr=sr, hop_length=128)
lo, hi = start + 5, start + 75


def score(P, t0):
    g = t0 + np.arange(0, 400) * P
    g = g[(g > lo) & (g < hi)]
    return np.interp(g, tm, kick).mean()


# coarse search over 90–150 BPM, then refine around the winner
cands = ((score(P, ph * P), P, ph * P) for P in np.arange(0.40, 0.667, 0.0005) for ph in np.linspace(0, 1, 40, endpoint=False))
_, P, t0 = max(cands)
_, P, t0 = max((score(p, t0 + d), p, t0 + d) for p in np.arange(P - .002, P + .002, .00005) for d in np.arange(-.03, .03, .003))
# strongest kick phase of the four → downbeat
k0 = int(np.ceil((start - t0) / P))
e = [np.mean([np.interp(t0 + (k0 + 4 * n + i) * P, tm, kick) for n in range(2, 30)]) for i in range(4)]
offset = t0 + (k0 + int(np.argmax(e))) * P
print(f"{60 / P:.3f} BPM, downbeat at {offset:.3f}s (phase kick {np.round(e, 3).tolist()})")
print(f"index.html?audio={path.split('/')[-1]}&bpm={60 / P:.3f}&offset={offset:.3f}")
