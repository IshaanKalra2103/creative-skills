"""Mix the soundtrack for guardian.html on the film's own clock.

usage: uv run mix.py            -> soundtrack.wav (48 kHz stereo, -16 LUFS, -1 dBTP), stems/, mix_report.txt
Event times come from the shot code (src/shot*.js); the flicker envelopes are the same keyframe
tables the picture uses (CORE_KEYS, EYE_KEYS, JET_KEYS), so sound and light stutter on the same frames.
"""
import numpy as np, soundfile as sf, pyloudnorm as pyln
from pathlib import Path
from scipy.signal import resample_poly, butter, sosfiltfilt
from pedalboard import Pedalboard, Reverb, Compressor, HighpassFilter

HERE = Path(__file__).parent
SR, FPS, DUR = 48000, 24, 1759 / 24          # 1759 frames = the rendered picture
N = int(round(DUR * SR))
SHOTS = [("forest", 0), ("bird", 8), ("face-ray", 14), ("core", 19.5), ("tremor", 24), ("birds-burst", 27.5),
         ("rise", 30.7), ("lookup", 40.2), ("gap", 44.8), ("ignite", 47.8), ("windring", 52), ("launch", 55.8),
         ("sky", 58.4), ("hollow", 63.2), ("after", 67.1)]
FADE_OUT = (70.3, DUR)                        # the picture's fade to black

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
    a, b = int(fi * SR), int(fo * SR)
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
CORE_KEYS = [(0, 0), (20, 0), (21, .28), (22, .05), (23, 0), (26, 0), (27, .5), (28, .12), (29, 0), (33, 0), (34, .42),
             (35, .75), (36, .3), (37, .12), (40, .12)]
_ck = keyed(CORE_KEYS)
def core_flicker(f):
    if f >= 40:
        k = min(1, (f - 40) / 34); e = k * k * (3 - 2 * k)
        return 0.15 + 0.7 * e + (0.06 * np.sin((f - 74) / 24 * 2 * np.pi * 0.6) if k >= 1 else 0)
    return _ck(f)
EYE_KEYS = [(0, 0), (52, 0), (53, .35), (54, .08), (55, 0), (58, 0), (59, .7), (60, .4), (61, .15), (63, .9), (64, 1.25), (66, 1.0)]
JET_KEYS = [(0, 0), (20, 0), (21, .35), (22, .1), (23, 0), (29, 0), (30, .55), (31, .25), (32, .6), (33, .15), (34, 0),
            (38, 0), (39, .7), (40, .9), (42, 1.0)]


# ---------- synth layers ----------
def sub_boom(dur=2.2, f0=58, f1=27, decay=2.2):
    t = np.arange(int(dur * SR)) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 3.0)
    ph = 2 * np.pi * np.cumsum(f) / SR
    a = np.exp(-t * decay) * np.minimum(1, t / 0.006)
    noise = np.random.default_rng(3).standard_normal(len(t)) * np.exp(-t * 18) * 0.35
    sos = butter(2, 160, "low", fs=SR, output="sos")
    y = (np.sin(ph) * a + sosfiltfilt(sos, noise)).astype(np.float32)
    y *= db(-8) / (np.abs(y).max() + 1e-9)
    return np.stack([y, y])


def core_hum():
    """the robot's heartbeat: a low D with a beating second partial and a faint glassy overtone,
    following the chest light; swells when the eyes come on, cut by the jets"""
    t = T
    base = 2 * np.pi * 73.42 * t
    y = (np.sin(base) + 0.5 * np.sin(2 * base + 0.3) + 0.25 * np.sin(2 * np.pi * 147.4 * t)
         + 0.04 * np.sin(2 * np.pi * 587.3 * t) * (1 + 0.5 * np.sin(2 * np.pi * 0.6 * t)))
    lvl = np.zeros(N, np.float32)
    env_core = frames_env(19.5, core_flicker)(t[(t >= 19.5) & (t < 24)])
    lvl[(t >= 19.5) & (t < 24)] = env_core
    pulse = 0.85 * (1 + 0.07 * np.sin(2 * np.pi * 0.6 * t))
    later = automation([(24, 0), (27.5, -4), (30.7, -6), (40.2, -6), (42.8, -1), (44.8, -5), (47.8, -4), (49.3, 0), (49.45, -60)])(t)
    m = t >= 24; lvl[m] = (pulse * later)[m]
    y = (y * lvl).astype(np.float32)
    y *= db(-21) / (np.sqrt((y[(t > 22.6) & (t < 23.6)] ** 2).mean()) + 1e-9)
    return np.stack([y, y])


