# /// script
# dependencies = ["librosa>=0.10", "numpy", "soundfile"]
# ///
"""Find the beat grid of a music track so scene cuts land on it.

    uv run tools/beats.py examples/my-promo/audio/bgm.m4a            # prints bpm, beats, bars
    uv run tools/beats.py examples/my-promo/audio/bgm.m4a --spec examples/my-promo/video.toml

Writes <spec dir>/build/beats.json ({"bpm", "beats", "downbeats", "drops"}); the engine snaps
every scene start to the nearest beat within `video.snap_tolerance` (0.15 s) once it exists.
`--spec` also prints each scene's start before and after snapping, and suggests `beats = n`
durations. `drops` are the strongest onsets (good places for the big cuts: the title, the
reveal, the logo)."""
import argparse, json, os, sys
import numpy as np
import librosa

ap = argparse.ArgumentParser()
ap.add_argument("audio")
ap.add_argument("--spec", help="video.toml: write build/beats.json next to it and show the snapped cuts")
ap.add_argument("--out", help="explicit output path for beats.json")
ap.add_argument("--start", type=float, default=0.0, help="ignore beats before this time (s)")
a = ap.parse_args()

y, sr = librosa.load(a.audio, sr=22050, mono=True)
tempo, frames = librosa.beat.beat_track(y=y, sr=sr, units="frames", tightness=120)
beats = librosa.frames_to_time(frames, sr=sr)
beats = beats[beats >= a.start]
bpm = float(np.atleast_1d(tempo)[0])
onset = librosa.onset.onset_strength(y=y, sr=sr)
# downbeats: the beat phase (0..3) whose beats carry the most low-end onset energy
low = librosa.onset.onset_strength(y=y, sr=sr, fmax=200)
bf = librosa.time_to_frames(beats, sr=sr)
bf = bf[bf < len(low)]
phase = int(np.argmax([low[bf[i::4]].sum() for i in range(4)])) if len(bf) >= 8 else 0
downbeats = beats[phase::4]
# drops: the strongest onsets, at least 2 s apart
of = librosa.onset.onset_detect(onset_envelope=onset, sr=sr, units="frames")
strength = onset[of]
order = np.argsort(-strength)
drops = []
for i in order:
    t = float(librosa.frames_to_time(of[i], sr=sr))
    if all(abs(t - d) > 2.0 for d in drops):
        drops.append(t)
    if len(drops) >= 6:
        break
drops.sort()
out = {"bpm": round(bpm, 2), "beats": [round(float(b), 3) for b in beats], "downbeats": [round(float(b), 3) for b in downbeats], "drops": [round(d, 3) for d in drops]}

path = a.out or (os.path.join(os.path.dirname(os.path.abspath(a.spec)), "build", "beats.json") if a.spec else None)
if path:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(out, open(path, "w"), indent=1)
    print("wrote", path)
print(f"bpm {bpm:.1f}  beat {60 / bpm:.3f} s  bar {240 / bpm:.3f} s  ({len(beats)} beats, first {beats[0]:.2f} s)")
print("downbeats:", " ".join(f"{d:.2f}" for d in downbeats[:16]), "...")
print("drops:", " ".join(f"{d:.2f}" for d in drops))

if a.spec:
    import tomllib
    spec = tomllib.load(open(a.spec, "rb"))
    v = spec.get("video", {})
    tol = v.get("snap_tolerance", 0.15)
    sbpm = v.get("bpm", 0) or bpm
    t = 0.0
    print("\nscene            start  snapped  dur    ~beats")
    for i, s in enumerate(spec.get("scene", [])):
        at = s.get("at")
        start = at if isinstance(at, (int, float)) else t
        dur = s["beats"] * 60 / sbpm if "beats" in s else s.get("dur", 2.0)
        near = float(beats[np.argmin(np.abs(beats - start))]) if i and len(beats) else start
        snapped = near if abs(near - start) <= tol else start
        print(f"{i:2d} {s.get('kind', '?'):12s} {start:6.2f}  {snapped:6.2f}  {dur:5.2f}  {dur * bpm / 60:5.1f}")
        t = snapped + dur
