# `end`

The end card: the logo writes on, a glass tagline and a call-to-action pill arrive under it, then it all
clears to the logo alone, centred and growing.

**Beats** (reference timing at 25 fps, from the scene start):

| time | what happens |
|---|---|
| -0.02-0.22 s | The logo writes on letter by letter (each SVG `<path>`, left to right, 0.034 s apart), each letter out of a 7 px blur, while the logo rises (352 → 193 px top). |
| 0.62-0.78 s | The tagline arrives word by word (0.078 s apart) as persistent glass, rising 14 px into place. |
| 0.85 s | The pill pops in with the `flash` colour and settles into `frost`. |
| 1.12-2.32 s | Settled. **This hold stretches with `dur`.** |
| last 2.88-2.12 s | The group sinks slowly. |
| last 2.16-2.00 s | The tagline and pill blur away and fade; the logo drops to the centre with a motion blur. |
| last 1.20-0.16 s | The logo grows about its centre (1.58x), then holds to the cut. |

Without `tagline` and `pill` the logo writes on at the centre and only grows.

| param | default | |
|---|---|---|
| `logo` | — | An SVG in `assets/`. Its `viewBox` and every `<path d>` are read at runtime (fill comes from `[palette] text`); paths write on in order of their first point's x. |
| `logo_text` | `"logo"` | Without `logo`: a word mark set in the display font, heavy italic, written on per character. `logo_weight` (800). |
| `logo_h` | `66.5` | Logo height, px. |
| `letter_step` | `0.0343` | Seconds between letters. |
| `grow` | `1.58` | Final scale (1 = no grow). |
| `tagline` | — | The line under the logo (glass type). |
| `tagline_size`, `tagline_weight` | `82.5`, `500` | |
| `tagline_at`, `tagline_stagger` | `0.616`, `0.078` | When it arrives, step between words (s). |
| `tagline_glass` | `1.0` | 1 = clear glass, 0 = solid. |
| `tagline_gap` | `16` | Gap between words (px). |
| `tagline_dy` | `105.5` | Logo bottom to the tagline baseline (px). |
| `pill` | — | Call-to-action text. `pill_size` (29), `pill_pad` (37), `pill_at` (0.848 s), `pill_alpha` (0.30), `pill_dy` (152 px from the tagline baseline). |
| `x` | `640` | Centre x. |
| `bg` | `"end"` | Backdrop preset(s); the reference drifts `["logo", "end", "end2"]`. |

The letterbox that opens under the logo comes from `letterbox = true` on the scene before.

```toml
[[scene]]
kind = "end"
dur = 5.2
bg = ["logo", "end", "end2"]
dots = 0.0
logo = "logo.svg"
tagline = "Good luck, builders!"
pill = "Submit by Oct 20"
```
