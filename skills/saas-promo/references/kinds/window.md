# `window`

An app window built up on the backdrop, out of the `title`'s pill. Your product's screen goes in as layered
PNGs (render an HTML mock-up with `tools/screens/render.py`, one PNG per layer, all the same size).

**Beats** (reference timing at 25 fps, from the scene start, coming out of a `title`):

| time | what happens |
|---|---|
| 0.00-0.40 s | The pill keeps rising and turns from frosted to cool glass to lilac/blue glass; a glass sheet the size of the window sweeps in from the left behind it; the title's outlined glass line lifts to the top (`backtitle`); the halftone ring's tail fades at the edges. |
| 0.14-0.22 s | The sheet goes solid (the `tint` colours). |
| 0.22 s → | The page appears and your `layers` come up on their own times while the tint fades off (0.24-0.52 s); the pill shrinks into the window's prompt box (0.20-0.52 s) and shows `prompt_layer`. |
| 0.76-1.56 s | Settled, drifting slowly (the window narrows a few px). **This hold stretches with `dur`.** |
| last 0.56 s | The window rises and shrinks, then everything defocuses over the last 0.16 s. |

Without `from_pill` the scene starts on the glass sheet sweeping in (no pill, no ring, no back title).

| param | default | |
|---|---|---|
| `layers` | `[]` | Array of `{ image, at, fade, rise, cols, wipe }`, drawn in order on the page. `at` (s from the scene start), `fade` (s), `rise` (px it slides up). `cols = { n, x, w, y, h, step }` reveals the layer column by column (icon rows). `wipe = { x, y, w, h, from, dur }` grows a clip from `from` to `w` px wide. |
| `base` | — | An image drawn under every layer (otherwise a `page`-coloured rect). |
| `page` | `"#efecf3"` | Page background behind the layers. |
| `window_size` | `[994, 602]` | Window frame size in window px. |
| `layer_size` | `[994, 585]` | Size the layer PNGs are drawn at (the PNGs are usually 2x this). |
| `prompt_rect` | `[354, 325, 826, 433]` | Box inside the window (x0, y0, x1, y1 window px) the pill becomes. |
| `prompt_layer` | — | Image drawn inside the pill as it locks in (e.g. the prompt box layer). Without it the pill becomes a plain panel with an accent dot. |
| `backtitle` | — | Words of the title line kept behind the window as outlined glass, or a table `{ words, size, x, y, ... }` with the `title` params. Match the `title` scene. |
| `from_pill` | `true` | Continue from a `title` with `pill = true`. |
| `halftone` | `true` | Draw the tail of the title's halftone ring. |
| `window_scale`, `window_y` | `1.0`, `0` | Scale about the frame centre and vertical offset. |
| `sheet`, `cool`, `tint` | from the palette | Glass sheet (3 hex, lilac → blue), the pill's cool pass (3 hex), the solid tint (2 hex). |
| `soften` | `0.45` | Blur (px) on the page, like the reference video's softness. |
| `exit_blur` | `1.0` | Multiplier on the final defocus. |
| `bg` | `"window"` | Backdrop preset(s). |

```toml
[[scene]]
kind = "window"
dur = 2.12
bg = "window"
backtitle = ["Calling", "all", "builders"]
prompt_layer = "window_prompt.png"
layers = [
  { image = "window_hero.png", at = 0.32, fade = 0.2 },
  { image = "window_side.png", at = 0.22, fade = 0.06 },
  { image = "window_h1.png", at = 0.46, fade = 0.06, rise = 7 },
  { image = "window_icons.png", at = 0.568, fade = 0.072, rise = 8, cols = { n = 4, x = 482, w = 54, y = 440, h = 90, step = 0.044 } },
]
```