# ---------- the cue sheet ----------
def build():
    score = np.zeros((2, N), np.float32); amb = np.zeros_like(score); fx = np.zeros_like(score); low = np.zeros_like(score)

    # score: Eleven Music, cut on the shot lengths; automation leaves room for the chest light and the leaf
    sc = load("score_t1.mp3")
    place(score, sc, 0, gain=-1, fi=0, fo=0,
          env=automation([(0, 0), (19.3, 0), (19.9, -8), (22.4, -8), (23.6, 0), (63.2, 0), (66, -3), (73.3, -3)]))

    # ambience
    bed = load("forest_bed"); L = bed.shape[1] / SR
    t = 0.0
    while t < 36:                                                   # loop with 2 s crossfades
        place(amb, bed, t, gain=-7, fi=2.0 if t else 2.5, fo=2.0); t += L - 2.0
    amb_env = automation([(0, 0), (8, -3), (14, -4), (19.5, -6), (24, -3), (27.6, -2), (29, -12), (31, -18), (35, -40)])
    amb *= amb_env(T).astype(np.float32)
    breeze = lowpass(load("sky_wind"), 2200); t = 29.0
    while t < 56:
        place(amb, breeze, t, gain=-13, fi=2.0, fo=2.0); t += breeze.shape[1] / SR - 2.0
    amb[:, int(55.8 * SR):int(58.15 * SR)] *= np.linspace(1, 0, int(58.15 * SR) - int(55.8 * SR))
    place(amb, load("sky_wind"), 58.15, gain=-4, fi=0.3, fo=0.25, dur=63.2 - 58.15)
    place(amb, load("after_bed"), 62.9, gain=-5, fi=1.2, fo=0)

    # 2  the bird: comes in from the right, flares, lands at 11.0, then chirps
    place(fx, load("bird_flight"), 9.6, gain=-1, pan=0.35)
    place(fx, load("bird_chirps"), 11.45, gain=-5, pan=0.25)
    # 3  first ray: glint on the lenses at 16.94
    place(fx, load("sun_glint"), 16.3, gain=-9, fo=0.4)
    # 4  chest light: the crackle gated by the same flicker keys as the glow
    place(fx, load("core_flicker"), 19.5, gain=-6, fi=0, fo=0.6, env=frames_env(19.5, core_flicker))
    low += core_hum()
    # 5a tremor under the hand (shake starts 24.5)
    place(fx, load("ground_rumble"), 24.2, gain=-7, fo=1.0)
    place(fx, load("stone_fingers"), 24.35, gain=-8, pan=-0.1)
    # 5b birds burst at 27.8 (pre-lap the swell across the cut)
    place(fx, load("flock_burst"), 26.75, gain=-3, fo=0.5)
    # 6  the rise: groan, three thumps, clods
    place(fx, load("robot_rise"), 32.15, gain=-2, fi=0.4, fo=0.6)
    for tt, g in [(33.85, -3), (36.85, 2), (38.15, -6)]:
        place(fx, load("giant_thud"), tt - 0.02, gain=g)
        place(low, sub_boom(), tt, gain=g + 2)
    place(fx, load("debris_fall"), 33.6, gain=-6)
    place(fx, load("debris_fall"), 37.0, gain=-9, pan=0.3)
    # 7a head lifts 40.9-43.3, eyes flicker 42.41 / 42.66, on at 42.83
    place(fx, load("head_servo"), 40.85, gain=-7)
    place(fx, load("eyes_on"), 41.95, gain=-9, src=(0, 0.95), fi=0, fo=0.02,
          env=lambda t: frames_env(40.2, keyed(EYE_KEYS))(t) * (t < 42.9))
    # placed so the clip's power-on tone (1.45 s in) lands on frame 63 = 42.83
    place(fx, load("eyes_on"), 42.78 - 1.40, gain=-5, src=(1.40, None), fi=0.01, fo=0.3)
    # 8a jets cough (48.68, 49.05), catch at 49.43 and roar
    place(fx, load("jet_cough"), 48.66, gain=-7, dur=0.32, fo=0.2)
    place(fx, load("jet_cough"), 49.03, gain=-3, dur=0.38, fo=0.22)
    jet = load("jet_ignite")
    place(fx, jet, 49.42, gain=0, fi=0.02, fo=0.12, dur=52.0 - 49.42 + 0.06,
          env=lambda t: np.maximum(frames_env(47.8, keyed(JET_KEYS))(t), (t > 49.55).astype(np.float32)))
    # 8b high and wide: the roar is far below; the wind ring rolls out from 52.15
    place(fx, lowpass(jet, 900), 52.0, gain=-10, src=(52.0 - 49.42, None), fi=0.05, fo=0.6)
    place(fx, load("wind_ring"), 51.95, gain=0, fo=0.8)
    # 9a launch: roar comes back up under it, feet leave at 56.3: blast, boom, fly-away
    place(fx, jet, 55.3, gain=1, fi=0.5, fo=0.4, dur=58.6 - 55.3)
    place(fx, load("liftoff"), 56.28, gain=2)
    place(low, sub_boom(dur=3.0, f0=62, f1=24, decay=1.4), 56.3, gain=4)
    place(fx, load("flyby"), 56.45, gain=-1, fo=1.0)
    # 10a the leaf settles into the knee print at 65.9
    place(fx, load("leaf_land"), 65.85, gain=-10)
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
