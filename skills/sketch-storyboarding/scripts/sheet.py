# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=10.1"]
# ///
"""Letter and assemble a storyboard sheet from board.json, or print its image prompts.

    uv run sheet.py board.json                  # -> board.png beside it
    uv run sheet.py board.json --out v2.png --columns 4
    uv run sheet.py board.json --prompts        # per-panel + one-shot sheet prompts, with lengths

Panels without an image draw as empty hand-ruled frames, so the shot plan can be
printed and approved before anything is generated. Labels are set in code (never
by the image model) so numbers, shot sizes and notes are always exact. "mode": "pairs"
lays each row out as CURRENT / PROBLEM next to REDIRECTED / PROPOSED.

board.json (paths are relative to it):
{
  "title": "Trailer v2",                        optional heading
  "columns": 3, "aspect": "16:9",               defaults
  "mode": "board" | "pairs",
  "style": "...", "cast": {"HERO": "..."},      used by --prompts
  "panels": [
    {"n": 1, "shot": "EST", "move": "SLOW PUSH", "action": "CITY SKYLINE AT DUSK",
     "note": "establish the world", "dur": "2.5s", "cut": "cut on leap",
     "draw": "what the image model should draw", "cast": ["HERO"],
     "image": "panels/01.png", "focus": 0.5,
     "before": "shots/frames/07.jpg", "problem": "...", "fix": "..."}   pairs mode
  ]
}
"""
import argparse
import json
import pathlib
import random
import sys

from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = pathlib.Path(__file__).resolve().parent
FONT = HERE.parent / "fonts" / "ArchitectsDaughter-Regular.ttf"
PAPER, GRAPHITE, SOFT = (244, 241, 234), (38, 36, 34), (92, 88, 84)
FRAME_W, GUTTER, MARGIN = 640, 48, 64
PROMPT_MAX = 600  # Meshy's text limit; other tools allow more, but short prompts also draw cleaner

STYLE = ("Rough hand-drawn storyboard frame, graphite and ink on warm off-white paper, loose construction "
         "lines, cross-hatched shadows, monochrome grayscale, simple readable figures.")
FRAME_RULES = "One wide 16:9 cinematic frame filling the image, action in the middle band, no border, no text."


def font(size):
    return ImageFont.truetype(str(FONT), size)


def wobbly_rect(d, box, seed, width=3):
    """A hand-ruled frame: each edge a slightly bowed stroke, corners overshooting like the reference."""
    rnd = random.Random(seed)
    x0, y0, x1, y1 = box
    for pass_, w in ((0, width), (1, max(1, width - 2))):
        j = 1.2 + pass_ * 1.4
        o = lambda: rnd.uniform(4, 11)  # corner overshoot
        edges = [((x0 - o(), y0), (x1 + o(), y0)), ((x1, y0 - o()), (x1, y1 + o())),
                 ((x1 + o(), y1), (x0 - o(), y1)), ((x0, y1 + o()), (x0, y0 - o()))]
        for (ax, ay), (bx, by) in edges:
            pts, n = [], 8
            bow = rnd.uniform(-2.2, 2.2)
            for i in range(n + 1):
                t = i / n
                px, py = ax + (bx - ax) * t, ay + (by - ay) * t
                off = bow * 4 * t * (1 - t) + rnd.uniform(-j, j) * 0.5
                if ax == bx or abs(ax - bx) < 1:  # vertical edge: offset in x
                    px += off
                else:
                    py += off
                pts.append((px, py))
            d.line(pts, fill=GRAPHITE, width=w, joint="curve")


def fit_text(d, text, size, max_w, min_size=16):
    while size > min_size and d.textlength(text, font=font(size)) > max_w:
        size -= 1
    f = font(size)
    while d.textlength(text, font=f) > max_w and len(text) > 4:
        text = text[:-2].rstrip() + "…"
    return text, f


def cover(img, w, h, focus=0.5):
    img = ImageOps.exif_transpose(img).convert("RGB")
    s = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    left = (img.width - w) // 2
    top = round((img.height - h) * min(1, max(0, focus)))
    return img.crop((left, top, left + w, top + h))


def label_lines(p, pairs_side=None):
    head = " / ".join(x for x in (p.get("shot"), p.get("move")) if x)
    first = f"{p['n']:02d}" + (f" — {head}" if head else "") + (f" — {p['action']}" if p.get("action") else "")
    if pairs_side == "before":
        return [f"{p['n']:02d} — CURRENT", p.get("problem", "")]
    lines = [first.upper()]
    if p.get("note"):
        lines.append(f"— {p['note']} —")
    tail = " · ".join(x for x in (p.get("dur"), p.get("cut")) if x)
    if pairs_side == "after" and p.get("fix"):
        tail = " · ".join(x for x in (p["fix"], tail) if x)
    if tail:
        lines.append(tail)
    return lines


