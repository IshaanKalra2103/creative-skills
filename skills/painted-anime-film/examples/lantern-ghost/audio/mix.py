"""Mix the soundtrack for The Lantern Ghost on the film's own clock.

usage: uv run mix.py            -> soundtrack.wav (48 kHz stereo, -16 LUFS, -1 dBTP), stems/, mix_report.txt
Event times come from the shot code (src/shot*.js). The ghost's light tone follows the same EMIT keys
as shot 7's kindle, so the sound steps up on the frames the light does.
"""
import numpy as np, soundfile as sf, pyloudnorm as pyln
from pathlib import Path
from scipy.signal import resample_poly, butter, sosfiltfilt
from pedalboard import Pedalboard, Reverb, Compressor, HighpassFilter

HERE = Path(__file__).parent
SR, FPS, DUR = 48000, 24, 1476 / 24          # 1476 frames = the rendered picture
N = int(round(DUR * SR))
SHOTS = [("lantern", 0), ("valley", 4.5), ("roots", 11), ("eyes", 16), ("rise", 19.5), ("flower", 27), ("kindle", 32),
         ("descent", 36.5), ("village", 43.5), ("release", 48.5), ("lit", 55)]
# every cue, for qa_plot.py: (film seconds, label)
EV = [(3.12, 'drop'), (6.0, 'bell'), (12.3, 'ripple'), (13.3, 'mote'), (17.0, 'eyes'), (18.0, 'blink'), (20.9, 'rise'),
      (22.7, 'SNAP'), (28.7, 'touch'), (33.0, 'kindle'), (33.42, 'kindle'), (33.84, 'kindle'), (44.24, 'lantern'),
      (45.58, 'lantern'), (46.91, 'lantern'), (48.24, 'lantern'), (49.95, 'RELEASE'), (50.8, 'sun'), (58.5, 'fade')]
FADE_OUT = (58.5, DUR)                        # shot 11 fades to black over its last 3 s

db = lambda d: 10 ** (d / 20)
T = np.arange(N) / SR


