# `caption`

One to three lines of glass words on the backdrop. Each word arrives as frosted glass
(blurred, see-through, a bright rim), rises a little into place and settles into solid type.
`[bracketed]` runs sit in a translucent box that pops in bright from its centre and settles
into the palette's `highlight` tint. The whole group rides a camera move.

```toml
[[scene]]
kind = "caption"
dur = 1.84
bg = "turn"
move = "push"
lines = ["Turn your [idea]", "into [a product]"]
```

## Markup

- `lines`: 1-3 strings. `[...]` marks one highlight run, which gets one box and can span
  several words: `"into [a product]"`. A closing bracket may carry punctuation:
  `"Your [backlog], cleared"`.
- One line or three lines are centred on the same middle as two (unless `y` is set).

## Moves

A move is a whole measured treatment: camera, word look, rise, layout and exit. Each one
comes from one reference shot. Timings are seconds on the entry clock (`tm.e()`), and exits
on the exit clock (`tm.x()`), so a longer `dur` only lengthens the hold.

| move | feel | camera | exit |
|---|---|---|---|
| `settle` (default) | big, tilted (yaw 12°) and drifting, settles flat over 1.1 s | scale 1.26 → 1, dy 20 → 0 | drifts up 36 px over the last 0.2 s |
| `push` | starts small and pushes in, snappy | scale 0.85 → 1 by 0.9 s | shrinks to 0.9 and drifts up 42 px over the last 0.5 s |
| `drop` | huge drop-in, two-stage settle | scale 1.52 → 1.15 → 1 by 1.2 s | grows to 1.06 and blurs out (14 px) over the last 0.1 s |
| `glide` | gentle, soft blurred arrivals | scale 1.15 → 1 by 1.0 s | shrinks to 0.74 and blurs out (16 px) over the last 0.1 s |
| `lift` | a fast pull back from very close, one line | scale 1.48 → 1, dy 85 → 0 by 0.6 s | shrinks to 0.84 and blurs out (14 px) over the last 0.13 s |

## Params

| key | default (from the move) | what |
|---|---|---|
| `move` | `"settle"` | treatment, see above |
| `exit` | `"move"` | `"move"` (the move's own), `"drift"` (settle's drift up), `"blur"` (glide's blur out), `"cut"` |
| `size` | 81.4 / 97.2 / 83 / 82.5 / 80 | layout size, px in the 1280x720 design space; `gap`, `pad` and `leading` scale with it |
| `weight` | `[look] weight` | weight the layout is measured at |
| `ink_weight` | `weight` | weight the glyphs are drawn at (300 matches the reference's thin strokes; the font must have it) |
| `glyph_scale` | 0.96 / 0.93 / 0.90 / 0.96 / 1.0 | glyphs are drawn this much smaller than the layout size and tracked out so each word keeps its advance |
| `gap` | 25 / 33 / 29 / 30 / 19 | px between words |
| `pad` | 16 / 19 / 17 / 13 / 15 | box padding left and right |
| `leading` | 105.5 / 130.5 / 113 / 91.5 / 104 | px between baselines |
| `y`, `x` | 325 / 325.5 / 332 / 348 / 207.5; 640 | first baseline, centre x |
| `box_top`, `box_bot` | about 1.0, 0.3 | box top/bottom in em from the baseline |
| `start`, `stagger`, `line_wait` | about -0.02, 0.07-0.08, 0 | first word, gap between words, extra wait at a new line (s) |
| `run_wait` | 0 | extra wait before a highlight run |
| `at` | from the stagger | seconds per word (overrides the stagger, one entry per word in order) |
| `box_at` | first word of the run | seconds per highlight run |
| `gaps` | | `[[word index, px], ...]`: the gap before that word |
| `ls` | | `[[word index, px], ...]`: letter spacing |
| `rise`, `rise_k` | per line | px below its place on arrival, and decay per second (one value or `[line1, line2+]`) |
| `blur`, `blur_dur` | per line | arrival blur px and seconds to sharpen |
| `glass_from`, `glass_dur` | | glass → solid: starts after arrival, lasts |
| `zoom`, `tilt` | 1, 1 | scale the camera's entry move and yaw (0 = none) |
| `cam` | true | `false` = a still camera |
| `glow` | `[look] glow` | halo strength (highlighted words get 1.7x) |

Colours come from the palette: `text`, `highlight` and `highlight_alpha` (the box), and
`flash` (the box's pop-in).

## Timing notes (measured, 25 fps reference)

- Words arrive 2 frames (0.08 s) apart in `push`/`drop`; `settle` is tighter (0.04-0.08 s).
  Words inside a highlight run arrive together.
- The box grows from 45 % to full width over about 0.1 s, flashing bright for about 0.14 s.
- A word's blur clears in 0.12-0.4 s, and glass turns solid about 0.24 s after it lands.
- The `settle` exit has no fade: the group drifts into the hard cut, and so does `push`'s.
