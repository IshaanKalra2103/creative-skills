# `wall`: a card wall with a centre card, a button and a click

A wall of cards (project thumbnails, screenshots) floats over the backdrop with a shallow depth
of field. The centre card drops in from the top, the side cards slide into a 3x3 arrangement
around it, the camera settles, snaps in on the centre card and keeps pushing; the centre card
swaps through colour-band wipes (a word card -> a poster, or any images); a button pops in
under it, the cursor comes up and clicks it ("Submit" -> "Submitted" with a fill sweeping
across), the camera pulls back and everything defocuses into the cut.

```toml
[[scene]]
kind = "wall"
dur = 2.8
letterbox = true
cards = ["a.png", "b.png", "c.png", "d.png", "e.png", "f.png", "g.png", "h.png"]
center = [
  { word = "OFFGRID" },
  { poster = true, lines = ["MAKE", "SOME", "NOISE"], dates = ["APR 12", "APR 13", "APR 14"] },
]
button = ["Submit", "Submitted"]
```

| param | default | what |
|---|---|---|
| `cards` | `[]` | side card images (16:9, cropped to fill). Slots in order: mid-left, top-right (rises from mid-right), bottom-centre (slides from the left), bottom-right, top-left (from the left edge), top-centre (from the top), bottom-left (from the bottom), mid-right (from the right); cards 9+ fade in on an outer ring |
| `center` | one white card | the centre sequence (below) |
| `center_times` | `[0.794, +0.6 each]` | reveal time (entry s) of items 2, 3, ... |
| `wipe` | `["#ecd52c", "#1b33c9"]` | colour bands that wipe across before each reveal (0.08 s apart); the item itself rides in on the last band |
| `button` | `["Submit", "Submitted"]` | labels before / after the click |
| `no_button` | `false` | no button, no cursor |
| `bloom` | `true` | the palette-tinted glow behind the wall |
| `letterbox` | `false` | close the bars over the last 0.9 s (global); the cursor is drawn above them for the last 0.24 s |
| `bg`, `dots` | `"wide"` | backdrop |

Centre items:
- `{ image = "x.png" }`: a still card (326 x 184 at rest, cropped to fill).
- `{ word = "OFFGRID", bg = "#ebe6d9", ink = "#1c1c1c", font = "Anton", size = 49 }`: the letters spring up one
  by one (0.036 s apart, damped spring with a little overshoot and a roll) with a white halo; the word slides out
  right before the next band.
- `{ poster = true, lines = [3 words], nav = "...", dates = [3], color = "#e2232b", sky = "card_sky.jpg",
  paper = "card_paper.png" }`: a festival page that builds up over about 1.7 s: the three words (with a two-frame
  colour flicker), an original paper-cutout collage popping in piece by piece (arches with a sky cut-out, a torn
  shard, steps, stripes, a sun, a crumpled paper ball), the nav, a tag and a dates strip sliding up.

Colours: `palette.accent` (button fill), `palette.flash` (focus ring), `palette.highlight` (haze over
out-of-focus cards), `palette.bg` (bloom, corner falloff).

## Timing (measured, reference shot 492-561 at 25 fps)

| clock | when | what |
|---|---|---|
| entry | 0 - 0.6 s | centre card drops from the top (305 px), focus pull 7.5 -> 0.5 px blur, camera 1.15 -> 1.0 |
| entry | 0.26 - 0.96 s | side cards slide in (ease out, 0.28-0.44 s each, staggered) |
| entry | 1.04 - 1.68 s | camera snap: 1.03 -> 1.29 in 0.12 s, then creeps to 1.44; depth blur grows with distance from the centre |
| entry | reveal | bands wipe (edge crosses about 40 % of the card per 0.04 s), the next item rides in on the last |
| entry | last reveal + 0.31 s | button pops in (0.9 -> 1); focus ring at + 0.41 s |
| exit | 1.16 s left | cursor rises from below the button |
| exit | 0.97 - 0.86 s left | hover tint |
| exit | 0.86 - 0.8 s left | click: the button squashes to 0.78 width, label switches, fill sweeps (ease out to 0.3 s left), full by 0.24 s |
| exit | 0.84 s left -> cut | camera pulls back 1.44 -> 1.21; cursor drops away over the last 0.4 s |
| exit | last 0.18 s | everything defocuses (0 -> 7 px) |