# ---------- io ----------
_cache = {}
def load(name):
    if name in _cache: return _cache[name]
    p = HERE / "sfx" / f"{name}.mp3" if (HERE / "sfx" / f"{name}.mp3").exists() else HERE / name
    x, sr = sf.read(p, always_2d=True, dtype="float32")
    if x.shape[1] == 1: x = np.repeat(x, 2, 1)
    if sr != SR: x = resample_poly(x, SR // 100, sr // 100, axis=0).astype(np.float32)
    # normalise: the loudest 40% of 50 ms windows sit at -20 dBFS RMS
    m = x.mean(1); w = SR // 20; k = max(1, len(m) // w)
    r = np.sqrt((m[:k * w].reshape(k, w) ** 2).mean(1) + 1e-12)
    act = np.sort(r)[int(k * 0.6):]
    x = x * (db(-20) / (np.sqrt((act ** 2).mean()) + 1e-9))
    _cache[name] = x.T.copy()                 # (2, n)
    return _cache[name]


def ramp_env(n, fi=0.0, fo=0.0):
    e = np.ones(n, np.float32)
    a, b = min(n // 2, int(fi * SR)), min(n // 2, int(fo * SR))   # a clip cut short at the end keeps its fades inside it
    if a: e[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if b: e[-b:] *= np.cos(np.linspace(0, np.pi / 2, b)) ** 2
    return e


def place(bus, x, t, gain=0.0, pan=None, fi=0.003, fo=0.01, src=(0, None), env=None, dur=None):
    """Add clip x (2,n) into bus at time t. src trims the clip (seconds), dur cuts it, env(t_global)->gain."""
    a = int(src[0] * SR); b = x.shape[1] if src[1] is None else int(src[1] * SR)
    y = x[:, a:b].copy()
    if dur is not None: y = y[:, :int(dur * SR)]
    i0 = int(round(t * SR))
    if i0 < 0: y = y[:, -i0:]; i0 = 0
    y = y[:, :max(0, N - i0)]
    n = y.shape[1]
    if n <= 0: return
    y *= ramp_env(n, fi, fo) * db(gain)
    if env is not None: y *= env(T[i0:i0 + n]).astype(np.float32)
    if pan is not None:                      # constant-power pan of a mono-summed source; pan -1..1
        m = y.mean(0); th = (pan + 1) * np.pi / 4
        y = np.stack([m * np.cos(th) * 1.41, m * np.sin(th) * 1.41])
    bus[:, i0:i0 + n] += y


def keyed(keys):
    """step function over frames, like coreFlicker / eyeAt / jetAt in the JS"""
    def f(fr):
        for k, v in reversed(keys):
            if fr >= k: return v
        return 0.0
    return f


def frames_env(t0, fn, smooth_ms=8):
    """turn a per-frame value function (frame index from t0) into a smooth audio-rate envelope"""
    def env(t):
        fr = np.floor((t - t0) * FPS).astype(int)
        v = np.array([fn(int(q)) for q in fr], np.float32)
        k = max(1, int(SR * smooth_ms / 1000)); ker = np.ones(k) / k
        return np.convolve(v, ker, mode="same")
    return env


def lowpass(x, hz):
    sos = butter(4, hz, "low", fs=SR, output="sos"); return sosfiltfilt(sos, x, axis=1).astype(np.float32)


def automation(points):
    """piecewise-linear dB automation over global time: [(t, dB), ...]"""
    ts, ds = zip(*points)
    return lambda t: db(np.interp(t, ts, ds))


# ---------- the film's own envelopes (ported from the shot code) ----------
def keylerp(keys, t):
    ts, vs = zip(*keys); return np.interp(t, ts, vs)


# ---------- synth layers ----------
def ghost_tone():
    """the ghost's light: a faint glassy A-major chord with a slow shimmer. Steps up with the kindle (shot 7 EMIT keys,
    stepped like the picture), carries through the descent and the village, swells into the release and is gone
    when the dissolve reaches the wick (51.75)."""
    t = T
    y = np.zeros(N)
    for f, a in [(880.0, 1.0), (1108.7, 0.6), (1318.5, 0.5), (1760.0, 0.25), (440.0, 0.35)]:
        y += a * np.sin(2 * np.pi * f * t + f) * (1 + 0.25 * np.sin(2 * np.pi * (0.31 + f / 9000) * t))
    kindle = np.select([t < 33.0, t < 33.42, t < 33.84], [0.0, 0.22, 0.5], 1.0)       # shot 7 EMIT, stepped
    lvl = kindle * automation([(32, -6), (36.5, -6), (43.5, -4), (48.5, -3), (49.9, 2), (51.2, 3), (51.75, -40)])(t)
    lvl[t < 33.0] = 0
    k = SR // 50; lvl = np.convolve(lvl, np.ones(k) / k, mode="same")
    y = (y * lvl).astype(np.float32)
    y *= db(-38) / (np.sqrt((y[(t > 34) & (t < 36)] ** 2).mean()) + 1e-9)
    return np.stack([y, y])


# ---------- the cue sheet ----------
def build():
    score = np.zeros((2, N), np.float32); amb = np.zeros_like(score); fx = np.zeros_like(score); low = np.zeros_like(score)

    # score: Eleven Music, cut on the shot lengths; dips a little under the snap and the lantern lights
    sc = load("score_t1.mp3")
    place(score, sc, 0, gain=-1, fi=0, fo=0,
          env=automation([(0, -2), (11, -2), (12, -4), (19.5, -4), (22.4, -6), (23.4, -2), (43.5, -3), (48.5, 0), (DUR, 0)]))

    # ambience: the grey hour, then morning arriving behind the ghost from the descent on
    bed = load("predawn_bed"); L = bed.shape[1] / SR; t = 0.0
    while t < 40:
        place(amb, bed, t, gain=-9, fi=2.0 if t else 1.6, fo=2.0); t += L - 2.0
    amb *= automation([(0, 0), (11, -2), (16, -5), (19.5, -6), (27, -4), (36.5, -6), (40, -40)])(T).astype(np.float32)
    place(amb, load("birds_wake"), 38.0, gain=-11, fi=1.5, fo=1.5, dur=11.0)
    mb = load("morning_bed"); L = mb.shape[1] / SR; t = 45.0
    while t < DUR:
        place(amb, mb, t, gain=-9 if t > 48.5 else -14, fi=1.5 if t > 45 else 2.5, fo=2.0); t += L - 2.0

    # 1  dew drop lets go at 2.75 and lands out of frame
    place(fx, load("dew_drop"), 3.12, gain=-14, pan=-0.15)
    # 2  far temple bell across the valley
    place(fx, lowpass(load("temple_bell"), 3500), 6.0, gain=-14, pan=0.3, fo=1.5)
    # 3  the pool ripples (12.3, 12.55), a mote rises from 13.3
    place(fx, load("pool_ripple"), 12.25, gain=-7)
    place(fx, load("mote_rise"), 13.25, gain=-12, fo=0.6)
    # 4  eyes open (17.0) and blink (18.0)
    place(fx, load("blink_twinkle"), 16.7, gain=-16)                # clip peaks at 0.35 s
    place(fx, load("blink_twinkle"), 17.85, gain=-18)
    # 5  rise from 20.9, strand snap 22.7, drips back into the pool
    place(fx, load("ghost_rise"), 20.6, gain=-10, fo=0.4, dur=2.15)
    place(fx, load("strand_snap"), 22.3, gain=-5, src=(0.6, None))   # the pop is 1.0 s into the clip
    place(fx, load("drips"), 22.96, gain=-12, fo=0.8)                  # hits at 0.14 / 0.34 / 1.28 s
    # 6  the sleeve touches the bell at 28.7; colour runs up, it opens
    place(fx, load("flower_bloom"), 28.6, gain=-9, pan=0.2, fo=0.6)
    # 7  the light kindles in steps at 33.0 / 33.42 / 33.84
    kd = load("kindle")                                               # its puffs at 0.24 / 0.68 / 1.92 s, one per light step
    for tt, (a, b) in [(33.0, (0.14, 0.6)), (33.42, (0.58, 1.05)), (33.84, (1.82, 2.4))]:
        place(fx, kd, tt - 0.1, gain=-11, src=(a, b), fi=0.01, fo=0.15)
    low += ghost_tone()
    # 8  descent: the wake rustles as colour blooms behind it
    place(fx, load("wake_shimmer"), 35.2, gain=-12, fi=0.3, fo=1.2, pan=0.1)   # onset at 1.65 s
    # 9  each eave lantern catches as the glow passes (lightAt + 0.05)
    for tt, p in [(44.24, -0.5), (45.58, -0.2), (46.91, 0.15), (48.24, 0.45)]:
        place(fx, load("lantern_light"), tt - 0.19, gain=-13, pan=p, src=(1.15, None))   # the catch is at 1.34 s
    # 10 the release: spread at 49.95, petals and light pour out across the valley
    place(fx, load("release_gust"), 49.65, gain=-4, fi=0.3, fo=1.2)   # builds from 0.3 s, peaks at 2.0 s (51.65, the dissolve's end)
    place(fx, load("petals_flutter"), 50.2, gain=-10, fo=1.0)
    # 11 the lantern's small flame, close
    place(fx, load("flame_coda"), 55.0, gain=-14, fi=0.8, fo=0.5)
    return score, amb, fx, low


def master(score, amb, fx, low):
    # foley gets a shared outdoor space; the booms stay dry
    fxr = Pedalboard([Reverb(room_size=0.55, damping=0.5, wet_level=0.16, dry_level=0.92, width=0.9)])(fx, SR)
    # duck the score under loud foley (sidechain on the foley RMS), up to 5 dB
    key = np.sqrt(np.convolve((fxr + low).mean(0) ** 2, np.ones(SR // 10) / (SR // 10), mode="same")) + 1e-9
    kdb = 20 * np.log10(key)
    duck = -np.clip((kdb + 26) * 0.5, 0, 4)                   # starts at -26 dBFS, 0.5 dB per dB, max 4
    k = SR // 4; duck = np.convolve(duck, np.ones(k) / k, mode="same")
    score = score * db(duck).astype(np.float32)
    mix = score + amb + fxr + low
    mix = Pedalboard([HighpassFilter(22), Compressor(threshold_db=-20, ratio=1.8, attack_ms=30, release_ms=300)])(mix, SR)
    a, b = int(FADE_OUT[0] * SR), N
    mix[:, a:b] *= np.cos(np.linspace(0, np.pi / 2, b - a)) ** 2
    meter = pyln.Meter(SR)
    lufs = meter.integrated_loudness(mix.T)
    mix *= db(-16 - lufs)
    mix = peak_limit(mix, ceiling_db=-1.3)
    return mix, (score, amb, fxr, low)


def peak_limit(x, ceiling_db=-1.3, hold_ms=40, smooth_ms=15):
    """look-ahead brickwall: gain <= ceiling/peak at every sample (hold window covers the smoothing window)"""
    from scipy.ndimage import maximum_filter1d, uniform_filter1d
    c = db(ceiling_db)
    pk = np.abs(resample_poly(x, 4, 1, axis=1)).max(0).reshape(-1, 4).max(1)[:x.shape[1]]   # inter-sample peaks
    pk = maximum_filter1d(pk, size=int(SR * hold_ms / 1000) | 1)
    g = np.minimum(1.0, c / (pk + 1e-12))
    g = uniform_filter1d(g, size=int(SR * smooth_ms / 1000) | 1)
    return (x * g).astype(np.float32)


def report(mix, stems):
    meter = pyln.Meter(SR)
    lines = [f"integrated {meter.integrated_loudness(mix.T):.1f} LUFS, sample peak {20*np.log10(np.abs(mix).max()):.2f} dBFS",
             "true peak (4x) %.2f dBTP" % (20 * np.log10(np.abs(resample_poly(mix, 4, 1, axis=1)).max())), "",
             f"{'shot':12s} {'start':>6s}  {'mix':>6s} {'score':>6s} {'amb':>6s} {'foley':>6s} {'low':>6s}  (RMS dBFS)"]
    bounds = [s for _, s in SHOTS] + [DUR]
    rms = lambda x: 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
    for (name, a), b in zip(SHOTS, bounds[1:]):
        i, j = int(a * SR), int(b * SR)
        lines.append(f"{name:12s} {a:6.1f}  {rms(mix[:, i:j]):6.1f} " + " ".join(f"{rms(s[:, i:j]):6.1f}" for s in stems))
    return "\n".join(lines)


if __name__ == "__main__":
    s, a, f, l = build()
    mix, stems = master(s, a, f, l)
    sf.write(HERE / "soundtrack.wav", mix.T, SR, subtype="PCM_24")
    (HERE / "stems").mkdir(exist_ok=True)
    for n, x in zip(["score", "amb", "foley", "low"], stems): sf.write(HERE / "stems" / f"{n}.wav", x.T, SR, subtype="PCM_24")
    rep = report(mix, stems); (HERE / "mix_report.txt").write_text(rep); print(rep)
