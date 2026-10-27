"""Shared helpers for the sports-ad tools: the ad file (ad.json) and its timeline, frame
sources (AI clips and stills), easing, Jev boxes and the TypeSafe key.

Times in ad.json are frames (12), beats ("2b", needs `bpm`), seconds ("0.5s"), or a shot id
plus an offset ("strike", "strike+4", "strike+1b", "strike-2") for anything placed on the
timeline."""
import hashlib, io, json, math, os, re, subprocess
import numpy as np
from PIL import Image

STILL_EXT = (".png", ".jpg", ".jpeg", ".webp")
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fonts")


def ease(t, kind="inout"):
    t = min(max(t, 0.0), 1.0)
    if kind == "linear":
        return t
    if kind == "out":
        return 1 - (1 - t) ** 3
    if kind == "in":
        return t ** 3
    return t * t * (3 - 2 * t)


def keyframes(pairs, k):
    """Linear interpolation through [[frame, value], ...] at frame k (held past the ends)."""
    if not isinstance(pairs, list):
        return pairs
    if k <= pairs[0][0]:
        return pairs[0][1]
    for (a, va), (b, vb) in zip(pairs, pairs[1:]):
        if k <= b:
            return va if b == a else va + (vb - va) * (k - a) / (b - a)
    return pairs[-1][1]


def probe(video):
    """(width, height, fps, frame count) of a video."""
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
                          "-show_entries", "stream=width,height,r_frame_rate,nb_read_packets",
                          "-of", "csv=p=0", video], capture_output=True, text=True, check=True).stdout.strip()
    w, h, rate, n = out.split(",")[:4]
    num, den = rate.split("/")
    return int(w), int(h), float(num) / float(den), int(n)


class Source:
    """A clip (unpacked once to build/src/<name>/, optionally motion-interpolated first) or a
    still. Frames are addressed by fractional source frame; between two frames they blend."""

    def __init__(self, ad, path, interp=1):
        self.path = ad.path(path)
        if not os.path.exists(self.path):
            raise SystemExit(f"missing source: {self.path}")
        self.still = self.path.lower().endswith(STILL_EXT)
        self.cache = {}
        if self.still:
            self.fps, self.n = ad.fps, 1
            self.img = Image.open(self.path).convert("RGB")
            return
        name = re.sub(r"\W", "_", os.path.splitext(path)[0]) + (f"_x{interp}" if interp > 1 else "")
        self.dir = ad.path("build", "src", name)
        _, _, fps, _ = probe(self.path)
        self.fps = fps * interp
        if not os.path.isdir(self.dir) or not os.listdir(self.dir):
            os.makedirs(self.dir, exist_ok=True)
            vf = f"minterpolate=fps={self.fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir," if interp > 1 else ""
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", self.path, "-vf", vf + "format=rgb24",
                            "-q:v", "2", os.path.join(self.dir, "%05d.jpg")], check=True)
        self.files = sorted(os.listdir(self.dir))
        self.n = len(self.files)

    @property
    def size(self):
        return self.frame(0).size

    def frame(self, i):
        if self.still:
            return self.img
        i = max(0, min(self.n - 1, i))
        if i not in self.cache:
            if len(self.cache) > 48:
                self.cache.clear()
            self.cache[i] = Image.open(os.path.join(self.dir, self.files[i])).convert("RGB")
        return self.cache[i]

    def at(self, s):
        if self.still:
            return self.img
        a = math.floor(s)
        f = s - a
        if f < 0.04 or a + 1 >= self.n:
            return self.frame(a)
        return Image.blend(self.frame(a), self.frame(a + 1), f)


