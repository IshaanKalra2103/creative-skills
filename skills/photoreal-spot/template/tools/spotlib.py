"""Shared helpers for the photoreal-spot tools: the spot file, frame sources, the backdrop
gradient and cover-cropping. Every tool takes the spot folder (or its spot.json) first."""
import json, math, os, subprocess
import numpy as np
from PIL import Image

FRAME_EXT = (".png", ".jpg", ".jpeg")


class Source:
    """A folder of frames, addressed by position in sorted order (0 = first file), so 0-based
    unpacked clips and 1-based renders work the same. `first`/`last` clamp the range."""

    def __init__(self, root, spec):
        spec = {"dir": spec} if isinstance(spec, str) else spec
        self.dir = os.path.join(root, spec["dir"])
        if not os.path.isdir(self.dir):
            raise SystemExit(f"source folder missing: {self.dir}")
        self.files = sorted(f for f in os.listdir(self.dir) if f.lower().endswith(FRAME_EXT))
        if not self.files:
            raise SystemExit(f"no frames in {self.dir}")
        self.first = spec.get("first", 0)
        self.last = spec.get("last", len(self.files) - 1)
        self.cache = {}

    def frame(self, i):
        i = max(self.first, min(self.last, i))
        if i not in self.cache:
            if len(self.cache) > 64:
                self.cache.clear()
            self.cache[i] = Image.open(os.path.join(self.dir, self.files[i])).convert("RGB")
        return self.cache[i]

    def sample(self, s, step):
        """The frame at fractional index s: an interpolation for slow steps, and for steps
        above 1 a blend toward the next frame, which reads as slow-shutter smear."""
        a = math.floor(s)
        return Image.blend(self.frame(a), self.frame(a + 1), max(s - a, 0.35 if step > 1 else 0.0))


class Spot:
    def __init__(self, path):
        path = os.path.abspath(path)
        self.file = path if path.endswith(".json") else os.path.join(path, "spot.json")
        self.dir = os.path.dirname(self.file)
        self.data = json.load(open(self.file))
        self.W, self.H, self.fps = self.data["width"], self.data["height"], self.data["fps"]
        self.shots = self.data["shots"]
        self._sources = {}

    def path(self, *p):
        return os.path.join(self.dir, *p)

    def source(self, name):
        if name not in self._sources:
            spec = self.data.get("sources", {}).get(name)
            if spec is None:
                raise SystemExit(f"spot.json has no source `{name}`")
            self._sources[name] = Source(self.dir, spec)
        return self._sources[name]

    def shot_at(self, g):
        return next(s for s in self.shots if s["start"] <= g < s["end"])

    def plates_end(self):
        return next((s["start"] for s in self.shots if s["src"] == "comp"), max(s["end"] for s in self.shots))

    def out_path(self, g):
        """renders/<shot id>/<1-based frame in the shot>.png, where assemble.py looks."""
        shot = self.shot_at(g)
        d = self.path("renders", shot["id"])
        os.makedirs(d, exist_ok=True)
        return os.path.join(d, f"{g - shot['start'] + 1:04d}.png")

    def gradient(self):
        """The backdrop as an image: the same stops as the comp's #bg, left to right."""
        stops = self.data.get("look", {}).get("gradient") or [
            [0, "#000528"], [0.25, "#001154"], [0.5, "#02288b"], [0.75, "#2f5adb"], [1, "#889dfa"]]
        pos = [p for p, _ in stops]
        rgb = [tuple(int(c.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)) for _, c in stops]
        x = np.linspace(0, 1, self.W)
        row = np.stack([np.interp(x, pos, [c[i] for c in rgb]) for i in range(3)], -1)
        return Image.fromarray(np.repeat(row[None], self.H, 0).astype(np.uint8))


def cover(img, w, h, zoom=1.0, fx=0.5, fy=0.5, roll=0.0):
    """Scale img to cover w x h times zoom, roll it (degrees), and crop w x h around the focus
    point (fx, fy) in the scaled image."""
    sc = max(w / img.width, h / img.height) * zoom
    big = img.resize((round(img.width * sc), round(img.height * sc)), Image.LANCZOS)
    if roll:
        big = big.rotate(roll, resample=Image.BICUBIC)
    x0 = min(max(round(big.width * fx - w / 2), 0), big.width - w)
    y0 = min(max(round(big.height * fy - h / 2), 0), big.height - h)
    return big.crop((x0, y0, x0 + w, y0 + h))


def lerp(pair, t):
    a, b = pair
    return a + (b - a) * t


def probe(video):
    """(width, height, fps, frame count) of a video."""
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
                          "-show_entries", "stream=width,height,r_frame_rate,nb_read_packets",
                          "-of", "csv=p=0", video], capture_output=True, text=True, check=True).stdout.strip()
    w, h, rate, n = out.split(",")[:4]
    num, den = rate.split("/")
    return int(w), int(h), float(num) / float(den), int(n)


def range_arg(arg):
    """'120-200' -> (120, 200); None -> everything."""
    if not arg:
        return 0, 10**9
    a, b = arg.split("-")
    return int(a), int(b)
