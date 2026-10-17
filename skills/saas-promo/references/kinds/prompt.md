# `prompt`: an AI prompt box that gets typed into and sent

A white blob sharpens into a frosted prompt box ("Let's build it..."), the camera snaps in on
the text corner, the prompt is typed with a caret while a lagging follow-cam keeps the caret in
frame, the camera pulls back to the whole box, a 3D cursor swings in edge-on and clicks the send
button (press, cyan flash, glow), and the scene blurs into the cut.

```toml
[[scene]]
kind = "prompt"
dur = 3.88
bg = ["prompt", "prompt2"]
text = "Build a cool sneaker store"
```

| param | default | what |
|---|---|---|
| `text` | `"Build a cool sneaker store"` | the typed prompt (one line; the type shrinks to fit the field, min 18 px) |
| `placeholder` | `"Let's build it..."` | grey text shown until the push lands (0.72 s) |
| `controls` | `["Standard", "Plan"]` | labels of the mode picker and the plan toggle |
| `size` | `30` | prompt type size (px, layer) |
| `type_at` | `1.04` | first key, entry seconds |
| `type_dur` | `0.824 * sqrt(n / 26)` | typing time (animation seconds); the measured cadence starts slow (3 frames per key) and runs to 2-3 keys a frame |
| `pan_x` | `690` | screen x the follow-cam wants the caret at |
| `zoom` | `2.25` | camera scale while typing |
| `click` | `true` | `false`: no cursor, no click |
| `bg`, `bg_zoom`, `dots` | `"prompt"` | backdrop (see spec.md) |

Colours: `palette.panel` (box), `palette.frost` (rim), `palette.ink` (typed text),
`palette.accent` (send button, caret), `palette.highlight` (the inner edge).

## Timing (measured, reference shot 272-368 at 25 fps)

| clock | when | what |
|---|---|---|
| entry | 0 - 0.28 s | blob sharpens: blur 17 -> 0, scale 0.65 -> 1 about the box centre |
| entry | 0.44 - 1.48 s | push in on the text corner: 1.0 -> 1.13 (0.68 s), snaps to 2.1 by 1.0 s, settles 2.25 |
| entry | 1.04 s + | typing (see `type_dur`); fresh characters fade from pale blue-grey to ink in 0.1 s |
| entry | type end + 0.28 s | caret blinks 0.24 s on / off |
| exit | 1.8 -> 0.96 s left | pull back to the whole box (s-curve, fastest about 1.1 s left), box re-centred |
| exit | 0.96 s left -> cut | slow zoom out 1.15 -> 0.86 |
| exit | 1.04 -> 0.8 s left | cursor swings in edge-on (squash 0.35 -> 1, roll 28 deg -> 0, blur 9 -> 0) from the lower right |
| exit | 0.68 s left | click: button press (r -10 %), cyan flash, glow ring growing 30 -> 62 px |
| exit | last 0.12 s | blur 0 -> 14 |

The pull-back never starts before the prompt is typed (+0.24 s), so a long prompt needs a scene of
about `type_at + type_dur + 2.1` s.
