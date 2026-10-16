## chart

A matplotlib-style figure on a flat grey card: an optional node graph (translucent coloured
circles with letters, black arrows) beside a bar chart with a framed axes box, y ticks and
labels, all under a serif title. The figure zooms out about the frame centre over the first
second (1.66x to 1.0x, measured), and the title fades in on tick 3. Bars can wobble tick to tick
(`frames`, like a converging PageRank iteration) or grow in (`grow`). In the reference this is
"They build PageRank" (15.4 s). The global look shows almost no halftone and no vignette here.

| param | type | default | meaning |
|---|---|---|---|
| `title` | string | none | serif title above the figure. |
| `title_at` | int | 3 | tick the title fades in on (0.35 there, full a tick later). |
| `title_y`, `title_size`, `title_color` | | 406, 43, `#151515` | |
| `bars` | [{label, value, color}] | | one table per bar; colours default to matplotlib tab10. |
| `values`, `labels`, `colors` | arrays | | the same as parallel arrays (use either form). |
| `frames` | [[v, ...], ...] | none | per-tick bar values (row k on tick k, the last row holds). Overrides `values`. |
| `grow` | float | 0 | ticks for the bars to grow in from zero (ease-out); 0 = no grow. |
| `ylabel` | string | none | rotated axis label. |
| `ymax` | float | 1.04 x max value | top of the y axis. |
| `ystep` | float | nice step (~8 ticks) | y tick spacing; labels get the decimals it needs. |
| `nodes` | [{label, color, r, x, y}] | none | graph nodes. Without x/y they are laid out on a ring left of the chart; `r` defaults to 12. |
| `edges` | [[from, to], ...] | none | arrows, by node index (0-based) or label. |
| `axes` | [l, t, r, b] | right half with a graph, centred without | axes box in ref px at rest. |
| `bar_width` | float | 0.85 | bar width as a fraction of its slot (matplotlib layout, 5% margins). |
| `bar_layout` | [x0, pitch, width] | computed | explicit first-bar centre, pitch and width in ref px. |
| `bar_alpha`, `node_alpha` | float | 0.85, 0.74 | |
| `zoom` | bool | true | the measured zoom-out (and the blur on tick 0). |
| `bg`, `ink`, `text_color` | colour | `#d6d6d6`, `#1e1e1e`, `#262626` | card, arrows, axis text. |

```toml
[[shot]]
cue = "PageRank"
kind = "chart"
title = "Memory per mission"
ylabel = "KB"
grow = 3
bars = [{ label = "AGC", value = 4 }, { label = "C64", value = 64 }, { label = "PC", value = 640 }]
nodes = [{ label = "A" }, { label = "B" }, { label = "C" }]
edges = [["A", "B"], ["B", "C"], ["C", "A"]]
```

**Timing.** The zoom-out takes 12 ticks; the figure holds after that.
