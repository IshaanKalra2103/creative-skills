# `title`

One line of huge glowing words over the light end of the gradient: the opener.

**Beats** (reference timing at 25 fps, from the scene start):

| time | what happens |
|---|---|
| 0.00 s | The first word fills the frame, cut off on the right, sliding left with a hard white bloom. |
| 0.00-1.00 s | The camera pulls back (scale 3.2 → 1.0) while the other words arrive one by one from the right as cyan-tinted glass (crisp, 5 frames to settle to white). |
| 1.00-1.24 s | Settled: the line centred, glowing. **This hold stretches with `dur`.** |
| last 0.64 s | (`exit = "window"`) The camera pushes in again, the words turn into outlined glass (bright edge, dark tube line, faint body; even words first, odd words 0.3 s later), the arrow halftone ring sweeps out from the centre, a frosted pill rises from the bottom and the line starts lifting toward the top. A `window` scene picks all of it up seamlessly. |
| last 0.24 s | (`exit = "blur"`) The settled line blurs and fades away instead. |

The entrance plays at its own speed from the start and the exit at its own speed up to the cut; only the
settled hold changes length (`title::vframe`). A scene shorter than about 1.7 s plays everything proportionally faster.

| param | default | |
|---|---|---|
| `words` | — | Array of words (or one string, split on spaces). 1-5 words read best. |
| `size` | `105.5` | Settled type size, px (design space 1280x720). |
| `weight` | `400` | Font weight (the display font from `[look] font`). |
| `tracking` | `0.0133` | Letter spacing, em. |
| `gap` | `0.306` | Gap between words, em. |
| `x`, `y` | `640`, `397` | Centre x and baseline of the settled line. |
| `at` | — | Arrival time (s) per word, overriding the stagger. |
| `second_at` | `0.504` | When the second word arrives (s). |
| `stagger` | `0.32` | Step between later words (s). |
| `glow` | `1.0` | Bloom strength multiplier. |
| `halftone` | `true` | The arrow-dot ring sweeping out at the end (`ring_x`, `ring_y` = its centre, default 660, 380). |
| `pill` | `true` | The frosted pill rising at the end (hands over to `window`). |
| `exit` | `"window"` with `pill`, else `"blur"` | `"window"` (push-in, glass turn, lift), `"blur"` (blur away), `"cut"` (hold to the cut). |
| `sheet`, `cool` | from the palette | The pill's glass colours: `sheet` = 3 hex (lilac → blue), `cool` = 3 hex (the cool pass). |
| `bg` | `"sky"` | Backdrop preset(s); the reference drifts `["sky", "dawn"]`. |

Colours: type = `[palette] text`, the entering tint leans to `bg_cyan`, the tube line to `bg_deep`, the halo to
`bg_glow`, the halftone arrows to `frost`.

```toml
[[scene]]
kind = "title"
dur = 1.88
bg = ["sky", "dawn"]
words = ["Calling", "all", "builders"]
```