def draw_frame(sheet, d, root, img_path, box, seed, focus=0.5, gray=False):
    x0, y0, x1, y1 = box
    if img_path and (root / img_path).exists():
        im = cover(Image.open(root / img_path), x1 - x0, y1 - y0, focus)
        if gray:
            im = ImageOps.grayscale(im).convert("RGB")
        sheet.paste(im, (x0, y0))
    elif img_path:
        print(f"  missing image: {img_path}", file=sys.stderr)
    wobbly_rect(d, box, seed)


def render(board, root, out, columns=None):
    pairs = board.get("mode") == "pairs"
    cols = 2 if pairs else (columns or board.get("columns", 3))
    aw, ah = map(float, board.get("aspect", "16:9").split(":"))
    fh = round(FRAME_W * ah / aw)
    panels = board["panels"]
    cells = [(p, side) for p in panels for side in (("before", "after") if pairs else (None,))]
    rows = -(-len(cells) // cols)
    label_h = 118
    head_h = 96 if board.get("title") else 0
    col_head = 46 if pairs else 0
    W = MARGIN * 2 + cols * FRAME_W + (cols - 1) * GUTTER
    H = MARGIN * 2 + head_h + col_head + rows * (fh + label_h) + (rows - 1) * (GUTTER // 2)

    sheet = Image.new("RGB", (W, H), PAPER)
    grain = Image.effect_noise((W, H), 18).convert("RGB")
    sheet = Image.blend(sheet, grain, 0.035)
    d = ImageDraw.Draw(sheet)

    y = MARGIN
    if board.get("title"):
        d.text((MARGIN, y), board["title"].upper(), font=font(46), fill=GRAPHITE)
        y += head_h
    if pairs:
        for c, t in enumerate(("CURRENT / PROBLEM", "REDIRECTED / PROPOSED")):
            d.text((MARGIN + c * (FRAME_W + GUTTER), y), t, font=font(30), fill=SOFT)
        y += col_head

    for i, (p, side) in enumerate(cells):
        cx = MARGIN + (i % cols) * (FRAME_W + GUTTER)
        cy = y + (i // cols) * (fh + label_h + GUTTER // 2)
        img = p.get("before") if side == "before" else p.get("image")
        draw_frame(sheet, d, root, img, (cx, cy, cx + FRAME_W, cy + fh), seed=p["n"] * 7 + (side == "after"),
                   focus=p.get("focus", 0.5), gray=side == "before")
        ly = cy + fh + 12
        for k, line in enumerate(label_lines(p, side)):
            if not line:
                continue
            text, f = fit_text(d, line, 28 if k == 0 else 23, FRAME_W - 8)
            tw = d.textlength(text, font=f)
            lx = cx + 4 if k == 0 else cx + (FRAME_W - tw) / 2
            d.text((lx, ly), text, font=f, fill=GRAPHITE if k == 0 else SOFT)
            ly += 36 if k == 0 else 32
    sheet.save(out)
    print(out)


def prompts(board):
    style = board.get("style", STYLE)
    cast = board.get("cast", {})
    out, bad = {"panels": {}}, 0
    for p in board["panels"]:
        who = " ".join(f"{k}: {cast[k]}." for k in p.get("cast", []) if k in cast)
        cam = " ".join(x for x in (p.get("shot"), p.get("move")) if x)
        text = " ".join(x for x in (style, who, f"Camera: {cam}." if cam else "", p.get("draw") or p.get("action", ""),
                                    FRAME_RULES) if x)
        out["panels"][p["n"]] = text
        flag = "" if len(text) <= PROMPT_MAX else f"  <-- over {PROMPT_MAX}, shorten draw/cast/style"
        bad += bool(flag)
        print(f"[{p['n']:02d}] {len(text)} chars{flag}\n{text}\n")
    n = len(board["panels"])
    cols = board.get("columns", 3)
    shots = "; ".join(f"{p['n']} {p.get('shot', '')} {p.get('action', '')}".strip() for p in board["panels"])
    sheet = (f"Storyboard sheet in exactly this reference's style: {n} panels, {cols} columns x {-(-n // cols)} rows, "
             f"16:9 frames, a short hand-lettered caption under each. Same hero silhouette in every panel. "
             f"Panels: {shots}.").replace("  ", " ")
    out["sheet"] = sheet
    flag = "" if len(sheet) <= PROMPT_MAX else f"  <-- over {PROMPT_MAX}: shorten actions or split the sheet"
    bad += bool(flag)
    print(f"[sheet] {len(sheet)} chars{flag}\n{sheet}")
    return out, bad


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("board")
    ap.add_argument("--out")
    ap.add_argument("--columns", type=int)
    ap.add_argument("--prompts", action="store_true", help="print prompts and write prompts.json instead of drawing")
    a = ap.parse_args()
    path = pathlib.Path(a.board)
    board = json.loads(path.read_text())
    if a.prompts:
        out, bad = prompts(board)
        (path.parent / "prompts.json").write_text(json.dumps(out, indent=1))
        sys.exit(1 if bad else 0)
    render(board, path.parent, pathlib.Path(a.out) if a.out else path.with_suffix(".png"), a.columns)


if __name__ == "__main__":
    main()
