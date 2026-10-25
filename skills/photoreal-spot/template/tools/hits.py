# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa", "numpy", "soundfile"]
# ///
"""Where a soundtrack hits, in video frames: percussive onsets with their strength, the tempo
and beat length, spans with no sub bass (breakdowns), quiet dips, and where the track fades and
goes silent. Cuts go on strong onsets; a shot change on "the bass comes back" after a breakdown
or dip reads as the drop. Works on an audio file or a video (its audio track).
usage: uv run tools/hits.py MEDIA [--fps 30] [--min 0.15] [--out hits.json]
"""
import json, os, subprocess, sys, tempfile
import numpy as np
import librosa

args = sys.argv[1:]
opts = {"--fps": "30", "--min": "0.15", "--out": None}
for k in list(opts):
    if k in args:
        i = args.index(k)
        opts[k] = args[i + 1]
        del args[i:i + 2]
media = args[0]
fps, min_strength = float(opts["--fps"]), float(opts["--min"])

wav = media
if not media.lower().endswith((".wav", ".mp3", ".flac", ".aiff", ".m4a", ".ogg")):
    wav = os.path.join(tempfile.mkdtemp(), "track.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", media, "-vn", "-ac", "1", "-ar", "22050", wav], check=True)
y, sr = librosa.load(wav, sr=22050, mono=True)
hop = 256
n_frames = int(len(y) / sr * fps)

# percussive onsets
_, perc = librosa.effects.hpss(y)
env = librosa.onset.onset_strength(y=perc, sr=sr, hop_length=hop)
idx = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=hop)
strength = env[idx] / env.max()
times = librosa.frames_to_time(idx, sr=sr, hop_length=hop)
onsets = [(round(t * fps), float(s)) for t, s in zip(times, strength) if s >= min_strength]
tempo, _ = librosa.beat.beat_track(onset_envelope=env, sr=sr, hop_length=hop)
tempo = float(np.atleast_1d(tempo)[0])

# energy per video frame: everything, and the sub bass under 120 Hz
S = np.abs(librosa.stft(y, n_fft=4096, hop_length=hop))
freqs = librosa.fft_frequencies(sr=sr, n_fft=4096)
st = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr, hop_length=hop)
vf = np.minimum((st * fps).astype(int), n_frames - 1)
total = np.bincount(vf, weights=S.sum(0), minlength=n_frames) / np.maximum(np.bincount(vf, minlength=n_frames), 1)
sub = np.bincount(vf, weights=S[freqs < 120].sum(0), minlength=n_frames) / np.maximum(np.bincount(vf, minlength=n_frames), 1)
total_n = total / np.percentile(total, 90)
sub_n = sub / np.percentile(sub, 90)


def runs(mask, min_len):
    out, start = [], None
    for f, m in enumerate(list(mask) + [False]):
        if m and start is None:
            start = f
        elif not m and start is not None:
            if f - start >= min_len:
                out.append([start, f - 1])
            start = None
    return out


loud = total_n > 0.05
breakdowns = runs((sub_n < 0.15) & loud, 6)
dips = [r for r in runs((total_n < 0.35) & loud, 4) if not any(b[0] <= r[0] <= b[1] for b in breakdowns)]
audible = np.nonzero(total_n > 0.02)[0]
silent_after = int(audible[-1]) + 1 if len(audible) else 0
strong = np.nonzero(total_n > 0.5)[0]
fade_from = int(strong[-1]) + 1 if len(strong) else 0

beat = fps * 60 / tempo
print(f"{media}: {len(y) / sr:.2f} s = {n_frames} frames at {fps:g} fps, about {tempo:.0f} BPM (a beat is {beat:.1f} frames)")
print(f"\nonsets with strength >= {min_strength}  (frame, seconds, strength 0-1)")
for f, s in onsets:
    print(f"  {f:5d}  {f / fps:6.2f}s  {s:4.2f}  {'#' * round(s * 20)}")
print("\nno sub bass (breakdowns):", ", ".join(f"{a}-{b}" for a, b in breakdowns) or "none")
print("quiet dips:", ", ".join(f"{a}-{b}" for a, b in dips) or "none")
print(f"fades from about {fade_from}, silent after {silent_after}")
if opts["--out"]:
    json.dump({"fps": fps, "frames": n_frames, "bpm": tempo, "onsets": onsets, "breakdowns": breakdowns,
               "dips": dips, "fade_from": fade_from, "silent_after": silent_after}, open(opts["--out"], "w"), indent=1)