class Ad:
    def __init__(self, path):
        path = os.path.abspath(path)
        self.file = path if path.endswith(".json") else os.path.join(path, "ad.json")
        self.dir = os.path.dirname(self.file)
        self.data = json.load(open(self.file))
        self.W, self.H = self.data["size"]
        self.fps = self.data.get("fps", 30)
        self.bpm = self.data.get("bpm")
        self.shots = self.data["shots"]
        # exact (fractional) frame times, rounded only at each cut, so a tempo whose beat is not
        # a whole number of frames (140 bpm: 12.86) keeps every cut on its beat
        t = 0.0
        for s in self.shots:
            s["_t"] = t
            t += self.exact(s["len"])
            s["_start"], s["_len"] = round(s["_t"]), round(t) - round(s["_t"])
        self.N = round(t)
        self.ids = {s["id"]: s for s in self.shots}
        self._sources = {}

    def path(self, *p):
        return os.path.join(self.dir, *p)

    def exact(self, v):
        """A length in frames, unrounded: 12, "2b", "0.5s", "1.5b"."""
        if isinstance(v, (int, float)):
            return float(v)
        v = str(v).strip()
        if v.endswith("b"):
            if not self.bpm:
                raise SystemExit("beat lengths need `bpm` in ad.json")
            return float(v[:-1]) * self.fps * 60 / self.bpm
        if v.endswith("s"):
            return float(v[:-1]) * self.fps
        return float(v)

    def frames(self, v):
        """A length in whole frames."""
        return round(self.exact(v))

    def local(self, shot, v):
        """A time inside a shot (a hit's `at`), in frames from the shot's first frame, on the beat grid."""
        return round(shot["_t"] + self.exact(v)) - shot["_start"]

    def when(self, v):
        """A time on the timeline: a length from the start, or a shot id plus an offset."""
        if isinstance(v, str):
            m = re.fullmatch(r"([A-Za-z_][\w]*)\s*([+-].+)?", v.strip())
            if m and m.group(1) in self.ids:
                off = m.group(2)
                return round(self.ids[m.group(1)]["_t"] + (0 if not off else (1 if off[0] == "+" else -1) * self.exact(off[1:])))
        return self.frames(v)

    def shot_at(self, g):
        for s in self.shots:
            if s["_start"] <= g < s["_start"] + s["_len"]:
                return s
        return self.shots[-1]

    def source(self, shot):
        key = (shot["src"], shot.get("interp", 1))
        if key not in self._sources:
            self._sources[key] = Source(self, shot["src"], shot.get("interp", 1))
        return self._sources[key]

    def sec(self, g):
        return g / self.fps


def api_key():
    key = os.environ.get("TYPESAFE_API_KEY") or subprocess.run(
        ["security", "find-generic-password", "-s", "TYPESAFE_API_KEY", "-w"],
        capture_output=True, text=True).stdout.strip()
    if not key:
        raise SystemExit("no TypeSafe key: set TYPESAFE_API_KEY or add it to the keychain")
    return key


_clients = {}


def jev(model="jev-latest"):
    """A TypeSafe client: jev-latest for judgments, jev-preview for boxes."""
    import typesafe_sdk as ts
    if model not in _clients:
        _clients[model] = ts.TypeSafeClient(api_key=api_key(), model=model,
                                            headers={"TypeSafe-Danger-Zone-Images": "true"})
    return _clients[model]


def jpeg(img, q=90):
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "JPEG", quality=q)
    return buf.getvalue()


def find_box(img, what, cache_file):
    """Box (x0, y0, x1, y1) in img px around `what` (Jev Box on jev-preview), cached by the
    image's content and the prompt, so rebuilds cost nothing. None if not found."""
    cache = json.load(open(cache_file)) if os.path.exists(cache_file) else {}
    key = hashlib.sha1(img.resize((96, 120)).tobytes()).hexdigest()[:16] + ":" + hashlib.sha1(what.encode()).hexdigest()[:8]
    if key not in cache:
        import typesafe_sdk as ts
        b = jev("jev-preview").system_one(
            state={"frame": ts.Image(jpeg(img))},
            questions={"box": ts.Box(instructions=f"Draw a box around {what} in `frame`.")}).answers["box"].box
        W, H = img.size
        cache[key] = None if b is None else [b.left * W, b.top * H, b.right * W, b.bottom * H]
        os.makedirs(os.path.dirname(cache_file), exist_ok=True)
        json.dump(cache, open(cache_file, "w"), indent=0)
    return cache[key]
