## frame_card

A framed photo on a flat field. It slides in from the right, settles near the centre and then
grows toward the camera, with a big name caption near its bottom edge (the reel's
"Nightmare" card). The card's aspect is the image's; the motion is the reel's measured
centre/height curve, stretched over the shot.

| param | type | default | meaning |
|---|---|---|---|
| `image` / `frames` | string / [string] | — | the picture (or one per tick, e.g. a video's frames) |
| `bg` | colour | `#dedede` | field |
| `height` | ref px | 378 | card height while sliding (it grows to 1.28× at the end) |
| `at` | [x, y] | `[362, 638]` | card centre at the end |
| `border` | ref px | 2.5 | frame stroke (0 if the plates already include one) |
| `border_color` | colour | `#26231f` | frame colour |
| `caption` | string | — | big name caption, centred on the card |
| `caption_size` | ref px | 62 | at the sliding height; scales with the card |
| `caption_y` | 0..1 | 0.934 | baseline as a fraction of card height |
| `caption_color` | colour | `#ebe7df` | |
| `keys` | [[t, cx, cy, h], ...] | — | exact card centre and height per time |

```toml
[[shot]]
cue = "Houston"
kind = "frame_card"
image = "mission_control.jpg"
caption = "Houston"
```

Timing: designed around 0.9 s (9 ticks): slide in for 5 ticks, then grow for 4. Longer shots
stretch both phases.
