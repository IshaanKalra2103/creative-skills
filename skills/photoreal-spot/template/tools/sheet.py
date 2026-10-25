# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow"]
# ///
"""Contact sheet of numbered frames from a video or a frame folder, each tile labelled with its
frame number. Use it after every step: stills, raw clips (morphing), plates, snaps, the cut.
FRAMES: '254-327' (every frame), '0-460/10' (every 10th), or '6,13,20,38'.
usage: uv run tools/sheet.py VIDEO_OR_DIR FRAMES OUT.jpg [--cols 8] [--width 240]
"""
import os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
opts = {"--cols": 8, "--width": 240}
for k in list(opts):
    if k in args:
        i = args.index(k)
        opts[k] = int(args[i + 1])
        del args[i:i + 2]
src, spec, out = args


def parse(spec):
    if "," in spec or spec.isdigit():
        return [int(x) for x in spec.split(",")]
    rng, _, every = spec.partition("/")
    a, b = map(int, rng.split("-"))
    return list(range(a, b + 1, int(every or 1)))


frames = parse(spec)
tiles = []
if os.path.isdir(src):
    files = sorted(f for f in os.listdir(src) if f.lower().endswith((".png", ".jpg", ".jpeg")))
    tiles = [Image.open(os.path.join(src, files[min(n, len(files) - 1)])).convert("RGB") for n in frames]
else:
    tmp = tempfile.mkdtemp()
    sel = "+".join(f"eq(n\\,{n})" for n in frames)
    subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", f"select='{sel}'", "-fps_mode", "passthrough",
                    os.path.join(tmp, "%05d.png")], check=True)
    tiles = [Image.open(os.path.join(tmp, f)).convert("RGB") for f in sorted(os.listdir(tmp))]
tw = opts["--width"]
th = round(tw * tiles[0].height / tiles[0].width)
cols = min(opts["--cols"], len(tiles))
rows = -(-len(tiles) // cols)
sheet = Image.new("RGB", (cols * (tw + 4) + 4, rows * (th + 4) + 4), (34, 34, 34))
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default(size=max(12, tw // 14))
for i, (n, im) in enumerate(zip(frames, tiles)):
    x, y = 4 + (i % cols) * (tw + 4), 4 + (i // cols) * (th + 4)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y))
    draw.text((x + 6, y + 4), str(n), fill="white", font=font, stroke_width=2, stroke_fill="black")
sheet.save(out, quality=90)
print(f"{out}: {len(tiles)} frames")
