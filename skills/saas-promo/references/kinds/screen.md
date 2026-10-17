# `screen`: an app window with scrolling content

An app window (a chrome image: an editor, a dashboard, a browser) swings in out of a blur with
perspective, its layers stream in line by line or fade in, the camera pushes in while the
content image scrolls inside a viewport (down, a short hold, back up), then pulls back and blurs
into the cut. An optional sprite flipbook rides on the content (a product turning in a hero).

```toml
[[scene]]
kind = "screen"
dur = 3.24
chrome = "screen_editor_chrome.png"
size = [1128, 676]
viewport = [335, 40, 780, 630]
content = "screen_site.png"
content_h = 1255
scroll = { to = 625, down_at = 0.72, back_at = 1.32 }
```

| param | default | what |
|---|---|---|
| `chrome` | `""` | window image, drawn at `size` |
| `size` | chrome aspect at 1128 wide | window size in layer px; the camera frames any size like the reference's 1128 x 676 |
| `zoom` | `1.0` | extra camera scale |
| `viewport` | the whole window | `[x, y, w, h]` (window px) where the content shows |
| `content` | `""` | the (tall) page image, drawn at the viewport width |
| `content_h` | from the image aspect | page height in px at the viewport width |
| `content_bg` | `"#ffffff"` | fill under the page |
| `content_fade` | `[[0, 0.25], [0.16, 0.55], [0.32, 1]]` | page opacity keys (entry s) |
| `content_layers` | `[]` | more page images over it: `{ image, at = 0, fade = 0.2 }` |
| `scroll` | `{ to = 60 % of the overflow, down_at = 0.72, back_at = 1.32 }` | down on the entry clock (measured ease, 1.08 s), back up starting `back_at` s before the cut (1.32 s) |
| `scroll_keys` | — | explicit `[[t, y], ...]` (entry s, page px), smoothed; overrides `scroll` |
| `layers` | `[]` | window overlays: `{ image, at, fade }` fade in, or `{ image, stream = [[x, y, w, h, at, dur], ...] }` revealed line by line with a feathered left-to-right wipe (window px, seconds) |
| `sprite` | — | `{ frames = [[t, image, cx, cy, h, rot(, rot_from)], ...], float = 3, shadow = [cx, cy, rx, ry], shadow_color, shadow_alpha = 0.22, dissolve = [t0, t1] }` in page px: a flipbook that scrolls with the page; `dissolve` eats a pale copy of the first frame away in 22 px cells |
| `bg`, `dots` | `"prompt2"` | backdrop |

The frosted rim and halo around the window use `palette.frost`.

## Timing (measured, reference shot 369-449 at 25 fps)

| clock | when | what |
|---|---|---|
| entry | 0 - 0.32 s | swing in: yaw 26 -> 0 deg, pitch -10 -> 0, roll -3 -> 0, scale 0.95 -> 0.725; blur 14 -> 0 by 0.24 s |
| entry | 0.48 - 2.24 s | push 0.725 -> 1.013 (fast 0.68-1.04 s, then slow) |
| entry | `down_at` + 1.08 s | scroll down (slow start, fastest about 0.3 s in, long ease out) |
| exit | `back_at` s left | scroll back up (fastest about 0.3 s in, long tail) |
| exit | 0.76 s left -> cut | pull back 1.013 -> 0.87 |
| exit | last 0.08 s | blur 0 -> 10 |
