# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow", "numpy", "typesafe-sdk"]
# ///
"""Snap cuts: the `beats` in spot.json, each held for a few frames and cut on the soundtrack's
hits. A beat is a full-bleed frame, a picture card inset on the backdrop gradient, a horizontal
smear or black, and can carry thin white boxes: a tracking box on the subject (found by Jev,
TypeSafe's System One model, with a Box question) and a fixed frame box. Box answers are cached
in boxes.json by frame content and prompt, so a rebuild with unchanged beats makes no calls.
The TypeSafe key comes from $TYPESAFE_API_KEY or the macOS keychain (service TYPESAFE_API_KEY).
Writes renders/<shot>/NNNN.png. See references/snaps.md for the beat grammar.
usage: uv run tools/snaps.py SPOT [first-last]
"""
import hashlib, io, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw
from spotlib import Spot, cover, lerp, range_arg

spot = Spot(sys.argv[1])
lo, hi = range_arg(sys.argv[2] if len(sys.argv) > 2 else None)
W, H = spot.W, spot.H
U = W / 1080
GRAD = spot.gradient()
BOX_PROMPT = spot.data.get("box_prompt", "Locate the main product in `frame`, including its shadowed side.")
CACHE = spot.path("boxes.json")
boxes = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
_client = None


def api_key():
    key = os.environ.get("TYPESAFE_API_KEY")
    if not key:
        key = subprocess.run(["security", "find-generic-password", "-s", "TYPESAFE_API_KEY", "-w"],
                             capture_output=True, text=True).stdout.strip()
    if not key:
        raise SystemExit("no TypeSafe key: set TYPESAFE_API_KEY or add it to the keychain")
    return key


def find_box(img, prompt):
    """Box (x0, y0, x1, y1) in output px around what `prompt` asks for, or None."""
    global _client
    key = hashlib.sha1(img.resize((96, 120)).tobytes()).hexdigest() + ":" + hashlib.sha1(prompt.encode()).hexdigest()[:8]
    if key not in boxes:
        import typesafe_sdk as ts
        if _client is None:
            _client = ts.TypeSafeClient(api_key=api_key(), model="jev-preview",
                                        headers={"TypeSafe-Danger-Zone-Images": "true"})
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=90)
        b = _client.system_one(state={"frame": ts.Image(buf.getvalue())},
                               questions={"box": ts.Box(instructions=prompt)}).answers["box"].box
        boxes[key] = None if b is None else [b.left * W, b.top * H, b.right * W, b.bottom * H]
        json.dump(boxes, open(CACHE, "w"), indent=0)
    return boxes[key]


def outline(draw, box, pad=0.08, alpha=190):
    """A thin white box; pad is a fraction of the box's longer side."""
    x0, y0, x1, y1 = box
    p = pad * max(x1 - x0, y1 - y0)
    draw.rectangle((x0 - p, y0 - p, x1 + p, y1 + p), outline=(255, 255, 255, alpha), width=max(1, round(2 * U)))


def smear(img, width=None):
    """Horizontal whip: a box blur along x."""
    width = width or (round(181 * U) | 1)
    a = np.asarray(img, dtype=np.float32)
    pad = np.pad(a, ((0, 0), (width // 2 + 1, width // 2), (0, 0)), mode="edge")
    c = np.cumsum(pad, axis=1)
    return Image.fromarray(((c[:, width:] - c[:, :-width]) / width).astype(np.uint8))


def render(b):
    g0, g1 = b["at"]
    kind = b.get("kind", "full")
    box = b.get("box")
    box = {} if box is True else box
    held, trail = None, []
    for g in range(g0, g1 + 1):
        k = g - g0
        t = k / max(1, g1 - g0)
        z = lerp(b.get("zoom", (1, 1)), t)
        fx, fy = b.get("focus", (0.5, 0.5))
        if kind == "black":
            out = Image.new("RGB", (W, H))
        else:
            src = spot.source(b["src"])
            step = b.get("step", 1.0)
            pic = src.sample(b.get("start", 0) + step * k, step)
            if kind == "card":
                cx, cy, cw, ch = (round(v * U) for v in b["card"])
                out = GRAD.copy()
                out.paste(cover(pic, cw, ch, z, fx, fy), (cx - cw // 2, cy - ch // 2))
            else:
                out = cover(pic, W, H, z, fx, fy)
                if kind == "smear":
                    out = smear(out)
        if "dark" in b:
            out = Image.eval(out, lambda v, d=b["dark"]: int(v * d))
        over = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(over)
        if box is not None and box.get("from", g0) <= g <= box.get("until", g1):
            # a held box is placed once, like a framing guide; a tracking box follows the subject
            if box.get("track") or held is None:
                held = find_box(out, box.get("prompt", BOX_PROMPT))
            if held:
                # a trail redraws the last few positions fainter, the boxes left behind a moving subject
                for i, old in enumerate(trail[-box.get("trail", 0):] if box.get("trail") else []):
                    outline(draw, old, alpha=round(190 * (i + 1) / (box["trail"] + 1)))
                outline(draw, held)
                trail.append(held)
        if "frame" in b:
            outline(draw, [v * U for v in b["frame"]], pad=0.0)
        out = Image.alpha_composite(out.convert("RGBA"), over).convert("RGB")
        out.save(spot.out_path(g))


for beat in spot.data.get("beats", []):
    if beat["at"][1] < lo or beat["at"][0] > hi:
        continue
    render(beat)
    a, z = beat["at"]
    print(f"{a:4d}-{z:4d} {beat.get('kind', 'full'):5} {beat.get('src', '')}")
