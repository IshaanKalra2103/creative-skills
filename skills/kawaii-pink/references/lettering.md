# Bubble lettering

`template/src/glyphs.rs`: A-Z, space and `!`, designed for this look.

## Model

- Design space: baseline y=0, cap height ~185, up is -y, x from 0 to the glyph's `width`.
- A glyph is a list of strokes (Catmull-Rom through a few control points), each with a width
  `w` and a `seam` flag. Stroke order is the draw-on order (the pen goes there first).
- Rendering per letter: for each part, ink strokes at `w + 2*LINE`, then paper strokes at `w`.
  A part is a run of strokes up to the next `seam`. Strokes in a part merge into one bubble
  with no inner lines. A seam starts a new part drawn on top with its own outline.
- Letters are drawn left to right, each on top of the previous one, so neighbours overlap with
  a visible outline between them (`GAP` = 60 between skeletons; outer edges overlap ~50 px).
- `Word::build` adds a bounce per letter (baseline offset, scale), fits the word into 800x300
  around (540, 590) and tilts it -0.06 rad.

## Rules that keep fat letters readable

- **Slit test:** two strokes whose centrelines are `d` apart show a gap only if
  `d > (w1 + w2)/2 + 2*LINE`. With LINE=14 and w≈76, legs need ~105 px between centres.
- **Counters:** a ring of radius r and width w has a hole only if `r > w/2 + LINE + ~6`. The O
  is `ring(60, -86, 57, 63)` at w=68: a small but clear hole.
- **Small counters as pills:** where the real counter would close (A, B, D, P, R), merge the
  letter and add `hole(a, b, 8-12)`. That's a tiny seam stroke, drawn as an outlined pill.
  Bubble graffiti does the same.
- **Don't seam over a stem.** A seamed bowl or arm drawn over the stem cuts outline lines
  through it (B reads as 3, P as ?, E gets "=" marks). Use seams only where one part really
  crosses another (H's crossbar, K's leg, Q's tail, R's leg, X's second diagonal).
- **C and G:** open about 120° and put ball terminals (`ball()`, w+8) on the ends. Smaller
  openings close up.
- **M:** fat legs (84-86) with ball feet, a thinner V (62-64). The feet give it the bubble
  stance.
- **Width range:** stems 74-80, arms and crossbars 44-60, bowls 62-70, balls 80-100. Below ~70
  for stems the word reads as a rounded sans, not bubble letters.

## Adding a glyph

1. Add a match arm in `glyph()`: strokes in pen order, `width` = the skeleton's x extent.
2. `cargo run --release -- --word "XAX" frame 2.5s -o review/`: check it next to a known letter.
3. Run the slit and counter tests above; add a `hole()` if the counter closed.
4. `cargo test --release`: the alphabet test inspects every frame.

Digits and punctuation other than `!` aren't drawn yet; unknown characters are skipped.
