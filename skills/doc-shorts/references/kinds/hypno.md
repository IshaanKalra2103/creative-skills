## hypno

"…has an idea": a zoom-blur burst, a tiny spiral pouring a cone of light, the top of the head
as a stretched cone, an extreme close-up, then a cut-out collage head settles on hypnotic
concentric rings under a caption whose last words fade in. The rings are logarithmic (each
band 1.28× the last, as measured) and flow inward for as long as the shot lasts.

Make the head with `uv run tools/cutout.py photo.jpg assets/head.png --crop x,y,w,h --trim
--height 459`. Any transparent PNG works; it is drawn `face_h` ref px tall.

| param | type | default | meaning |
|---|---|---|---|
| `image` | string | — | transparent cut-out (head, helmet, object) |
| `face_h` | ref px | 459 | drawn height of the cut-out |
| `offset` | [dx, dy] | `[0, 0]` | shift the head |
| `field` | colour | `#951d18` | background and ring gaps |
| `rings` | colour | `#ddb521` | ring colour (also tints the spiral stage) |
| `stages` | [string] | `["burst", "spiral", "cone", "close"]` | one-tick lead-ins, in order, before the settle; `[]` starts on the rings |
| `burst` | [fill, a, b] | oranges | burst stage colours |
| `cone` | [6 colours] | pinks | gradient stops (4) and streaks (2) of the `cone` stage; match the top of your cut-out |
| `spiral_cone` | colour | `rings` | the spiral stage's cone |
| `caption` | string | — | e.g. "Larry has an Idea" |
| `caption_lead` | int | 2 | words shown from the start; the rest fade in one by one (the last slowly) |
| `caption_x` | ref px | centred | left x of the caption (before its 1.15× widen) |
| `caption_y`, `caption_size`, `caption_color` | | 416, 54, `#f1ede6` | |

```toml
[[shot]]
cue = "idea"
kind = "hypno"
image = "hypno_helmet.png"
field = "#123a6b"
rings = "#e8e2d0"
cone = ["#c9c9c9", "#f2f2f2", "#dcdcdc", "#a8a8a8", "#ffffff", "#8a8a8a"]
caption = "Neil has a better plan"
```

Timing: lead-ins are one tick each (0.4 s for all four), and the head settles over the next
1.1 s with a slight wobble. 1.5 s total reads like the reel; longer shots keep the rings
flowing with the head held.
