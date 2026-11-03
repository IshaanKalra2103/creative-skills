"""Plot the stems, mix and spectrogram with shot cuts (black) and cue events (red dashed) -> qa.png.
usage: uv run --with matplotlib qa_plot.py
"""
import numpy as np, soundfile as sf, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from mix import SHOTS, DUR, EV   # EV: [(film seconds, label)] for every cue, kept next to the cue sheet
fig, ax = plt.subplots(6, 1, figsize=(22, 13), sharex=True, gridspec_kw={'height_ratios':[1,1,1,1,1.4,1.6]})
def env(x, sr, w=0.02):
    m = np.abs(x).max(1); n = int(sr*w); k = len(m)//n; return np.arange(k)*w, 20*np.log10(m[:k*n].reshape(k,n).max(1)+1e-9)
for a, n in zip(ax, ['score','amb','foley','low']):
    x, sr = sf.read(f'stems/{n}.wav'); t, e = env(x, sr); a.fill_between(t, -60, e, color='#4a6'); a.set_ylim(-60, 0); a.set_ylabel(n)
x, sr = sf.read('soundtrack.wav'); t, e = env(x, sr); ax[4].fill_between(t, -60, e, color='#a64'); ax[4].set_ylim(-60, 0); ax[4].set_ylabel('MIX peak dB')
ax[5].specgram(x.mean(1), NFFT=2048, Fs=sr, noverlap=1024, cmap='magma', vmin=-120); ax[5].set_ylim(0, 8000); ax[5].set_ylabel('Hz')
for a in ax:
    for nm, s in SHOTS: a.axvline(s, color='k', lw=1.2, alpha=.6)
    for tt, lb in EV: a.axvline(tt, color='r', lw=.7, ls='--', alpha=.6)
for nm, s in SHOTS: ax[0].text(s+.1, -5, nm, fontsize=9, va='top')
for tt, lb in EV: ax[4].text(tt+.05, -55, lb, fontsize=8, color='r', rotation=90, va='bottom')
ax[5].set_xlim(0, DUR); ax[5].set_xticks(np.arange(0, 74, 2)); plt.tight_layout(); plt.savefig('qa.png', dpi=70)
