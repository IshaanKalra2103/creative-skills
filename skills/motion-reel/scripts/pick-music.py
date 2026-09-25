"""Find a stock track and a 20s window whose structure you can cut to.

  uv run --with librosa python scripts/pick-music.py list energetic electronic   # Mixkit tracks by tag
  uv run --with librosa python scripts/pick-music.py fetch 102 126 729 -o music/   # download by id
  uv run --with librosa python scripts/pick-music.py analyze music/*.mp3           # bpm, steadiness, best window
  uv run --with librosa python scripts/pick-music.py map music/102.mp3 55 90        # 0.25s energy map + beat times
  uv run --with librosa python scripts/pick-music.py cut music/102.mp3 61.37 -o templates/depth-camera/music.wav

Mixkit tracks are under the Mixkit Stock Music Free License (commercial use, no credit
required, no redistributing the raw track) — don't commit the mp3s.
"""
import argparse, glob, json, os, re, subprocess, urllib.request

UA = {"User-Agent": "Mozilla/5.0"}

def list_tags(tags):
    seen = {}
    for tag in tags:
        html = urllib.request.urlopen(urllib.request.Request(f"https://mixkit.co/free-stock-music/tag/{tag}/", headers=UA)).read().decode()
        for m in re.finditer(r'"name":"([^"]+)","genre":"([^"]*)","byArtist":"([^"]*)","duration":"([^"]*)","url":"(https://assets\.mixkit\.co/music/(\d+)/\d+\.mp3)"', html):
            seen[m.group(6)] = (m.group(1), m.group(2), m.group(3), m.group(4))
    for i, (name, genre, artist, dur) in seen.items():
        print(f"{i:>5}  {name:32s} {genre:16s} {artist:28s} {dur}")

def fetch(ids, out):
    os.makedirs(out, exist_ok=True)
    for i in ids:
        p = os.path.join(out, f"{i}.mp3")
        if not os.path.exists(p):
            with urllib.request.urlopen(urllib.request.Request(f"https://assets.mixkit.co/music/{i}/{i}.mp3", headers=UA)) as r, open(p, "wb") as f:
                f.write(r.read())
        print(p)

def analyze(files, window):
    import librosa, numpy as np
    for f in files:
        y, sr = librosa.load(f, sr=22050)
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
        on = librosa.onset.onset_strength(y=y, sr=sr); rms = librosa.feature.rms(y=y)[0]
        hop = 512 / sr; n = min(len(on), len(rms)); win = int(window / hop)
        score = np.convolve(rms[:n] * on[:n], np.ones(win), "valid")
        per_s = librosa.feature.rms(y=y, hop_length=sr)[0]
        print(f"{os.path.basename(f):10s} bpm={float(np.atleast_1d(tempo)[0]):6.1f} beat-std={np.diff(beats).std():.3f} "
              f"rms={rms.mean():.3f} punch={np.std(on) / np.mean(on):.2f} best{window:.0f}s@{score.argmax() * hop:5.1f}")
        print("   rms/s:", " ".join(f"{int(v * 100):2d}" for v in per_s))

def energy_map(f, a, b):
    import librosa, numpy as np
    y, sr = librosa.load(f, sr=22050); hop = 512
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]; t = librosa.times_like(rms, sr=sr, hop_length=hop)
    S = np.abs(librosa.stft(y, hop_length=hop)); fr = librosa.fft_frequencies(sr=sr)
    low = S[fr < 150].sum(0); low /= low.max()
    for x in np.arange(a, b, .25):
        m = (t >= x) & (t < x + .25)
        print(f"{x:6.2f} rms={rms[m].mean():.2f} low={low[m].mean():.2f} " + "#" * int(rms[m].mean() * 60))
    _, beats = librosa.beat.beat_track(y=y, sr=sr, units="time", hop_length=hop)
    print("beats", json.dumps([round(float(v), 3) for v in beats[(beats > a) & (beats < b)]]))

def cut(f, start, dur, out):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-t", str(dur), "-i", f, "-af",
                    f"afade=t=in:d=0.04,afade=t=out:st={dur - 1.1}:d=1.1,loudnorm=I=-15:TP=-1.5:LRA=11",
                    "-ar", "48000", "-ac", "2", out], check=True)
    print(out)

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("cmd"); ap.add_argument("args", nargs="*")
    ap.add_argument("-o", default="music"); ap.add_argument("--dur", type=float, default=20.0)
    a = ap.parse_args()
    if a.cmd == "list": list_tags(a.args or ["energetic"])
    elif a.cmd == "fetch": fetch(a.args, a.o)
    elif a.cmd == "analyze": analyze(sum((glob.glob(x) for x in a.args), []), a.dur)
    elif a.cmd == "map": energy_map(a.args[0], float(a.args[1]), float(a.args[2]))
    elif a.cmd == "cut": cut(a.args[0], float(a.args[1]), a.dur, a.o if a.o.endswith(".wav") else os.path.join(a.o, "music.wav"))
