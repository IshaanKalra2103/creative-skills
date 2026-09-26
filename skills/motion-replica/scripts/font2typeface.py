# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools"]
# ///
"""Turn a TTF/OTF (static or variable) into a three.js typeface script for TextGeometry.

    uv run font2typeface.py Rubik[wght].ttf assets/rubik-typeface.js --wght 900 --chars '$0123456789,.'

Writes  window.<VAR> = {...typeface json...}  (default VAR = RUBIK_TYPEFACE) so it loads
with a plain <script> tag from file://. Keep --chars to what you extrude: the file
stays tiny and TextGeometry only needs those glyphs.
Google Fonts TTFs live at https://github.com/google/fonts/tree/main/ofl/<family>.
"""
import argparse
import json
import pathlib

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


class ThreePen(BasePen):
    """Emit three.js typeface outline commands (m / l / q / b; quadratic = end point, then control)."""
    def __init__(self, gs):
        super().__init__(gs); self.o = []
    def _moveTo(self, p): self.o += ["m", *map(round, p)]
    def _lineTo(self, p): self.o += ["l", *map(round, p)]
    def _qCurveToOne(self, c, p): self.o += ["q", round(p[0]), round(p[1]), round(c[0]), round(c[1])]
    def _curveToOne(self, c1, c2, p): self.o += ["b", round(p[0]), round(p[1]), round(c1[0]), round(c1[1]), round(c2[0]), round(c2[1])]
    def _closePath(self): pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("font"); ap.add_argument("out")
    ap.add_argument("--chars", default="$0123456789,.")
    ap.add_argument("--wght", type=float, help="weight to instance a variable font at, e.g. 900")
    ap.add_argument("--var", default="RUBIK_TYPEFACE")
    a = ap.parse_args()

    f = TTFont(a.font)
    if "fvar" in f and a.wght:
        f = instantiateVariableFont(f, {"wght": a.wght})
    gs, cmap, hmtx, head, hhea = f.getGlyphSet(), f.getBestCmap(), f["hmtx"], f["head"], f["hhea"]
    glyphs = {}
    for ch in a.chars:
        name = cmap.get(ord(ch))
        if not name:
            print(f"skip {ch!r}: not in font"); continue
        pen = ThreePen(gs); gs[name].draw(pen)
        adv = hmtx[name][0]
        glyphs[ch] = {"ha": adv, "x_min": 0, "x_max": adv, "o": " ".join(map(str, pen.o))}
    family = f["name"].getDebugName(1) or pathlib.Path(a.font).stem
    data = {"glyphs": glyphs, "familyName": family, "ascender": hhea.ascent, "descender": hhea.descent,
            "underlinePosition": -100, "underlineThickness": 50, "resolution": head.unitsPerEm,
            "boundingBox": {"xMin": head.xMin, "yMin": head.yMin, "xMax": head.xMax, "yMax": head.yMax},
            "original_font_information": {"format": 0, "fontFamily": family},
            "cssFontWeight": str(int(a.wght or 400)), "cssFontStyle": "normal"}
    pathlib.Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(a.out).write_text(f"// {family} glyphs '{a.chars}' as a three.js typeface (check the font's licence)\n"
                                   f"window.{a.var}=" + json.dumps(data) + ";\n")
    print(f"wrote {a.out}: {len(glyphs)} glyphs, {head.unitsPerEm} units/em → window.{a.var}")


if __name__ == "__main__":
    main()
